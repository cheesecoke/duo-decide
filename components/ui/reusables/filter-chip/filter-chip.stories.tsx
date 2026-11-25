import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { Character } from "@/components/ui/reusables/character/character";
import { FilterChip } from "@/components/ui/reusables/filter-chip/filter-chip";

/**
 * FilterChip — a count chip that narrows a list. Grey at rest; selected it
 * fills with its tone (person A's tint, person B's, or the black `cta` for
 * a shared bucket), springing from the centre like `Chip`.
 */
const meta = {
	title: "Reusables/FilterChip",
	component: FilterChip,
	args: { label: "Your turn", count: 2, onPress: () => {} },
	decorators: [
		(Story) => (
			<View className="w-full max-w-md flex-row flex-wrap items-start gap-2 self-center">
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof FilterChip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Unselected: Story = {};

export const SelectedA: Story = { args: { selected: true, tone: "a" } };

export const SelectedB: Story = { args: { label: "Sam's turn", selected: true, tone: "b" } };

export const SelectedNeutral: Story = {
	args: { label: "Decided", count: 4, selected: true, tone: "neutral" },
};

/** A zero count stays tappable but sits back in `ink-3`. */
export const Empty: Story = { args: { label: "Decided", count: 0, tone: "neutral" } };

export const WithCharacter: Story = {
	args: { leading: <Character kind="fish" size={32} name="you" /> },
};

export const WithCharacterSelected: Story = {
	args: {
		label: "Sam's turn",
		tone: "b",
		selected: true,
		leading: <Character kind="goose" size={32} name="Sam" />,
	},
};

/** Tap to toggle — the row is single-select and can be emptied. */
function InteractiveRow() {
	const [value, setValue] = React.useState<string | null>("yours");
	const chips = [
		{ key: "yours", label: "Your turn", count: 2, tone: "a" as const },
		{ key: "theirs", label: "Sam's turn", count: 1, tone: "b" as const },
		{ key: "decided", label: "Decided", count: 0, tone: "neutral" as const },
	];
	return (
		<>
			{chips.map((chip) => (
				<FilterChip
					key={chip.key}
					label={chip.label}
					count={chip.count}
					tone={chip.tone}
					selected={value === chip.key}
					onPress={() => setValue(value === chip.key ? null : chip.key)}
				/>
			))}
		</>
	);
}

export const Interactive: Story = {
	render: () => <InteractiveRow />,
};
