import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { CardDetail } from "@/components/cards/card-detail/card-detail";

/**
 * CardDetail: the body of the sheet a card opens into. Mark it done, hand it
 * over, see who has been doing it.
 */
const meta = {
	title: "Cards/CardDetail",
	component: CardDetail,
	args: {
		category: "home",
		daily: true,
		deckKey: "weeknight-dinners",
		holder: "a",
		partnerLabel: "Sam",
		doneByYouToday: false,
		log: [
			{ id: "1", who: "a", name: "You", when: "Yesterday" },
			{ id: "2", who: "b", name: "Sam", when: "Fri, Nov 13" },
			{ id: "3", who: "a", name: "You", when: "Thu, Nov 12" },
		],
		onDone: () => {},
		onUndo: () => {},
		onDeal: () => {},
		onRemove: () => {},
	},
	decorators: [
		(Story) => (
			<View className="w-full max-w-md self-center rounded-sheet bg-surface p-6">
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof CardDetail>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Yours, not done yet today. */
export const Default: Story = {};

/** After the tap: the black button gives way to a quiet "Done today" and an Undo. */
export const DoneToday: Story = {
	args: {
		doneByYouToday: true,
		log: [
			{ id: "0", who: "a", name: "You", when: "Today" },
			{ id: "1", who: "a", name: "You", when: "Yesterday" },
			{ id: "2", who: "b", name: "Sam", when: "Fri, Nov 13" },
		],
	},
};

/** Your partner's card. You can still say you did it. */
export const HeldByPartner: Story = {
	args: { holder: "b", deckKey: "pets", category: "care" },
};

/** Not dealt, and nobody has done it yet. */
export const Fresh: Story = {
	args: { holder: "none", daily: false, deckKey: "car", category: "out", log: [] },
};

/** No partner linked yet: only your own chip. */
export const NoPartner: Story = {
	args: { partnerLabel: null, log: [] },
};
