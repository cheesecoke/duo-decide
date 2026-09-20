import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import * as React from "react";
import { View } from "react-native";

import { SegmentedToggle } from "@/components/ui/reusables/segmented-toggle/segmented-toggle";
import { Text } from "@/components/ui/reusables/text/text";

/**
 * SegmentedToggle — tokens.md §7 component 8, after the "Spend | Income"
 * control in design-refs/fintech-pill-clusters.webp.
 *
 * A `cta` thumb slides inside a `surface-2` track with `spring.gentle`. It is
 * a controlled component: every story owns the value and feeds it back.
 */
const TWO = [
	{ value: "vote", label: "Vote" },
	{ value: "poll", label: "Poll" },
];

const THREE = [
	{ value: "today", label: "Today" },
	{ value: "week", label: "This week" },
	{ value: "all", label: "All" },
];

const meta = {
	title: "Reusables/SegmentedToggle",
	component: SegmentedToggle,
	// Defaults so every story is type-complete; the stories below all render a
	// controlled wrapper instead of using them directly.
	args: { options: TWO, value: "vote", onChange: () => {} },
	decorators: [
		(Story) => (
			<View className="w-full max-w-md gap-4 self-center">
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof SegmentedToggle>;

export default meta;

type Story = StoryObj<typeof meta>;

function Controlled({
	options,
	initial,
	onPick,
}: {
	options: { value: string; label: string }[];
	initial: string;
	onPick?: (value: string) => void;
}) {
	const [value, setValue] = React.useState(initial);

	return (
		<SegmentedToggle
			options={options}
			value={value}
			onChange={(next) => {
				setValue(next);
				onPick?.(next);
			}}
			accessibilityLabel="Decision mode"
		/>
	);
}

/** The two-option case: Vote | Poll. */
export const VoteOrPoll: Story = {
	render: () => <Controlled options={TWO} initial="vote" />,
};

/** Three options, with labels of different widths — the thumb measures each. */
export const ThreeOptions: Story = {
	render: () => <Controlled options={THREE} initial="week" />,
};

/** Shows the selected value as it changes, so the thumb slide can be checked against state. */
function ValueReadout() {
	const [picked, setPicked] = React.useState("week");

	return (
		<View className="gap-3">
			<Controlled options={THREE} initial="week" onPick={setPicked} />
			<Text className="text-center text-[13px] leading-[18px] text-ink-2">value: {picked}</Text>
		</View>
	);
}

export const ControlledDemo: Story = {
	render: () => <ValueReadout />,
};
