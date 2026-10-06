import * as React from "react";
import { act, screen, userEvent, within } from "@testing-library/react-native";
import { router } from "expo-router";

import { renderAuthScreen } from "@/test-utils/render-auth-screen";

/**
 * Sign up (FEATURE-INVENTORY §1.3), with `useAuth` mocked.
 *
 * The password rules have their own table (`__tests__/lib/auth/`), so what is
 * asserted here is that this screen is wired to them — including the
 * cross-field match, which is the one rule a schema table cannot prove is
 * connected to the right field.
 */

const mockAuth = { signUp: jest.fn() };

jest.mock("@/context/supabase-provider", () => ({
	useAuth: () => mockAuth,
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SignUp = require("@/app/sign-up").default;

function renderScreen() {
	return renderAuthScreen(<SignUp />);
}

async function fill({
	email = "chase@example.com",
	password = "Aa1!aaaa",
	confirmPassword = "Aa1!aaaa",
}: {
	email?: string;
	password?: string;
	confirmPassword?: string;
} = {}) {
	await userEvent.type(screen.getByLabelText("Email"), email);
	await userEvent.type(screen.getByLabelText("Password"), password);
	await userEvent.type(screen.getByLabelText("Confirm Password"), confirmPassword);
	await userEvent.press(screen.getByLabelText("Sign Up"));
	await act(async () => {});
}

beforeEach(() => {
	jest.clearAllMocks();
	jest.spyOn(console, "error").mockImplementation(() => {});
	mockAuth.signUp.mockResolvedValue(undefined);
});

describe("the form variant", () => {
	it("opens with three fields and no card", () => {
		renderScreen();

		expect(screen.getByLabelText("Email")).toBeTruthy();
		expect(screen.getByLabelText("Password")).toBeTruthy();
		expect(screen.getByLabelText("Confirm Password")).toBeTruthy();
		expect(screen.queryByTestId("status-card-error")).toBeNull();
		expect(screen.queryByTestId("status-card-success")).toBeNull();
	});

	it("hides the Google stack on native", () => {
		renderScreen();

		expect(screen.queryByTestId("auth-divider")).toBeNull();
		expect(screen.queryByLabelText("Continue with Google")).toBeNull();
	});
});

describe("validation", () => {
	it("enforces the character classes §1.3 asks for", async () => {
		renderScreen();

		await fill({ password: "alllower", confirmPassword: "alllower" });

		expect(screen.getByText("Your password must have at least one uppercase letter.")).toBeTruthy();
		expect(mockAuth.signUp).not.toHaveBeenCalled();
	});

	it("puts the mismatch under the confirm field, not the password", async () => {
		renderScreen();

		await fill({ password: "Aa1!aaaa", confirmPassword: "Aa1!bbbb" });

		expect(screen.getByText("Your passwords do not match.")).toBeTruthy();
		expect(mockAuth.signUp).not.toHaveBeenCalled();
		// The password field itself is fine…
		expect(screen.getByLabelText("Password").props["aria-invalid"]).toBe(false);
		// …and the confirm field is the one marked wrong.
		expect(screen.getByLabelText("Confirm Password").props["aria-invalid"]).toBe(true);
	});
});

describe("the success variant", () => {
	it("names the address, adds the spam line, and offers Sign In", async () => {
		renderScreen();

		await fill();

		expect(mockAuth.signUp).toHaveBeenCalledWith("chase@example.com", "Aa1!aaaa");

		const card = screen.getByTestId("status-card-success");
		expect(within(card).getByText("Check your email!")).toBeTruthy();
		expect(
			within(card).getByText(
				"We sent a confirmation link to chase@example.com. Click the link in the email to activate your account.",
			),
		).toBeTruthy();
		expect(
			within(card).getByText("Didn't receive it? Check your spam folder or try signing up again."),
		).toBeTruthy();

		expect(screen.queryByLabelText("Email")).toBeNull();

		await userEvent.press(screen.getByLabelText("Go to Sign In"));
		expect(jest.mocked(router.push)).toHaveBeenCalledWith("/sign-in");
	});
});

describe("the error card", () => {
	it("maps an already-registered address to the sign-in suggestion", async () => {
		mockAuth.signUp.mockRejectedValue(new Error("User already registered"));
		renderScreen();

		await fill();

		const card = screen.getByTestId("status-card-error");
		expect(within(card).getByText("Sign up failed")).toBeTruthy();
		expect(
			within(card).getByText("This email is already registered. Try signing in instead."),
		).toBeTruthy();
		// Still the form.
		expect(screen.getByLabelText("Email")).toBeTruthy();
	});
});
