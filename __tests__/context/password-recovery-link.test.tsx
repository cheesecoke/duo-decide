import * as React from "react";
import { Platform } from "react-native";
import { act, render, waitFor } from "@testing-library/react-native";
import { SplashScreen, usePathname, useRouter } from "expo-router";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/config/supabase";
import { AuthProvider, useAuth } from "@/context/supabase-provider";

/**
 * The web reset page, reached from a reset email requested in the native app.
 * The link is an implicit-flow one (`#access_token=…&type=recovery`), which
 * the web client's PKCE auto-detection refuses, so the provider sets the
 * session itself — and turns an error in the link into a message.
 */

const RECOVERY_HASH =
	"#access_token=at.123&expires_in=3600&refresh_token=rt456&token_type=bearer&type=recovery";
const EXPIRED_HASH =
	"#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired";

const SESSION = { user: { id: "u1", email: "chase@example.com" } } as Session;

const replace = jest.fn();
const replaceState = jest.fn();
let auth: ReturnType<typeof useAuth>;

function Grab() {
	auth = useAuth();
	return null;
}

const originalOS = Platform.OS;
const originalLocation = (globalThis as any).location;
const originalHistory = (globalThis as any).history;

beforeEach(() => {
	(Platform as { OS: string }).OS = "web";
	(globalThis as any).history = { state: { k: 1 }, replaceState };
	jest.mocked(useRouter).mockReturnValue({
		push: jest.fn(),
		replace,
		back: jest.fn(),
		navigate: jest.fn(),
		canGoBack: jest.fn(() => true),
	} as unknown as ReturnType<typeof useRouter>);
	jest.mocked(usePathname).mockReturnValue("/reset-password");
	Object.assign(supabase.auth, {
		onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
		setSession: jest.fn(() => Promise.resolve({ data: { session: SESSION }, error: null })),
		signOut: jest.fn(() => Promise.resolve({ error: null })),
	});
	jest.mocked(supabase.auth.getSession).mockResolvedValue({
		data: { session: null },
		error: null,
	} as never);
});

afterEach(() => {
	(Platform as { OS: string }).OS = originalOS;
	(globalThis as any).location = originalLocation;
	(globalThis as any).history = originalHistory;
});

async function openAt(href: string) {
	const url = new URL(href);
	(globalThis as any).location = { href, pathname: url.pathname, origin: url.origin };
	render(
		<AuthProvider>
			<Grab />
		</AuthProvider>,
	);
	await waitFor(() => expect(SplashScreen.hideAsync).toHaveBeenCalled());
}

describe("a recovery link on the web reset page", () => {
	it("sets the session from the hash and stays in recovery mode", async () => {
		await openAt(`https://duo-decide.com/reset-password${RECOVERY_HASH}`);

		await waitFor(() =>
			expect(supabase.auth.setSession).toHaveBeenCalledWith({
				access_token: "at.123",
				refresh_token: "rt456",
			}),
		);
		expect(auth.isPasswordRecovery).toBe(true);
		expect(auth.recoveryLinkError).toBeNull();
	});

	it("clears the tokens out of the address bar", async () => {
		await openAt(`https://duo-decide.com/reset-password${RECOVERY_HASH}`);

		expect(replaceState).toHaveBeenCalledWith({ k: 1 }, "", "/reset-password");
	});

	it("does not bounce off the page it is already on", async () => {
		await openAt(`https://duo-decide.com/reset-password${RECOVERY_HASH}`);
		await act(async () => {});

		expect(replace).not.toHaveBeenCalled();
	});

	it("says so when Supabase refuses the tokens", async () => {
		jest.mocked(supabase.auth.setSession).mockResolvedValueOnce({
			data: { session: null, user: null },
			error: new Error("bad"),
		} as never);
		jest.spyOn(console, "error").mockImplementation(() => {});
		await openAt(`https://duo-decide.com/reset-password${RECOVERY_HASH}`);

		await waitFor(() =>
			expect(auth.recoveryLinkError).toBe(
				"This reset link is invalid or has already been used. Request a new one.",
			),
		);
		expect(auth.isPasswordRecovery).toBe(true);
	});

	it("leaves a non-recovery hash to auth-js", async () => {
		await openAt("https://duo-decide.com/reset-password#access_token=a&refresh_token=r&type=signup");

		expect(supabase.auth.setSession).not.toHaveBeenCalled();
	});
});

describe("an expired link on the web reset page", () => {
	it("turns the error into a message, and sets no session", async () => {
		await openAt(`https://duo-decide.com/reset-password${EXPIRED_HASH}`);

		await waitFor(() =>
			expect(auth.recoveryLinkError).toBe("This reset link has expired. Request a new one."),
		);
		expect(supabase.auth.setSession).not.toHaveBeenCalled();
		expect(replaceState).toHaveBeenCalledWith({ k: 1 }, "", "/reset-password");
		// Recovery mode holds the page, so the error stays on screen.
		expect(auth.isPasswordRecovery).toBe(true);
		expect(replace).not.toHaveBeenCalled();
	});

	it("goes to Forgot Password when asked for a new link", async () => {
		await openAt(`https://duo-decide.com/reset-password${EXPIRED_HASH}`);

		act(() => auth.finishPasswordRecovery("/forgot-password"));

		await waitFor(() => expect(replace).toHaveBeenCalledWith("/forgot-password"));
		expect(replace).not.toHaveBeenCalledWith("/welcome");
		expect(auth.recoveryLinkError).toBeNull();
	});
});

describe("other pages", () => {
	it("ignores an auth hash away from the reset page", async () => {
		jest.mocked(usePathname).mockReturnValue("/");
		await openAt(`https://duo-decide.com/${RECOVERY_HASH}`);

		expect(supabase.auth.setSession).not.toHaveBeenCalled();
		expect(replaceState).not.toHaveBeenCalled();
	});
});

describe("updatePassword", () => {
	it("keeps recovery mode on, so the confirmation can show", async () => {
		Object.assign(supabase.auth, {
			updateUser: jest.fn(() => Promise.resolve({ data: {}, error: null })),
		});
		await openAt(`https://duo-decide.com/reset-password${RECOVERY_HASH}`);

		await act(() => auth.updatePassword("Aa1!aaaa"));

		expect(auth.isPasswordRecovery).toBe(true);
		act(() => auth.finishPasswordRecovery());
		expect(auth.isPasswordRecovery).toBe(false);
	});
});
