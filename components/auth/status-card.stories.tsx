import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { StatusCard } from "@/components/auth/status-card";

/**
 * StatusCard — what an auth screen says when something went wrong, and what
 * it says when it worked.
 *
 * What to look for: **there is no green.** The success card is the together
 * gradient — tokens.md §1 gives that to "both of you" and §10 keeps it as the
 * celebratory state, and this palette has no third accent colour to spend on
 * one. The error card is a flat `destructive-tint` panel with no border,
 * because tokens.md §3 says cards do not use borders.
 *
 * Both are the same shape they were before; what changed is that they are one
 * component rather than six hand-rolled pairs of hex codes.
 */
const meta = {
	title: "Auth/StatusCard",
	component: StatusCard,
	decorators: [
		(Story) => (
			<View className="w-full max-w-[450px] gap-4 self-center p-4">
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof StatusCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Sign-in's failure card, with the mapped Supabase message under it. */
export const ErrorSignIn: Story = {
	name: "Error — sign in failed",
	args: {
		tone: "error",
		title: "Sign in failed",
		children: "Incorrect email or password. Please try again.",
	},
};

/** Sign-up and forgot-password both land here: two lines, and an address. */
export const SuccessCheckEmail: Story = {
	name: "Success — check your email",
	args: {
		tone: "success",
		title: "Check your email!",
		// One string per line — see the component's docblock.
		children: [
			"We sent a confirmation link to chase@example.com. Click the link in the email to activate your account.",
			"Didn't receive it? Check your spam folder or try signing up again.",
		],
	},
};

/** The shortest one the app ships — change-password's confirmation. */
export const SuccessOneLine: Story = {
	name: "Success — one line",
	args: {
		tone: "success",
		title: "Password updated",
		children: "Use your new password the next time you sign in.",
	},
};

/** Reset-password's "you did not arrive here from the email" state. */
export const ErrorNoSession: Story = {
	name: "Error — no active reset session",
	args: {
		tone: "error",
		title: "No active reset session",
		children: "Open this page from the link in your password reset email, or request a new one.",
	},
};
