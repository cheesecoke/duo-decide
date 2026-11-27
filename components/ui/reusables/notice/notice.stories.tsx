import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { Notice } from "@/components/ui/reusables/notice/notice";

/**
 * Notice — a neutral `surface-2` slab for "you should know this", with up to
 * two actions. Not an error: there is no red in it, and it is announced as a
 * polite `status` unless `urgent`.
 *
 * It sits on a `surface` sheet in these stories, because that is where it
 * lives (the Add to calendar drawer). What to look for: the slab reads as
 * part of the form, not as an alarm; the action pills are `surface` on
 * `surface-2` and wrap under each other in **LongActions**.
 */
const meta = {
	title: "Reusables/Notice",
	component: Notice,
	args: {
		message: "Steph just opened this in Google Calendar. Hold off so it doesn't land twice.",
	},
	decorators: [
		(Story) => (
			<View className="w-full max-w-[390px] self-center rounded-card bg-surface p-5">
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof Notice>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Text only. */
export const MessageOnly: Story = {};

export const OneAction: Story = {
	args: { actions: [{ label: "Add anyway", onPress: () => {} }] },
};

export const TwoActions: Story = {
	args: {
		message:
			"We can't add straight to other calendars yet. Want direct adding? Tell us and we'll count your vote.",
		actions: [
			{ label: "Ask for it", onPress: () => {} },
			{ label: "Use Google Calendar", onPress: () => {} },
		],
	},
};

export const WithTitle: Story = {
	args: {
		title: "Already on the calendar",
		message: "Steph added this to Google Calendar.",
		actions: [{ label: "Got it", onPress: () => {} }],
	},
};

/** Same slab, announced as `role="alert"`: something just failed. */
export const Urgent: Story = {
	args: {
		urgent: true,
		message: "We couldn't open Google Calendar.",
		actions: [{ label: "Try again", onPress: () => {} }],
	},
};

export const DisabledAction: Story = {
	args: {
		urgent: true,
		message: "No connection right now, so nothing was added. Try again when you're back online.",
		actions: [{ label: "Try again", onPress: () => {}, disabled: true }],
	},
};

/** Two long labels do not fit on one line, so the second wraps under the first. */
export const LongActions: Story = {
	args: {
		actions: [
			{ label: "Add it to my own calendar anyway", onPress: () => {} },
			{ label: "Wait for Steph to finish adding it", onPress: () => {} },
		],
	},
};
