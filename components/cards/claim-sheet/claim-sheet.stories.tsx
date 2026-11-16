import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { ClaimSheet } from "@/components/cards/claim-sheet/claim-sheet";

/**
 * ClaimSheet: what a card asks of its holder, and the two of you to pick
 * from. Tap a person and the card is theirs.
 */
const meta = {
	title: "Cards/ClaimSheet",
	component: ClaimSheet,
	args: {
		category: "home",
		daily: true,
		deckKey: "groceries",
		about: "Knowing what's in the fridge, keeping the list, and getting the food into the house.",
		holder: "none",
		partnerLabel: "Sam",
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
} satisfies Meta<typeof ClaimSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Not dealt yet: both tiles say "Tap to give". Tap one to see the pick land. */
export const NotDealt: Story = {};

/** Yours: your tile says so, and the card can go back in the deck. */
export const Yours: Story = { args: { holder: "a" } };

/** Your partner's. */
export const Theirs: Story = { args: { holder: "b", deckKey: "pets", category: "care" } };

/** A card the couple wrote has no description. */
export const OwnCard: Story = {
	args: { deckKey: null, about: null, category: "out", daily: false },
};

/** No partner linked yet: only you to give it to. */
export const NoPartner: Story = { args: { partnerLabel: null } };
