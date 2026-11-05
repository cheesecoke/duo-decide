import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { DecidedOptionRow, OptionMark } from "@/components/ui/reusables/option-row/option-row";

/**
 * OptionRow — the decided winner row, read-only, and the mark it carries.
 *
 * The same square `rounded-field` row, tint and tick a decided decision card
 * gives its winner (see Decision Queue/DecisionCard › Completed Vote), drawn
 * on its own for the History screen. The seat is whoever decided it.
 */
const meta = {
	title: "Reusables/OptionRow",
	component: DecidedOptionRow,
	args: { title: "Tacos", seat: "a" },
	decorators: [
		(Story) => (
			<View className="w-full max-w-md gap-4 self-center rounded-card bg-surface p-4">
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof DecidedOptionRow>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Decided by you — person A's tint and tick. */
export const SeatA: Story = { name: "Decided winner, seat A" };

/** Decided by your partner — person B's tint and tick. */
export const SeatB: Story = { name: "Decided winner, seat B", args: { seat: "b" } };

/** A sentence wider than the row wraps like a paragraph. */
export const LongText: Story = {
	args: {
		title: "Have a picnic - hike some where for lunch and eat by the creek, then nap in the shade",
	},
};

/** A pasted link reads as its host with an external-link mark, and opens. */
export const WithLink: Story = {
	args: {
		title:
			"Adventure Bikepacking Overnighter in Phantom Canyon (https://rodeo-labs.com/pages/phantom-canyon)",
		seat: "b",
	},
};

/** The marks on their own: empty, muted, and checked in each seat. */
export const Marks: Story = {
	render: () => (
		<View className="flex-row gap-3">
			<OptionMark checked={false} />
			<OptionMark checked={false} muted />
			<OptionMark checked />
			<OptionMark checked seat="b" />
		</View>
	),
};
