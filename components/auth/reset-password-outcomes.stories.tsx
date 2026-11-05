import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import {
	PasswordUpdatedScreen,
	ResetLinkErrorScreen,
} from "@/components/auth/reset-password-outcomes";

/**
 * The reset page's two non-form screens. Most people see them in a phone
 * browser, having asked for the reset in the app, so look for:
 *
 * - **No dead ends.** An expired link offers a new one, and the confirmation
 *   has a button forward — neither screen leaves you on a blank page.
 * - **Where the password goes.** On web the confirmation says it works in the
 *   Duo app, since that is usually where the person came from.
 */
const meta = {
	title: "Auth/Reset Password",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/** `#error_code=otp_expired` — the link sat in the inbox too long. */
export const LinkExpired: Story = {
	name: "Link expired",
	render: () => (
		<ResetLinkErrorScreen
			message="This reset link has expired. Request a new one."
			onRequestNewLink={() => {}}
			onBackToSignIn={() => {}}
		/>
	),
};

/** Any other error in the link, or tokens Supabase refused. */
export const LinkInvalid: Story = {
	name: "Link invalid",
	render: () => (
		<ResetLinkErrorScreen
			message="This reset link is invalid or has already been used. Request a new one."
			onRequestNewLink={() => {}}
			onBackToSignIn={() => {}}
		/>
	),
};

/** After "Update Password" succeeds. Storybook is web, so this is the web copy. */
export const PasswordUpdated: Story = {
	name: "Password updated",
	render: () => <PasswordUpdatedScreen onContinue={() => {}} />,
};
