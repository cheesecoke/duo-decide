import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import type { Session } from "@supabase/supabase-js";

import { ChangePasswordScreen } from "@/components/auth/change-password-screen";

/**
 * Change Password, in its two forms. Look for:
 *
 * - **Email account**: three fields, the current password first.
 * - **Google account**: no current-password field — there is none to give —
 *   and an intro that says why you would set one (the iPhone app has no
 *   Google sign-in).
 */
const meta = {
	title: "Auth/Change Password",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const EMAIL_SESSION = {
	user: { email: "chase@example.com", app_metadata: { providers: ["email"] } },
} as unknown as Session;

const GOOGLE_SESSION = {
	user: { email: "chase@example.com", app_metadata: { providers: ["google"] } },
} as unknown as Session;

const noop = async () => {};

/** Signed up with email: change it, current password first. */
export const EmailAccount: Story = {
	name: "Email account",
	render: () => (
		<ChangePasswordScreen session={EMAIL_SESSION} updatePassword={noop} onDone={() => {}} />
	),
};

/** Signed up with Google on the web: set one for the iPhone app. */
export const GoogleAccount: Story = {
	name: "Google account (set a password)",
	render: () => (
		<ChangePasswordScreen session={GOOGLE_SESSION} updatePassword={noop} onDone={() => {}} />
	),
};
