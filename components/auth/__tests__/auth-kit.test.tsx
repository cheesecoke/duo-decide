import * as React from "react";
import { Platform } from "react-native";
import { render, screen, userEvent, within } from "@testing-library/react-native";

import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthScreen, splitTitle } from "@/components/auth/auth-screen";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { StatusCard } from "@/components/auth/status-card";
import { SubmitButton } from "@/components/auth/submit-button";
import { TextLink } from "@/components/auth/text-link";
import { AuthContext } from "@/context/supabase-provider";
import { Text } from "@/components/ui/reusables/text/text";
import { TestWrapper } from "@/test-utils/test-wrapper";

/**
 * The auth kit — the six pieces every auth screen is built out of.
 *
 * nativewind/babel is off under jest (babel.config.js), so what is asserted
 * here is behaviour and accessibility: the role each block announces itself
 * with, the busy state, the platform gate, and the one rule in `splitTitle`.
 */

const baseAuth = {
	initialized: true,
	session: null,
	isPasswordRecovery: false,
	signUp: jest.fn(),
	signIn: jest.fn(),
	signInWithGoogle: jest.fn(),
	signOut: jest.fn(),
	resetPassword: jest.fn(),
	updatePassword: jest.fn(),
};

function withAuth(node: React.ReactNode, overrides: Partial<typeof baseAuth> = {}) {
	return render(
		<AuthContext.Provider value={{ ...baseAuth, ...overrides }}>{node}</AuthContext.Provider>,
	);
}

describe("StatusCard", () => {
	it("announces an error as an alert, with its title and every line", () => {
		render(
			<StatusCard tone="error" title="Sign in failed">
				{"Incorrect email or password. Please try again."}
			</StatusCard>,
		);

		const card = screen.getByTestId("status-card-error");
		expect(card.props.role).toBe("alert");
		expect(within(card).getByText("Sign in failed")).toBeTruthy();
		expect(within(card).getByText("Incorrect email or password. Please try again.")).toBeTruthy();
	});

	it("announces a success politely, on a together card", () => {
		render(
			<StatusCard tone="success" title="Check your email!">
				{"We sent a confirmation link to chase@example.com."}
				{"Didn't receive it? Check your spam folder."}
			</StatusCard>,
		);

		const card = screen.getByTestId("status-card-success");
		expect(within(card).getByTestId("card-state-together").props.role).toBe("status");
		expect(within(card).getByText("Check your email!")).toBeTruthy();
		expect(within(card).getByText("We sent a confirmation link to chase@example.com.")).toBeTruthy();
		expect(within(card).getByText("Didn't receive it? Check your spam folder.")).toBeTruthy();
	});

	/** No green anywhere in the palette — success is the two of you. */
	it("does not use the alert role for a success", () => {
		render(
			<StatusCard tone="success" title="Password updated">
				{"Use it next time."}
			</StatusCard>,
		);

		expect(screen.queryByTestId("status-card-error")).toBeNull();
	});
});

describe("AuthDivider", () => {
	it("says OR between two hairlines", () => {
		render(<AuthDivider />);

		expect(within(screen.getByTestId("auth-divider")).getByText("OR")).toBeTruthy();
	});
});

