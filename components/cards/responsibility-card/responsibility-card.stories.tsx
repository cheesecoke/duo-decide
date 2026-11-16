import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { ResponsibilityCard } from "@/components/cards/responsibility-card/responsibility-card";
import { STARTER_DECK } from "@/lib/responsibility-deck";

/**
 * ResponsibilityCard: the face of one card in the deck.
 *
 * Pure: the screen turns user ids into seats. The rail and wash come from
 * `Card`; the art plate and the daily stamp follow the same seat, so a card
 * nobody holds is drawn in the neutrals.
 *
 * The whole face is one button that opens the card (`CardDetail`).
 */
const meta = {
	title: "Cards/ResponsibilityCard",
	component: ResponsibilityCard,
	args: {
		title: "Trash & recycling",
		category: "home",
		daily: true,
		deckKey: "trash",
		holder: "none",
		partnerLabel: "Sam",
		doneToday: [],
		onOpen: () => {},
	},
	decorators: [
		(Story) => (
			<View className="w-44 self-center">
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof ResponsibilityCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Not dealt: the bare `line` rail and a neutral plate. */
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

/** Done today: a tick in the colour of whoever did it. */
export const DoneToday: Story = {
	args: { holder: "a", doneToday: ["a"] },
};

/** Both of you did it today (the partner's card, and you pitched in). */
export const DoneByBoth: Story = {
	args: { holder: "b", doneToday: ["a", "b"] },
};

/** Not a daily job: no stamp. */
export const NotDaily: Story = {
	args: { title: "Car", category: "out", daily: false, deckKey: "car", holder: "a" },
};

/** A card the couple wrote: no deck key, so it gets its category's picture. */
export const OwnCard: Story = {
	args: { title: "Taxes", category: "out", daily: false, deckKey: null, holder: "b" },
};

/** A long title is cut at two lines; the opened card shows all of it. */
export const LongTitle: Story = {
	args: {
		title: "Booking every appointment for the dog, the car and the boiler, and remembering them",
		holder: "b",
	},
};

/** The whole starter deck, two across, dealt the way a real one ends up. */
export const Deck: Story = {
	decorators: [
		(Story) => (
			<View className="w-[390px] self-center">
				<Story />
			</View>
		),
	],
	render: (args) => (
		<View className="flex-row flex-wrap justify-between gap-y-3">
			{STARTER_DECK.map((card, index) => (
				<View key={card.key} className="w-[48%]">
					<ResponsibilityCard
						{...args}
						title={card.title}
						category={card.category}
						daily={card.daily}
						deckKey={card.key}
						holder={index % 5 === 4 ? "none" : index % 2 === 0 ? "a" : "b"}
						doneToday={index % 3 === 0 ? [index % 2 === 0 ? "a" : "b"] : []}
					/>
				</View>
			))}
		</View>
	),
};
