import * as React from "react";
import { Pressable, View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { Card } from "@/components/ui/reusables/card/card";
import { Gauge } from "@/components/ui/reusables/gauge/gauge";
import { Caption, Eyebrow } from "@/components/ui/reusables/headline/headline";
import { Text } from "@/components/ui/reusables/text/text";

/**
 * Gauge — tokens.md §7 component 9.
 *
 * A's share grows in from the left in `person.a.base`, B's from the right in
 * `person.b.base`, with a 4 px `bg` notch where they meet and the `line`
 * track underneath. The total sits in the bowl as a `numeral`, with an
 * optional caption under it.
 *
 * The arcs reveal on mount over `dur.reveal` (420 ms) — open the
 * AnimatedMount story and press Replay to watch it, and try it again with the
 * OS "reduce motion" setting on, where both arcs should simply be there.
 */
const meta = {
	title: "Reusables/Gauge",
	component: Gauge,
	decorators: [
		(Story) => (
			<View className="w-full max-w-md items-center gap-6 self-center">
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof Gauge>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The brief's example: three decisions to you, one to them. */
export const ThreeToOne: Story = {
	args: { a: 3, b: 1, label: "Decisions" },
};

/** Dead even — the notch lands at the top of the ring. */
export const EvenSplit: Story = {
	args: { a: 5, b: 5, label: "Decisions" },
};

/** Nobody has decided anything: the bare track and a zero, no arcs. */
export const Empty: Story = {
	args: { a: 0, b: 0, label: "Decisions" },
};

/** One-sided — the other arc is not drawn at all, so there is no phantom dot. */
export const OneSided: Story = {
	args: { a: 6, b: 0, label: "Decisions" },
};

export const Large: Story = {
	args: { a: 3, b: 1, label: "Decisions", size: 220 },
};

/** Both sizes together, to check the stroke against each radius. */
export const BothSizes: Story = {
	args: { a: 3, b: 1 },
	render: () => (
		<>
			<Gauge a={7} b={5} label="160" />
			<Gauge a={7} b={5} label="220" size={220} />
		</>
	),
};

/** No caption — the numeral centres on its own. */
export const WithoutLabel: Story = {
	args: { a: 2, b: 6 },
};

function ReplayDemo() {
	// Remounting is the honest way to replay a mount animation: a new key
	// throws the old gauge away, shared values and all.
	const [run, setRun] = React.useState(0);

	return (
		<>
			<Gauge key={run} a={3} b={1} label="Decisions" size={220} />
			<Pressable
				role="button"
				accessibilityLabel="Replay the reveal"
				onPress={() => setRun((current) => current + 1)}
				className="h-12 items-center justify-center rounded-button bg-cta px-5"
			>
				<Text className="text-[16px] font-semibold leading-[22px] text-cta-fg">Replay the reveal</Text>
			</Pressable>
			<Caption>run {run}</Caption>
		</>
	);
}

export const AnimatedMount: Story = {
	args: { a: 3, b: 1 },
	render: () => <ReplayDemo />,
};

/**
 * Where it is actually going: the History screen's summary, on a Card. The
 * notch is `bg` rather than `surface`, so on white it reads as a hairline
 * rather than a hole — deliberate, and the reason the gauge is shown both
 * ways here.
 */
export const OnACard: Story = {
	args: { a: 3, b: 1 },
	render: () => (
		<Card state="together" className="w-full items-center">
			<Eyebrow>History</Eyebrow>
			<Gauge a={12} b={9} label="Decisions made" size={220} className="mt-4" />
		</Card>
	),
};