describe("SubmitButton", () => {
	it("presses, and reads out its label", async () => {
		const onPress = jest.fn();
		render(<SubmitButton label="Sign In" onPress={onPress} />);

		const button = screen.getByLabelText("Sign In");
		expect(button.props.accessibilityState).toEqual({ busy: false, disabled: false });

		await userEvent.press(button);
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("swaps the label for a spinner while submitting, and says it is busy", async () => {
		const onPress = jest.fn();
		render(<SubmitButton label="Sign In" submitting onPress={onPress} />);

		// The accessible name is deliberately unchanged; the visible label is gone.
		const button = screen.getByLabelText("Sign In");
		expect(within(button).queryByText("Sign In")).toBeNull();
		expect(button.props.accessibilityState).toEqual({ busy: true, disabled: true });
		expect(button.props.disabled).toBe(true);

		await userEvent.press(button);
		expect(onPress).not.toHaveBeenCalled();
	});

	it("can be disabled without being busy", async () => {
		const onPress = jest.fn();
		render(<SubmitButton label="Update Password" disabled onPress={onPress} />);

		const button = screen.getByLabelText("Update Password");
		expect(button.props.accessibilityState).toEqual({ busy: false, disabled: true });
		expect(within(button).getByText("Update Password")).toBeTruthy();

		await userEvent.press(button);
		expect(onPress).not.toHaveBeenCalled();
	});
});

describe("TextLink", () => {
	it("is a link, and presses", async () => {
		const onPress = jest.fn();
		render(<TextLink label="Forgot password?" onPress={onPress} />);

		const link = screen.getByLabelText("Forgot password?");
		expect(link.props.role).toBe("link");

		await userEvent.press(link);
		expect(onPress).toHaveBeenCalledTimes(1);
	});
});

describe("GoogleAuthButton", () => {
	const originalOS = Platform.OS;

	afterEach(() => {
		(Platform as { OS: string }).OS = originalOS;
	});

	it("renders nothing on native", () => {
		(Platform as { OS: string }).OS = "ios";

		expect(withAuth(<GoogleAuthButton />).toJSON()).toBeNull();
	});

	it("starts the handshake on web", async () => {
		(Platform as { OS: string }).OS = "web";
		const signInWithGoogle = jest.fn().mockResolvedValue(undefined);
		withAuth(<GoogleAuthButton />, { signInWithGoogle });

		await userEvent.press(screen.getByLabelText("Continue with Google"));

		expect(signInWithGoogle).toHaveBeenCalledTimes(1);
	});

	it("shows its own error card when the handshake is refused", async () => {
		(Platform as { OS: string }).OS = "web";
		jest.spyOn(console, "error").mockImplementation(() => {});
		const signInWithGoogle = jest.fn().mockRejectedValue(new Error("popup blocked"));
		withAuth(<GoogleAuthButton />, { signInWithGoogle });

		await userEvent.press(screen.getByLabelText("Continue with Google"));

		const card = await screen.findByTestId("status-card-error");
		expect(within(card).getByText("Couldn't start Google sign-in")).toBeTruthy();
		expect(within(card).getByText("Please try again.")).toBeTruthy();
		// …and the button is pressable again.
		expect(screen.getByLabelText("Continue with Google").props.disabled).toBe(false);
	});
});

describe("splitTitle", () => {
	it.each([
		["Sign In", ["Sign ", "In"]],
		["Sign Up", ["Sign ", "Up"]],
		["Reset Password", ["Reset ", "Password"]],
		["Change Password", ["Change ", "Password"]],
		["Choose New Password", ["Choose New ", "Password"]],
		["Welcome", ["", "Welcome"]],
	])("%s → %p", (title, expected) => {
		expect(splitTitle(title)).toEqual(expected);
	});
});

describe("AuthScreen", () => {
	/** `TestWrapper` mounts the person pair the shell's colours come from. */
	function renderScreen(node: React.ReactElement) {
		return render(node, { wrapper: TestWrapper });
	}

	/**
	 * The mark is on the frame, not the six screens, so this is the one place
	 * it has to be asserted — every auth route gets it or none does. It is
	 * decorative: found by testID, and the heading is still what announces the
	 * screen.
	 */
	it("wears the brand mark above the title", () => {
		renderScreen(<AuthScreen title="Sign In" footer={<Text>Footer</Text>} />);

		expect(screen.getByTestId("brand-heart")).toBeTruthy();
		expect(screen.getByRole("heading")).toBeTruthy();
	});

	it("renders the headline as a level-1 heading, both halves of it", () => {
		renderScreen(<AuthScreen title="Choose New Password" footer={<Text>Footer</Text>} />);

		const heading = screen.getByRole("heading");
		expect(heading.props["aria-level"]).toBe(1);
		// The whole title reads as one line…
		expect(screen.getByText("Choose New Password")).toBeTruthy();
		// …and only the last word is its own (bold) Text inside it.
		expect(within(heading).getByText("Password")).toBeTruthy();
	});

	it("shows the intro only when there is one", () => {
		const { rerender } = renderScreen(<AuthScreen title="Sign In" footer={<Text>Footer</Text>} />);
		expect(screen.queryByText("Enter a new password for your account.")).toBeNull();

		rerender(
			<AuthScreen
				title="Change Password"
				intro="Enter a new password for your account."
				footer={<Text>Footer</Text>}
			/>,
		);
		expect(screen.getByText("Enter a new password for your account.")).toBeTruthy();
	});

	it("puts the footer in the footer slot and the form above it", () => {
		renderScreen(
			<AuthScreen title="Sign In" footer={<Text>The button stack</Text>}>
				<Text>The form</Text>
			</AuthScreen>,
		);

		const footer = screen.getByTestId("auth-footer");
		expect(within(footer).getByText("The button stack")).toBeTruthy();
		expect(within(footer).queryByText("The form")).toBeNull();
		expect(screen.getByText("The form")).toBeTruthy();
	});
});
