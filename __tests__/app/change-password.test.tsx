import * as React from "react";
import { act, screen, userEvent, within } from "@testing-library/react-native";
import { router } from "expo-router";
import type { Session } from "@supabase/supabase-js";

import { renderAuthScreen } from "@/test-utils/render-auth-screen";

/**
 * Change password (FEATURE-INVENTORY §1.6), with `useAuth` and the
 * current-password check mocked.
 *
 * The check is the reason this screen is not just "reset with an extra
 * field": it runs first, it has its own three outcomes, and §1.6's order
 * between them is what is asserted here.
 */

const mockAuth = {
	updatePassword: jest.fn(),
	session: null as Session | null,
};

const mockVerify = jest.fn();

jest.mock("@/context/supabase-provider", () => ({
	useAuth: () => mockAuth,
}));

jest.mock("@/config/verify-current-password", () => ({
	verifyCurrentPassword: (...args: unknown[]) => mockVerify(...args),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ChangePassword = require("@/app/change-password").default;

const SESSION = { user: { email: "chase@example.com" } } as Session;

function renderScreen() {
	return renderAuthScreen(<ChangePassword />);
}

async function fill(current = "OldPass1!", next = "Aa1!aaaa") {
	await userEvent.type(screen.getByLabelText("Current password"), current);
	await userEvent.type(screen.getByLabelText("New password"), next);
	await userEvent.type(screen.getByLabelText("Confirm new password"), next);
	await userEvent.press(screen.getByLabelText("Update Password"));
	await act(async () => {});
}

function errorText() {
	return screen.getByTestId("status-card-error");
}

beforeEach(() => {
	jest.clearAllMocks();
	jest.spyOn(console, "error").mockImplementation(() => {});
	mockAuth.session = SESSION;
	mockAuth.updatePassword.mockResolvedValue(undefined);
	mockVerify.mockResolvedValue(true);
});

describe("the form variant", () => {
	it("opens with three fields, the intro and no card", () => {
		renderScreen();

		expect(screen.getByText("Enter a new password for your account.")).toBeTruthy();
		expect(screen.getByLabelText("Current password")).toBeTruthy();
		expect(screen.getByLabelText("New password")).toBeTruthy();
		expect(screen.getByLabelText("Confirm new password")).toBeTruthy();
		expect(screen.queryByTestId("status-card-error")).toBeNull();
	});

	it("wants the current password before it will submit", async () => {
		renderScreen();

		await fill("", "Aa1!aaaa");

		expect(screen.getByText("Please enter your current password.")).toBeTruthy();
		expect(mockVerify).not.toHaveBeenCalled();
	});
});

describe("the current-password check", () => {
	it("runs first, against the session's email, and only then updates", async () => {
		renderScreen();

		await fill();

		expect(mockVerify).toHaveBeenCalledWith("chase@example.com", "OldPass1!");
		expect(mockAuth.updatePassword).toHaveBeenCalledWith("Aa1!aaaa");
	});

	it("says so when the current password is wrong, and changes nothing", async () => {
		mockVerify.mockResolvedValue(false);
		renderScreen();

		await fill();

		expect(within(errorText()).getByText("Your current password is incorrect.")).toBeTruthy();
		expect(mockAuth.updatePassword).not.toHaveBeenCalled();
	});

	/** §1.6: a 429 from the check is its own sentence. */
	it("says so when the check was rate-limited", async () => {
		mockVerify.mockRejectedValue(new Error("Password verification failed (429)"));
		renderScreen();

		await fill();

		expect(
			within(errorText()).getByText("Too many attempts. Please wait a minute and try again."),
		).toBeTruthy();
		expect(mockAuth.updatePassword).not.toHaveBeenCalled();
	});

	it("distinguishes a check that could not be made from a wrong password", async () => {
		mockVerify.mockRejectedValue(new Error("Password verification failed (500)"));
		renderScreen();

		await fill();

		expect(
			within(errorText()).getByText("Couldn't verify your current password. Please try again."),
		).toBeTruthy();
		expect(screen.queryByText("Your current password is incorrect.")).toBeNull();
	});

	it("does not run at all without an email on the session", async () => {
		mockAuth.session = { user: {} } as Session;
		renderScreen();

		await fill();

		expect(mockVerify).not.toHaveBeenCalled();
		expect(
			within(errorText()).getByText("Your session has expired. Please sign in again."),
		).toBeTruthy();
	});
});

describe("the update's own errors", () => {
	it("asks you to reauthenticate when GoTrue does", async () => {
		mockAuth.updatePassword.mockRejectedValue(new Error("Reauthentication required"));
		renderScreen();

		await fill();

		expect(within(errorText()).getByText("Couldn't update password")).toBeTruthy();
		expect(
			within(errorText()).getByText(
				"For security, please sign out and sign back in before changing your password.",
			),
		).toBeTruthy();
	});
});

describe("the success variant", () => {
	it("confirms, and goes back to the decisions", async () => {
		renderScreen();

		await fill();

		const card = screen.getByTestId("status-card-success");
		expect(within(card).getByText("Password updated")).toBeTruthy();
		expect(within(card).getByText("Use your new password the next time you sign in.")).toBeTruthy();
		expect(screen.queryByLabelText("Current password")).toBeNull();

		await userEvent.press(screen.getByLabelText("Back to Decisions"));
		expect(jest.mocked(router.replace)).toHaveBeenCalledWith("/(protected)/(tabs)");
	});
});
