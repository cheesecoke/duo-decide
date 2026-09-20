import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthScreen } from "@/components/auth/auth-screen";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { StatusCard } from "@/components/auth/status-card";
import { SubmitButton } from "@/components/auth/submit-button";
import { TextLink } from "@/components/auth/text-link";
import { AuthContext } from "@/context/supabase-provider";
import { Body } from "@/components/ui/reusables/headline/headline";

/**
 * The auth kit — the five smaller pieces the six auth screens share, plus the
 * shell they all stand in.
 *
 * What to look for:
 *
 * - **The link is not yellow.** v1's "Forgot password?" was the brand yellow,
 *   and there is no yellow in tokens.md. A text link is `ink` at 600 now; the
 *   weight and its position under the button are what mark it.
 * - **The submit button says it is busy**, not just disabled — press the
 *   spinner story's button in the a11y inspector and the state is `busy`.
 * - **The Google button owns its own failure.** The rejected story shows the
 *   error inside the button's own block, not in the screen's card: the form
 *   above it is still fine.
 */
const meta = {
	title: "Auth/Kit",
	decorators: [
		(Story) => (
			<View className="w-full max-w-[450px] gap-4 self-center p-4">
				<Story />
			</View>
		),
	],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const noAuth = {
	initialized: true,
	session: null,
	isPasswordRecovery: false,
	signUp: async () => {},
	signIn: async () => {},
	signInWithGoogle: async () => {},
	signOut: async () => {},
	resetPassword: async () => {},
	updatePassword: async () => {},
};

/** The hairline pair and the one word between them. */
export const Divider: Story = {
	name: "AuthDivider",
	render: () => <AuthDivider />,
};

/** The one black element on the screen, at rest. */
export const Submit: Story = {
	name: "SubmitButton",
	render: () => (
		<>
			<SubmitButton label="Sign In" onPress={() => {}} />
			<SubmitButton label="Send Reset Link" onPress={() => {}} />
		</>
	),
};

/** Mid-submit: the label becomes a `cta.fg` spinner and the press is refused. */
export const SubmitBusy: Story = {
	name: "SubmitButton — submitting",
	render: () => <SubmitButton label="Sign Up" submitting onPress={() => {}} />,
};

/** Reset-password's case: nothing wrong, but there is no session to update. */
export const SubmitDisabled: Story = {
	name: "SubmitButton — disabled",
	render: () => <SubmitButton label="Update Password" disabled onPress={() => {}} />,
};

/** `ink` at 600, centred under the stack. */
export const Link: Story = {
	name: "TextLink",
	render: () => <TextLink label="Forgot password?" onPress={() => {}} />,
};

/** Web only — on iOS and Android this renders nothing at all. */
export const Google: Story = {
	name: "GoogleAuthButton",
	render: () => (
		<AuthContext.Provider value={noAuth}>
			<GoogleAuthButton />
		</AuthContext.Provider>
	),
};

/** Press it: the handshake never comes back — spinner in, button out. */
export const GoogleLoading: Story = {
	name: "GoogleAuthButton — starting",
	render: () => (
		<AuthContext.Provider
			value={{
				...noAuth,
				// Never resolves, which is also the real happy path: supabase-js
				// redirects the whole page away, so `loading` is deliberately
				// never cleared on success.
				signInWithGoogle: () => new Promise<void>(() => {}),
			}}
		>
			<GoogleAuthButton />
		</AuthContext.Provider>
	),
};

/** Press it: the handshake is refused and the button says so, on its own. */
export const GoogleRejected: Story = {
	name: "GoogleAuthButton — refused",
	render: () => (
		<AuthContext.Provider
			value={{
				...noAuth,
				signInWithGoogle: async () => {
					throw new Error("popup blocked");
				},
			}}
		>
			<GoogleAuthButton />
		</AuthContext.Provider>
	),
};

/**
 * A fixed height for the two whole-shell stories, so the footer `AuthScreen`
 * pins to the bottom of the viewport has a viewport to pin to. The rest of
 * the kit is small enough to size itself.
 */
function ScreenFrame({ children }: { children: React.ReactNode }) {
	return <View className="h-[560px]">{children}</View>;
}

/** The whole shell, with a form in the middle and a stack pinned to the end. */
export const Screen: Story = {
	name: "AuthScreen",
	render: () => (
		<ScreenFrame>
			<AuthContext.Provider value={noAuth}>
				<AuthScreen
					title="Sign In"
					footer={
						<>
							<SubmitButton label="Sign In" onPress={() => {}} />
							<AuthDivider />
							<GoogleAuthButton />
							<TextLink label="Forgot password?" onPress={() => {}} />
						</>
					}
				>
					<StatusCard tone="error" title="Sign in failed">
						{"Incorrect email or password. Please try again."}
					</StatusCard>
					<Body className="text-ink-2">(the form goes here)</Body>
				</AuthScreen>
			</AuthContext.Provider>
		</ScreenFrame>
	),
};

/** With an intro line, the way reset- and change-password open. */
export const ScreenWithIntro: Story = {
	name: "AuthScreen — with intro",
	render: () => (
		<ScreenFrame>
			<AuthScreen
				title="Choose New Password"
				intro="Enter a new password for your account."
				footer={<SubmitButton label="Update Password" onPress={() => {}} />}
			>
				<Body className="text-ink-2">(the form goes here)</Body>
			</AuthScreen>
		</ScreenFrame>
	),
};
