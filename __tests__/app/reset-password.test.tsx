import * as React from "react";
import { Platform } from "react-native";
import { act, fireEvent, screen, userEvent, within } from "@testing-library/react-native";
import type { Session } from "@supabase/supabase-js";

import { renderAuthScreen } from "@/test-utils/render-auth-screen";

/**
 * Choose a new password (FEATURE-INVENTORY §1.5), with `useAuth` mocked.
 *
 * The part worth guarding is the state table: three status blocks across the
 * four `(isPasswordRecovery, session)` combinations, and a submit button that
 * is disabled without a session.
 */

const mockAuth = {
	updatePassword: jest.fn(),
	deleteAccount: jest.fn(),
	signOut: jest.fn(),
	finishPasswordRecovery: jest.fn(),
	session: null as Session | null,
	isPasswordRecovery: false,
	recoveryLinkError: null as string | null,
};

jest.mock("@/context/supabase-provider", () => ({
	useAuth: () => mockAuth,
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ResetPassword = require("@/app/reset-password").default;

const SESSION = { user: { email: "chase@example.com" } } as Session;

const NO_SESSION_LINE =
	"Open this page from the link in your password reset email, or request a new one.";

function renderScreen() {
	return renderAuthScreen(<ResetPassword />);
}

async function fill(password = "Aa1!aaaa", confirmPassword = password) {
	await userEvent.type(screen.getByLabelText("New password"), password);
	await userEvent.type(screen.getByLabelText("Confirm new password"), confirmPassword);
	await userEvent.press(screen.getByLabelText("Update Password"));
	await act(async () => {});
}

beforeEach(() => {
	jest.clearAllMocks();
	jest.spyOn(console, "error").mockImplementation(() => {});
	mockAuth.updatePassword.mockResolvedValue(undefined);
	mockAuth.signOut.mockResolvedValue(undefined);
	mockAuth.session = SESSION;
	mockAuth.isPasswordRecovery = false;
	mockAuth.recoveryLinkError = null;
});

describe("the three status blocks", () => {
	/** §1.5's table, one row at a time — they are mutually exclusive. */
	it.each([
		[true, null, "verifying"],
		[true, SESSION, "none"],
		[false, null, "no-session"],
		[false, SESSION, "none"],
	] as const)(
		"isPasswordRecovery=%p session=%p shows %s",
		(isPasswordRecovery, session, expected) => {
			mockAuth.isPasswordRecovery = isPasswordRecovery;
			mockAuth.session = session;
			renderScreen();

			expect(screen.queryByTestId("reset-verifying") !== null).toBe(expected === "verifying");
			expect(screen.queryByText(NO_SESSION_LINE) !== null).toBe(expected === "no-session");
			// The submit failure is the third block, and nothing has failed yet.
			expect(screen.queryByText("Couldn't update password")).toBeNull();
		},
	);

	it("says it is verifying, in words", () => {
		mockAuth.isPasswordRecovery = true;
		mockAuth.session = null;
		renderScreen();

		expect(within(screen.getByTestId("reset-verifying")).getByText("Verifying your reset link…"));
	});

	it("titles the no-session card", () => {
		mockAuth.session = null;
		renderScreen();

		const card = screen.getByTestId("status-card-error");
		expect(within(card).getByText("No active reset session")).toBeTruthy();
		expect(within(card).getByText(NO_SESSION_LINE)).toBeTruthy();
	});
});

describe("the submit button", () => {
	it.each([
		[true, null, true],
		[true, SESSION, false],
		[false, null, true],
		[false, SESSION, false],
	] as const)(
		"isPasswordRecovery=%p session=%p → disabled=%p",
		(isPasswordRecovery, session, disabled) => {
			mockAuth.isPasswordRecovery = isPasswordRecovery;
			mockAuth.session = session;
			renderScreen();

			expect(screen.getByLabelText("Update Password").props.disabled).toBe(disabled);
		},
	);

	it("updates the password and confirms it, in place of the form", async () => {
		mockAuth.isPasswordRecovery = true;
		renderScreen();

		await fill();

		expect(mockAuth.updatePassword).toHaveBeenCalledWith("Aa1!aaaa");
		const card = screen.getByTestId("status-card-success");
		expect(within(card).getByText("Password updated")).toBeTruthy();
		expect(screen.queryByLabelText("New password")).toBeNull();
		// Nothing navigates on its own: the confirmation stays until it is dismissed.
		expect(mockAuth.finishPasswordRecovery).not.toHaveBeenCalled();
	});

	it("enforces the same rules sign-up does", async () => {
		renderScreen();

		await fill("alllower");

		expect(screen.getByText("Your password must have at least one uppercase letter.")).toBeTruthy();
		expect(mockAuth.updatePassword).not.toHaveBeenCalled();
	});
});

describe("a failed update", () => {
	it("shows the expired-link sentence, alongside nothing else", async () => {
		mockAuth.updatePassword.mockRejectedValue(new Error("Auth session missing!"));
		renderScreen();

		await fill();

		const card = screen.getByTestId("status-card-error");
		expect(within(card).getByText("Couldn't update password")).toBeTruthy();
		expect(
			within(card).getByText(
				"Your reset link has expired or is invalid. Please request a new password reset email.",
			),
		).toBeTruthy();
		// The other two blocks stay silent: there *is* a session.
		expect(screen.queryByTestId("reset-verifying")).toBeNull();
		expect(screen.queryByText(NO_SESSION_LINE)).toBeNull();
	});
});

describe("the escape hatch", () => {
	it("signs you out", async () => {
		renderScreen();

		await userEvent.press(screen.getByLabelText("Back to Sign In"));
		await act(async () => {});

		expect(mockAuth.signOut).toHaveBeenCalledTimes(1);
	});

	/** It is the only way out: §1.5 has no back button and no swipe. */
	it("is offered even with no session, when the form is not", () => {
		mockAuth.session = null;
		renderScreen();

		expect(screen.getByLabelText("Back to Sign In").props.disabled).toBeFalsy();
		expect(screen.getByLabelText("Update Password").props.disabled).toBe(true);
	});
});

describe("after the update", () => {
	const originalOS = Platform.OS;
	afterEach(() => {
		(Platform as { OS: string }).OS = originalOS;
	});

	it("tells a web visitor the new password works in the app", async () => {
		(Platform as { OS: string }).OS = "web";
		renderScreen();

		await fill();

		expect(screen.getByText("You can now sign in with it in the Duo app.")).toBeTruthy();
	});

	it("says something that makes sense inside the app", async () => {
		(Platform as { OS: string }).OS = "ios";
		renderScreen();

		await fill();

		expect(screen.getByText("Use it the next time you sign in.")).toBeTruthy();
	});

	it("continues into Duo by leaving recovery mode", async () => {
		renderScreen();
		await fill();

		await userEvent.press(screen.getByLabelText("Continue to Duo"));

		expect(mockAuth.finishPasswordRecovery).toHaveBeenCalledWith();
	});
});

describe("a link that came back with an error", () => {
	const EXPIRED = "This reset link has expired. Request a new one.";

	beforeEach(() => {
		mockAuth.isPasswordRecovery = true;
		mockAuth.session = null;
		mockAuth.recoveryLinkError = EXPIRED;
	});

	it("says the link expired, instead of verifying forever", () => {
		renderScreen();

		const card = screen.getByTestId("status-card-error");
		expect(within(card).getByText(EXPIRED)).toBeTruthy();
		expect(screen.queryByTestId("reset-verifying")).toBeNull();
		// The form could never succeed, so it is not offered.
		expect(screen.queryByLabelText("New password")).toBeNull();
		expect(screen.queryByLabelText("Update Password")).toBeNull();
	});

	it("offers a new link, via Forgot Password", async () => {
		renderScreen();

		await userEvent.press(screen.getByLabelText("Request a New Link"));

		expect(mockAuth.finishPasswordRecovery).toHaveBeenCalledWith("/forgot-password");
	});

	it("still lets you back out to sign in", async () => {
		renderScreen();

		await userEvent.press(screen.getByLabelText("Back to Sign In"));
		await act(async () => {});

		expect(mockAuth.signOut).toHaveBeenCalledTimes(1);
	});
});

describe("the Return key", () => {
	it("moves to the confirmation, and submits from it only with a session", () => {
		mockAuth.session = null;
		const focused: string[] = [];
		renderAuthScreen(<ResetPassword />, { onFocusField: (field) => focused.push(field) });

		fireEvent(screen.getByLabelText("New password"), "submitEditing");
		expect(focused).toEqual(["Confirm new password"]);
		// No session: the button is disabled, and so is Return.
		expect(screen.getByLabelText("Confirm new password").props.onSubmitEditing).toBeUndefined();
	});

	it("updates the password from the confirmation field", async () => {
		mockAuth.updatePassword.mockResolvedValue(undefined);
		renderScreen();
		await userEvent.type(screen.getByLabelText("New password"), "Aa1!aaaa");
		await userEvent.type(screen.getByLabelText("Confirm new password"), "Aa1!aaaa");

		fireEvent(screen.getByLabelText("Confirm new password"), "submitEditing");
		await act(async () => {});

		expect(mockAuth.updatePassword).toHaveBeenCalledWith("Aa1!aaaa");
	});
});
