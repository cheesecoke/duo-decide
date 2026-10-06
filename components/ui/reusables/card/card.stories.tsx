import * as React from "react";
import { Pressable, View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { Card, type CardState } from "@/components/ui/reusables/card/card";
import { Chip } from "@/components/ui/reusables/chip/chip";
import { Caption, Eyebrow, Title } from "@/components/ui/reusables/headline/headline";
import { Text } from "@/components/ui/reusables/text/text";

/**
 * Card — tokens.md §7 component 4.
 *
 * White `surface`, 24 px corners, `shadow.card`, and **no border** (tokens.md
 * §3 forbids one). State is carried by a 4 px left rail plus a 22 % wash of
 * the owning person's tint; `together` swaps both for the A→B gradient at
 * 25 % (tokens.md §10).
 *
 * Moving between states takes `dur.base` (220 ms) and interpolates in HSV, so
 * a card going a → b never passes through grey-brown.
 */
const meta = {
	title: "Reusables/Card",
	component: Card,
	decorators: [
		(Story) => (
			<View className="w-full max-w-md gap-4 self-center">
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

function CardBody({ title, meta: metaLine }: { title: string; meta: string }) {
	return (
		<>
			<Title>{title}</Title>
			<Caption className="mt-1">{metaLine}</Caption>
		</>
	);
}

/** Nobody has touched this decision yet — bare `line` rail, no wash. */
export const Neutral: Story = {
	args: {
		children: <CardBody title="Where are we eating?" meta="No votes yet" />,
	},
};

export const PersonA: Story = {
	args: {
		state: "a",
		children: <CardBody title="Where are we eating?" meta="You voted" />,
	},
};

export const PersonB: Story = {
	args: {
		state: "b",
		children: <CardBody title="Where are we eating?" meta="Sam voted" />,
	},
};

/** Both people are in — rail and wash become the A→B gradient. */
export const Together: Story = {
	args: {
		state: "together",
		children: <CardBody title="Where are we eating?" meta="You and Sam both voted" />,
	},
};

/** The four states stacked, to check the rails and washes against each other. */
export const AllStates: Story = {
	render: () => (
		<>
			<Card>
				<CardBody title="Neutral" meta="No votes yet" />
			</Card>
			<Card state="a">
				<CardBody title="Person A" meta="You voted" />
			</Card>
			<Card state="b">
				<CardBody title="Person B" meta="Sam voted" />
			</Card>
			<Card state="together">
				<CardBody title="Together" meta="You and Sam both voted" />
			</Card>
		</>
	),
};

const CYCLE: CardState[] = ["neutral", "a", "together", "neutral"];

/**
 * The reason the states are built out of stacked layers: press the button and
 * watch the rail and wash move without the colour ever leaving the palette.
 * (Also try it with the OS "reduce motion" setting on — the card should jump
 * straight to each state instead.)
 */
function TransitionDemo() {
	const [step, setStep] = React.useState(0);
	const state = CYCLE[step % CYCLE.length];

	return (
		<>
			<Card state={state}>
				<CardBody title="Where are we eating?" meta={`state: ${state}`} />
			</Card>
			<Pressable
				role="button"
				accessibilityLabel="Next state"
				onPress={() => setStep((current) => current + 1)}
				className="h-12 items-center justify-center rounded-button bg-cta px-5"
			>
				<Text className="text-[16px] font-semibold leading-[22px] text-cta-fg">
					Next state → {CYCLE[(step + 1) % CYCLE.length]}
				</Text>
			</Pressable>
		</>
	);
}

export const Transition: Story = {
	render: () => <TransitionDemo />,
};

/** A realistic queue card: header, meta line, and the Chip from Task 1. */
export const WithHeaderAndChips: Story = {
	render: () => (
		<Card state="together" onPress={() => {}}>
			<Eyebrow>Tonight · closes 7:00 pm</Eyebrow>
			<Title className="mt-2">Where are we eating?</Title>
			<View className="mt-4 flex-row flex-wrap gap-2">
				<Chip label="Tacos" size="sm" selected person="a" />
				<Chip label="Ramen" size="sm" selected person="b" />
				<Chip label="Pizza" size="sm" />
			</View>
		</Card>
	),
};

/** The whole card is the button when `onPress` is given. */
export const Pressable_: Story = {
	name: "Pressable",
	args: {
		state: "a",
		onPress: () => {},
		children: <CardBody title="Tap anywhere on this card" meta="role=button" />,
	},
};
