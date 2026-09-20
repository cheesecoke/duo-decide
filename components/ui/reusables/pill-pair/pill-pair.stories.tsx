import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import * as React from "react";
import { View } from "react-native";

import { PillPair } from "@/components/ui/reusables/pill-pair/pill-pair";

/**
 * PillPair — tokens.md §7 component 7, after the fused clusters in
 * design-refs/fintech-pill-clusters.webp.
 *
 * One `surface-2` track, two halves, and a `bg-bg` notch punched into the
 * seam. The halves are separate actions: the left one usually commits, the
 * right one branches.
 */
const meta = {
	title: "Reusables/PillPair",
	component: PillPair,
	args: {
		left: { label: "Lock my vote" },
		right: { label: "Simulate Sam" },
	},
	decorators: [
		(Story) => (
			<View className="w-full max-w-md gap-4 self-center">
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof PillPair>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Nothing chosen yet — both halves sit on the bare track. */
export const Neutral: Story = {};

export const LeftSelected: Story = {
	args: { selected: "left" },
};

export const RightSelected: Story = {
	args: { selected: "right" },
};

export const RightDisabled: Story = {
	args: {
		right: { label: "Simulate Sam", disabled: true },
	},
};

/**
 * Long labels wrap inside their half. The halves are `flex-1`, so the seam
 * stays at the midpoint and the notch stays centred on it.
 */
export const LongLabels: Story = {
	args: {
		left: { label: "Lock my vote for tonight" },
		right: { label: "Simulate Sam's answer instead" },
		selected: "left",
	},
};

/** Both sides in their selected state, to check the two tints against each other. */
export const BothPersons: Story = {
	render: () => (
		<>
			<PillPair left={{ label: "Lock my vote" }} right={{ label: "Simulate Sam" }} selected="left" />
			<PillPair left={{ label: "Lock my vote" }} right={{ label: "Simulate Sam" }} selected="right" />
		</>
	),
};
