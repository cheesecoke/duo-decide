import * as React from "react";
import { Platform } from "react-native";
import { act, render, waitFor } from "@testing-library/react-native";
import { SplashScreen, usePathname, useRouter } from "expo-router";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/config/supabase";
import { AuthProvider, useAuth } from "@/context/supabase-provider";

/**
 * A sign-up confirmation (or magic link, invite, email change) opened on the
 * web. A sign-up from the iPhone app redirects to https://duo-decide.com with
 * an implicit-flow fragment the PKCE web client refuses, so the provider sets
 * the session itself, as it does for a reset link on the reset page, and
 * holds the router on the "Email confirmed" screen.
 */

const SIGNUP_HASH =
	"#access_token=at.123&expires_in=3600&refresh_token=rt456&token_type=bearer&type=signup";
const MAGICLINK_HASH = "#access_token=at.9&refresh_token=rt9&type=magiclink";
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
const originalAppUrl = process.env.EXPO_PUBLIC_APP_URL;

beforeEach(() => {
	jest.clearAllMocks();
	(Platform as { OS: string }).OS = "web";
	(globalThis as any).history = { state: { k: 1 }, replaceState };
	jest.mocked(useRouter).mockReturnValue({
		push: jest.fn(),
		replace,
		back: jest.fn(),
		navigate: jest.fn(),
		canGoBack: jest.fn(() => true),
	} as unknown as ReturnType<typeof useRouter>);
	jest.mocked(usePathname).mockReturnValue("/");
	Object.assign(supabase.auth, {
		onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
		setSession: jest.fn(() => Promise.resolve({ data: { session: SESSION }, error: null })),
		signOut: jest.fn(() => Promise.resolve({ error: null })),
		signUp: jest.fn(() => Promise.resolve({ data: { session: null, user: null }, error: null })),
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
	if (originalAppUrl === undefined) delete process.env.EXPO_PUBLIC_APP_URL;
	else process.env.EXPO_PUBLIC_APP_URL = originalAppUrl;
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

describe("a sign-up confirmation link on the web", () => {
	it("sets the session from the hash and says the email is confirmed", async () => {
		await openAt(`https://duo-decide.com/${SIGNUP_HASH}`);

		await waitFor(() =>
			expect(supabase.auth.setSession).toHaveBeenCalledWith({
				access_token: "at.123",
				refresh_token: "rt456",
			}),
		);
		await waitFor(() => expect(auth.emailLink).toEqual({ status: "confirmed", type: "signup" }));
		// Not recovery: the reset flow is untouched.
		expect(auth.isPasswordRecovery).toBe(false);
	});

	it("clears the tokens out of the address bar", async () => {
		await openAt(`https://duo-decide.com/${SIGNUP_HASH}`);

		expect(replaceState).toHaveBeenCalledWith({ k: 1 }, "", "/");
	});

	it("goes to the Email confirmed screen, not Welcome", async () => {
		await openAt(`https://duo-decide.com/${SIGNUP_HASH}`);
		await act(async () => {});

		expect(replace).toHaveBeenCalledWith("/email-confirmed");
		expect(replace).not.toHaveBeenCalledWith("/welcome");
	});

	it("lets the router take over on Continue", async () => {
		jest.mocked(usePathname).mockReturnValue("/email-confirmed");
		await openAt(`https://duo-decide.com/${SIGNUP_HASH}`);
		await waitFor(() => expect(auth.emailLink?.status).toBe("confirmed"));
		expect(replace).not.toHaveBeenCalled();

		act(() => auth.dismissEmailLink());

		expect(auth.emailLink).toBeNull();
		// getSession said signed out here; in the browser the session from
		// setSession arrives through onAuthStateChange and the app opens.
		await waitFor(() => expect(replace).toHaveBeenCalledWith("/welcome"));
	});

	it("says so when Supabase refuses the tokens", async () => {
		jest.mocked(supabase.auth.setSession).mockResolvedValueOnce({
			data: { session: null, user: null },
			error: new Error("bad"),
		} as never);
		jest.spyOn(console, "error").mockImplementation(() => {});
		await openAt(`https://duo-decide.com/${SIGNUP_HASH}`);

		await waitFor(() =>
			expect(auth.emailLink).toEqual({
				status: "error",
				message:
					"This link is invalid or has already been used. If you already confirmed your email, you can sign in.",
			}),
		);
	});
});

describe("a magic link on the web", () => {
	it("is handled the same way", async () => {
		await openAt(`https://duo-decide.com/${MAGICLINK_HASH}`);

		await waitFor(() =>
			expect(supabase.auth.setSession).toHaveBeenCalledWith({
				access_token: "at.9",
				refresh_token: "rt9",
			}),
		);
		await waitFor(() => expect(auth.emailLink).toEqual({ status: "confirmed", type: "magiclink" }));
	});
});

describe("an expired confirmation link on the web", () => {
	it("turns the error into a message, sets no session, and shows it", async () => {
		await openAt(`https://duo-decide.com/${EXPIRED_HASH}`);
		await act(async () => {});

		expect(auth.emailLink).toEqual({
			status: "error",
			message:
				"This link has expired. If you were confirming a new account, sign up again with the same email to get a new link.",
		});
		expect(supabase.auth.setSession).not.toHaveBeenCalled();
		expect(replaceState).toHaveBeenCalledWith({ k: 1 }, "", "/");
		expect(replace).toHaveBeenCalledWith("/email-confirmed");
	});

	it("goes to Sign In when asked", async () => {
		jest.mocked(usePathname).mockReturnValue("/email-confirmed");
		await openAt(`https://duo-decide.com/${EXPIRED_HASH}`);

		act(() => auth.dismissEmailLink("/sign-in"));

		await waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in"));
		expect(replace).not.toHaveBeenCalledWith("/welcome");
	});
});

describe("what is left alone", () => {
	it("a recovery hash away from the reset page", async () => {
		await openAt("https://duo-decide.com/#access_token=a&refresh_token=r&type=recovery");

		expect(supabase.auth.setSession).not.toHaveBeenCalled();
		expect(auth.emailLink).toBeNull();
	});

	it("an error in the query string (Google sign-in's PKCE redirect)", async () => {
		await openAt("https://duo-decide.com/?error=access_denied&error_description=cancelled");

		expect(auth.emailLink).toBeNull();
		expect(replaceState).not.toHaveBeenCalled();
	});

	it("an identity-linking error", async () => {
		await openAt(
			"https://duo-decide.com/#error=server_error&error_code=identity_already_exists&error_description=x",
		);

		expect(auth.emailLink).toBeNull();
	});

	it("a sign-up hash on the reset page (the reset page's rules hold)", async () => {
		jest.mocked(usePathname).mockReturnValue("/reset-password");
		await openAt(`https://duo-decide.com/reset-password${SIGNUP_HASH}`);

		expect(supabase.auth.setSession).not.toHaveBeenCalled();
		expect(auth.emailLink).toBeNull();
	});

	it("a plain visit", async () => {
		await openAt("https://duo-decide.com/");
		await act(async () => {});

		expect(auth.emailLink).toBeNull();
		expect(replace).toHaveBeenCalledWith("/welcome");
	});

	it("native: no hash is read, whatever the location says", async () => {
		(Platform as { OS: string }).OS = "ios";
		await openAt(`https://duo-decide.com/${SIGNUP_HASH}`);
		await act(async () => {});

		expect(auth.emailLink).toBeNull();
	});
});

describe("signUp", () => {
	it("sends the confirmation link to the web app from the iPhone", async () => {
		(Platform as { OS: string }).OS = "ios";
		delete process.env.EXPO_PUBLIC_APP_URL;
		await openAt("https://duo-decide.com/");

		await act(() => auth.signUp("chase@example.com", "Aa1!aaaa"));

		expect(supabase.auth.signUp).toHaveBeenCalledWith({
			email: "chase@example.com",
			password: "Aa1!aaaa",
			options: { emailRedirectTo: "https://duo-decide.com" },
		});
	});

	it("sends it back to the origin on the web", async () => {
		await openAt("http://localhost:8081/sign-up");

		await act(() => auth.signUp("chase@example.com", "Aa1!aaaa"));

		expect(supabase.auth.signUp).toHaveBeenCalledWith(
			expect.objectContaining({ options: { emailRedirectTo: "http://localhost:8081" } }),
		);
	});
});
