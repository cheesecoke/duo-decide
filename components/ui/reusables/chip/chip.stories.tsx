import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { Chip } from "@/components/ui/reusables/chip/chip";

/**
 * Chip — tokens.md §7 component 5.
 *
 * Neutral `surface-2` pill that fills with the owning person's tint when
 * selected; the fill springs in from 0.92 (`spring.snappy`) while its opacity
 * crosses over `dur.fast`, so it reads as growing from the chip's centre.
 */
const meta = {
	title: "Reusables/Chip",
	component: Chip,
	args: { label: "Tacos" },
	decorators: [
		(Story) => (
			<View className="w-full max-w-md flex-row flex-wrap items-start gap-3 self-center">
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof Chip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Unselected: Story = {};

export const SelectedA: Story = {
	args: { selected: true, person: "a" },
};

export const SelectedB: Story = {
	args: { label: "Ramen", selected: true, person: "b" },
};

/**
 * Disabled fades a chip out of the way at 40 % — **unless it is the selected
 * one**. A completed decision disables every chip and one of them is the
 * answer, so the selected chip keeps its full fill and full contrast; it is
 * the only thing on that card worth reading.
 */
export const Disabled: Story = {
	render: () => (
		<>
			<Chip label="Unselected" disabled />
			<Chip label="Selected" disabled selected />
			<Chip label="Selected, person B" disabled selected person="b" />
		</>
	),
};

/**
 * `readOnly` is the same pill used as a label rather than a control: no role,
 * no state, full opacity. It is what a history row prints the winning option
 * with — the decision is over, there is nothing there to check.
 *
 * Side by side with `Disabled` the difference should be invisible on the
 * selected pair and visible on the unselected one (which does not fade here),
 * because the difference is meant to be in the semantics, not the paint.
 */
export const ReadOnly: Story = {
	render: () => (
		<>
			<Chip label="Unselected" readOnly />
			<Chip label="Selected" readOnly selected />
			<Chip label="Selected, person B" readOnly selected person="b" />
		</>
	),
};

/** sm = caption 13/18 in a 32 px pill; md = body 16/22 in a 40 px pill. */
export const Sizes: Story = {
	render: () => (
		<>
			<Chip label="Small" size="sm" />
			<Chip label="Small selected" size="sm" selected />
			<Chip label="Medium" size="md" />
			<Chip label="Medium selected" size="md" selected />
		</>
	),
};

/**
 * Single-select group — the state lives in the story, which is how callers are
 * expected to drive `selected`. Press each chip to watch the fill spring in.
 */
function SingleSelectGroup() {
	const options = ["Tacos", "Ramen", "Pizza"];
	const [choice, setChoice] = React.useState<string | null>("Ramen");

	return (
		<>
			{options.map((option) => (
				<Chip
					key={option}
					label={option}
					selected={choice === option}
					onPress={() => setChoice(choice === option ? null : option)}
				/>
			))}
		</>
	);
}

export const ChipGroup: Story = {
	render: () => <SingleSelectGroup />,
};
