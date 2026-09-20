import * as React from "react";
import { act, screen, userEvent, within } from "@testing-library/react-native";
import { router } from "expo-router";

import { renderAuthScreen } from "@/test-utils/render-auth-screen";

/**
 * Sign in (FEATURE-INVENTORY §1.2), with `useAuth` mocked.
 *
 * `Platform.OS` is "ios" under this setup (test-utils/setup.ts), so the
 * web-only divider and Google button are absent here by design — they have
 * their own tests in components/auth/__tests__/auth-kit.test.tsx, and the
 * screen's job is only to gate them.
 *
 * nativewind/babel is off under jest, so nothing here asserts a class.
 */

const mockAuth = { signIn: jest.fn() };

jest.mock("@/context/supabase-provider", () => ({
	useAuth: () => mockAuth,
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SignIn = require("@/app/sign-in").default;

function renderScreen() {
	return renderAuthScreen(<SignIn />);
}

async function fillAndSubmit(email: string, password: string) {
	await userEvent.type(screen.getByLabelText("Email"), email);
	await userEvent.type(screen.getByLabelText("Password"), password);
	await userEvent.press(screen.getByLabelText("Sign In"));
	await act(async () => {});
}

beforeEach(() => {
	jest.clearAllMocks();
	jest.spyOn(console, "error").mockImplementation(() => {});
	mockAuth.signIn.mockResolvedValue(undefined);
});

describe("the chrome", () => {
	it("is the Sign In screen, with both fields and the forgot link", () => {
		renderScreen();

		// "Sign In" is on the page twice — the headline and the button — which
		// is what §1.2 had too, so the heading is identified by its role.
		expect(within(screen.getByRole("heading")).getByText("In")).toBeTruthy();
		expect(screen.getByLabelText("Sign In").props.role).toBe("button");
		expect(screen.getByLabelText("Email")).toBeTruthy();
		expect(screen.getByLabelText("Password")).toBeTruthy();
		expect(screen.getByLabelText("Forgot password?")).toBeTruthy();
		expect(screen.queryByTestId("status-card-error")).toBeNull();
	});

	it("keeps the field props §1.2 set", () => {
		renderScreen();

		const email = screen.getByLabelText("Email");
		expect(email.props.autoCapitalize).toBe("none");
		expect(email.props.autoComplete).toBe("email");
		expect(email.props.autoCorrect).toBe(false);
		expect(email.props.keyboardType).toBe("email-address");

		const password = screen.getByLabelText("Password");
		expect(password.props.secureTextEntry).toBe(true);
		expect(password.props.autoCapitalize).toBe("none");
	});

	/** Web only (§1.2) — and this setup is iOS. */
	it("hides the Google stack on native", () => {
		renderScreen();

		expect(screen.queryByTestId("auth-divider")).toBeNull();
		expect(screen.queryByLabelText("Continue with Google")).toBeNull();
	});

	it("sends the forgot link to /forgot-password", async () => {
		renderScreen();

		await userEvent.press(screen.getByLabelText("Forgot password?"));

		expect(jest.mocked(router.push)).toHaveBeenCalledWith("/forgot-password");
	});
});

describe("validation", () => {
	it("refuses an invalid email and a short password, and never calls signIn", async () => {
		renderScreen();

		await fillAndSubmit("nope", "short");

		expect(screen.getByText("Please enter a valid email address.")).toBeTruthy();
		expect(screen.getByText("Please enter at least 8 characters.")).toBeTruthy();
		expect(mockAuth.signIn).not.toHaveBeenCalled();
	});

	/** §1.2's rule is length only — a real password may predate any class rule. */
	it("accepts a password with no uppercase, digit or symbol", async () => {
		renderScreen();

		await fillAndSubmit("chase@example.com", "allletters");

		expect(mockAuth.signIn).toHaveBeenCalledWith("chase@example.com", "allletters");
	});
});

describe("submitting", () => {
	it("calls signIn and clears the form on success", async () => {
		renderScreen();

		await fillAndSubmit("chase@example.com", "Aa1!aaaa");

		expect(mockAuth.signIn).toHaveBeenCalledWith("chase@example.com", "Aa1!aaaa");
		// Nothing navigates from here; AuthProvider's routing effect does.
		expect(screen.queryByTestId("status-card-error")).toBeNull();
		expect(screen.getByLabelText("Email").props.value).toBe("");
		expect(screen.getByLabelText("Password").props.value).toBe("");
	});

	it("says it is busy while the call is in flight", async () => {
		let release: () => void = () => {};
		mockAuth.signIn.mockReturnValue(
			new Promise<void>((resolve) => {
				release = resolve;
			}),
		);
		renderScreen();

		await userEvent.type(screen.getByLabelText("Email"), "chase@example.com");
		await userEvent.type(screen.getByLabelText("Password"), "Aa1!aaaa");
		await userEvent.press(screen.getByLabelText("Sign In"));

		const button = screen.getByLabelText("Sign In");
		expect(button.props.accessibilityState).toEqual({ busy: true, disabled: true });

		await act(async () => {
			release();
		});
	});
});

describe("the error card", () => {
	it("shows the mapped message, as an alert", async () => {
		mockAuth.signIn.mockRejectedValue(new Error("Invalid login credentials"));
		renderScreen();

		await fillAndSubmit("chase@example.com", "Aa1!aaaa");

		const card = screen.getByTestId("status-card-error");
		expect(card.props.role).toBe("alert");
		expect(within(card).getByText("Sign in failed")).toBeTruthy();
		expect(within(card).getByText("Incorrect email or password. Please try again.")).toBeTruthy();
	});

	it("clears on the next attempt", async () => {
		mockAuth.signIn.mockRejectedValueOnce(new Error("Invalid login credentials"));
		renderScreen();

		await fillAndSubmit("chase@example.com", "Aa1!aaaa");
		expect(screen.getByTestId("status-card-error")).toBeTruthy();

		mockAuth.signIn.mockResolvedValue(undefined);
		await userEvent.press(screen.getByLabelText("Sign In"));
		await act(async () => {});

		expect(screen.queryByTestId("status-card-error")).toBeNull();
	});
});
