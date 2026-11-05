import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { EmailLinkScreen } from "@/components/auth/email-link-outcomes";
import { EMAIL_LINK_SESSION_FAILED_MESSAGE } from "@/config/auth-link";

/**
 * Where a confirmation email opened on the web lands — usually in a phone's
 * browser, from a sign-up made in the iPhone app. Look for:
 *
 * - **The app is named.** The confirmation says the account works in the Duo
 *   app, since that is where most people came from, and offers to carry on
 *   on the web too.
 * - **No dead ends.** An expired or used link says so and goes to Sign In.
 */
const meta = {
	title: "Auth/Email Link",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/** `#…&type=signup`, session set. */
export const EmailConfirmed: Story = {
	name: "Email confirmed",
	render: () => (
		<EmailLinkScreen
			state={{ status: "confirmed", type: "signup" }}
			onContinue={() => {}}
			onSignIn={() => {}}
		/>
	),
};

/** The moment between reading the link and Supabase accepting it. */
export const Verifying: Story = {
	name: "Verifying",
	render: () => (
		<EmailLinkScreen
			state={{ status: "verifying", type: "signup" }}
			onContinue={() => {}}
			onSignIn={() => {}}
		/>
	),
};

/** `#…&type=magiclink` — the same screen, its own title. */
export const MagicLink: Story = {
	name: "Magic link",
	render: () => (
		<EmailLinkScreen
			state={{ status: "confirmed", type: "magiclink" }}
			onContinue={() => {}}
			onSignIn={() => {}}
		/>
	),
};

/** `#error_code=otp_expired` — the link sat in the inbox too long. */
export const LinkExpired: Story = {
	name: "Link expired",
	render: () => (
		<EmailLinkScreen
			state={{
				status: "error",
				message:
					"This link has expired. If you were confirming a new account, sign up again with the same email to get a new link.",
			}}
			onContinue={() => {}}
			onSignIn={() => {}}
		/>
	),
};

/** Any other error in the link, or tokens Supabase refused. */
export const LinkInvalid: Story = {
	name: "Link invalid",
	render: () => (
		<EmailLinkScreen
			state={{ status: "error", message: EMAIL_LINK_SESSION_FAILED_MESSAGE }}
			onContinue={() => {}}
			onSignIn={() => {}}
		/>
	),
};
