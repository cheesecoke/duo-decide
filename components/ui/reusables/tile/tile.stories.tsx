import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { Title } from "@/components/ui/reusables/headline/headline";
import { Tile } from "@/components/ui/reusables/tile/tile";

/**
 * Tile — tokens.md §7 component 5, after the soft editorial blocks in
 * design-refs/soft-editorial-bubbles.webp.
 *
 * A doorway rather than a row: 28 px corners, a 160 px floor, a tint that says
 * whose area this is, and the round arrow button parked bottom-right. The
 * bottom-left slot is where a character or a count goes.
 */
const meta = {
	title: "Reusables/Tile",
	component: Tile,
	args: {
		title: "Decision Queue",
		subtitle: "3 waiting on you",
		tint: "surface-2",
		onPress: () => {},
	},
	decorators: [
		(Story) => (
			<View className="w-full max-w-md gap-4 self-center">
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof Tile>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The neutral tile — an area neither person owns. */
export const Surface2: Story = {
	name: "Surface-2 tint",
	args: { tint: "surface-2" },
};

export const TintA: Story = {
	name: "Person A tint",
	args: { tint: "a", title: "Your picks", subtitle: "Tonight's shortlist" },
};

export const TintB: Story = {
	name: "Person B tint",
	args: { tint: "b", title: "Sam's picks", subtitle: "Tonight's shortlist" },
};

/** Title only — the block keeps its 160 px floor and the arrow stays put. */
export const TitleOnly: Story = {
	args: { subtitle: undefined, title: "History" },
};

/**
 * The bottom-left slot. Task 3's Fish and Goose characters land here; until
 * then, a stand-in showing that the arrow keeps its corner.
 */
export const WithIllustration: Story = {
	args: {
		tint: "a",
		title: "Your picks",
		subtitle: "Tonight's shortlist",
		illustration: (
			<View className="h-12 w-12 items-center justify-center rounded-chip bg-person-a-base">
				<Title className="text-surface">7</Title>
			</View>
		),
	},
};

/** The three tints together, which is how they actually appear on a page. */
export const AllTints: Story = {
	render: () => (
		<>
			<Tile title="Decision Queue" subtitle="3 waiting on you" tint="a" onPress={() => {}} />
			<Tile title="Sam's picks" subtitle="Tonight's shortlist" tint="b" onPress={() => {}} />
			<Tile title="History" subtitle="42 decisions made" tint="surface-2" onPress={() => {}} />
		</>
	),
};

/** Long copy: the block grows past its floor instead of clipping. */
export const LongCopy: Story = {
	args: {
		tint: "b",
		title: "What are we doing about the weekend in October?",
		subtitle: "Both of you still have options to rank before Friday evening",
	},
};
