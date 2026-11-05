import * as React from "react";
import { screen, userEvent, within } from "@testing-library/react-native";

import type { EmailLinkState } from "@/config/auth-link";
import { renderAuthScreen } from "@/test-utils/render-auth-screen";

/**
 * The "Email confirmed" screen (app/email-confirmed.tsx), with `useAuth`
 * mocked: what each state of the provider's `emailLink` shows, and where its
 * button goes.
 */

const mockAuth = {
	emailLink: null as EmailLinkState | null,
	dismissEmailLink: jest.fn(),
};

jest.mock("@/context/supabase-provider", () => ({
	useAuth: () => mockAuth,
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const EmailConfirmed = require("@/app/email-confirmed").default;

beforeEach(() => {
	jest.clearAllMocks();
	mockAuth.emailLink = null;
});

it("confirms a phone sign-up and offers to continue on the web", async () => {
	mockAuth.emailLink = { status: "confirmed", type: "signup" };
	renderAuthScreen(<EmailConfirmed />);

	const card = screen.getByTestId("status-card-success");
	expect(within(card).getByText("Email confirmed")).toBeTruthy();
	expect(within(card).getByText("You can sign in on the Duo app, or continue here.")).toBeTruthy();

	await userEvent.press(screen.getByLabelText("Continue Here"));
	expect(mockAuth.dismissEmailLink).toHaveBeenCalledWith();
});

it("titles a magic link for what it did", () => {
	mockAuth.emailLink = { status: "confirmed", type: "magiclink" };
	renderAuthScreen(<EmailConfirmed />);

	expect(
		within(screen.getByTestId("status-card-success")).getByText("You're signed in"),
	).toBeTruthy();
});

it("waits quietly while the session is set", () => {
	mockAuth.emailLink = { status: "verifying", type: "signup" };
	renderAuthScreen(<EmailConfirmed />);

	expect(screen.getByTestId("email-link-verifying")).toBeTruthy();
	expect(screen.queryByTestId("status-card-success")).toBeNull();
});

it("explains a link that did not work, and goes to Sign In", async () => {
	mockAuth.emailLink = { status: "error", message: "This link has expired." };
	renderAuthScreen(<EmailConfirmed />);

	const card = screen.getByTestId("status-card-error");
	expect(within(card).getByText("This link can't be used")).toBeTruthy();
	expect(within(card).getByText("This link has expired.")).toBeTruthy();

	await userEvent.press(screen.getByLabelText("Go to Sign In"));
	expect(mockAuth.dismissEmailLink).toHaveBeenCalledWith("/sign-in");
});

it("renders nothing with nothing to show (the router moves on)", () => {
	renderAuthScreen(<EmailConfirmed />);

	expect(screen.queryByTestId("status-card-success")).toBeNull();
	expect(screen.queryByTestId("status-card-error")).toBeNull();
});
