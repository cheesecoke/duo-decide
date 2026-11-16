import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { ResponsibilityCard } from "@/components/cards/responsibility-card/responsibility-card";

/**
 * ResponsibilityCard: one job, and who holds it.
 *
 * Pure: the screen turns the holder's user id into a seat. The rail and wash
 * come from `Card`, so a card nobody holds is neutral.
 *
 * Tap a chip to deal the card; tap the holder's chip again to put it back.
 * `⋯` carries "Put back in the deck" (only when held) and "Remove card".
 */
const meta = {
	title: "Cards/ResponsibilityCard",
	component: ResponsibilityCard,
	args: {
		title: "Trash & recycling",
		category: "home",
		daily: true,
		holder: "none",
		partnerLabel: "Sam",
		onDeal: () => {},
		onRemove: () => {},
	},
	decorators: [
		(Story) => (
			<View className="w-full max-w-md gap-3 self-center">
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof ResponsibilityCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Not dealt: the bare `line` rail, neither chip filled. */
export const NotDealt: Story = {};

/** You hold it. */
export const HeldByYou: Story = {
	name: "Held — person A",
	args: { holder: "a" },
};

/** Your partner holds it. */
export const HeldByPartner: Story = {
	name: "Held — person B",
	args: { holder: "b" },
};

/** Not a daily job: the meta line is the category alone. */
export const NotDaily: Story = {
	args: { title: "Car", category: "out", daily: false, holder: "a" },
};

/** No partner linked yet: only your own chip. */
export const NoPartner: Story = {
	args: { partnerLabel: null },
};

/** A long title wraps under the `⋯` instead of pushing it off the card. */
export const LongTitle: Story = {
	args: {
		title: "Booking every appointment for the dog, the car and the boiler, and remembering them",
		holder: "b",
	},
};

/** The three seats side by side, which is how the tab actually reads. */
export const AllSeats: Story = {
	render: (args) => (
		<>
			<ResponsibilityCard {...args} title="Trash & recycling" holder="a" />
			<ResponsibilityCard {...args} title="Groceries" holder="b" />
			<ResponsibilityCard {...args} title="Car" category="out" daily={false} holder="none" />
		</>
	),
};
