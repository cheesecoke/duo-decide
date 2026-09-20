import * as React from "react";
import { act, screen, userEvent, within } from "@testing-library/react-native";
import { router } from "expo-router";

import { renderAuthScreen } from "@/test-utils/render-auth-screen";

/**
 * Request a password reset (FEATURE-INVENTORY §1.4), with `useAuth` mocked.
 *
 * Two variants on whether the email went out; the form one is what mounts.
 */

const mockAuth = { resetPassword: jest.fn() };

jest.mock("@/context/supabase-provider", () => ({
	useAuth: () => mockAuth,
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ForgotPassword = require("@/app/forgot-password").default;

function renderScreen() {
	return renderAuthScreen(<ForgotPassword />);
}

async function submit(email: string) {
	await userEvent.type(screen.getByLabelText("Email"), email);
	await userEvent.press(screen.getByLabelText("Send Reset Link"));
	await act(async () => {});
}

beforeEach(() => {
	jest.clearAllMocks();
	jest.spyOn(console, "error").mockImplementation(() => {});
	mockAuth.resetPassword.mockResolvedValue(undefined);
});

describe("the form variant", () => {
	it("opens with the intro, the field and the button", () => {
		renderScreen();

		expect(screen.getByRole("heading")).toBeTruthy();
		expect(
			screen.getByText(
				"Enter the email address you signed up with and we'll send you a link to reset your password.",
			),
		).toBeTruthy();
		expect(screen.getByLabelText("Email")).toBeTruthy();
		expect(screen.getByLabelText("Send Reset Link")).toBeTruthy();
		expect(screen.queryByTestId("status-card-error")).toBeNull();
		expect(screen.queryByTestId("status-card-success")).toBeNull();
	});

	it("refuses an invalid address and never calls resetPassword", async () => {
		renderScreen();

		await submit("nope");

		expect(screen.getByText("Please enter a valid email address.")).toBeTruthy();
		expect(mockAuth.resetPassword).not.toHaveBeenCalled();
	});

	it("shows the mapped error, under its own title", async () => {
		mockAuth.resetPassword.mockRejectedValue(new Error("Failed to fetch"));
		renderScreen();

		await submit("chase@example.com");

		const card = screen.getByTestId("status-card-error");
		expect(within(card).getByText("Couldn't send reset email")).toBeTruthy();
		expect(
			within(card).getByText("Network error. Please check your connection and try again."),
		).toBeTruthy();
		// Still the form: a failure does not advance to the success variant.
		expect(screen.getByLabelText("Send Reset Link")).toBeTruthy();
	});
});

describe("the success variant", () => {
	it("names the address, adds the spam line, and offers Sign In", async () => {
		renderScreen();

		await submit("chase@example.com");

		expect(mockAuth.resetPassword).toHaveBeenCalledWith("chase@example.com");

		const card = screen.getByTestId("status-card-success");
		expect(within(card).getByText("Check your email!")).toBeTruthy();
		expect(
			within(card).getByText(
				"We sent a password reset link to chase@example.com. Click the link in the email to choose a new password.",
			),
		).toBeTruthy();
		expect(
			within(card).getByText(
				"Didn't receive it? Check your spam folder, or wait a minute and try again.",
			),
		).toBeTruthy();

		// The form is gone; only the way back remains.
		expect(screen.queryByLabelText("Send Reset Link")).toBeNull();
		expect(screen.queryByLabelText("Email")).toBeNull();

		await userEvent.press(screen.getByLabelText("Back to Sign In"));
		expect(jest.mocked(router.push)).toHaveBeenCalledWith("/sign-in");
	});
});
