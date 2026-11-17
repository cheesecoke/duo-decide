import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { DeckStrip } from "@/components/cards/deck-strip/deck-strip";
import { Button } from "@/components/ui/reusables/button/button";
import { Text } from "@/components/ui/reusables/text/text";

/**
 * DeckStrip: how many cards each of you holds. The stack pops and bursts when
 * a card lands on it.
 */
const meta = {
	title: "Cards/DeckStrip",
	component: DeckStrip,
	args: { you: 11, partner: 8, partnerLabel: "Sam" },
	decorators: [
		(Story) => (
			<View className="w-[390px] gap-4 self-center">
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof DeckStrip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A new deck: nothing dealt. */
export const Empty: Story = { args: { you: 0, partner: 0 } };

/** One card reads "card", not "cards". */
export const Singular: Story = { args: { you: 1, partner: 1 } };

/** No partner linked yet: one stack only. */
export const NoPartner: Story = { args: { partnerLabel: null } };

/** Press a button to land a card on a stack and see the pop and the burst. */
export const LandACard: Story = {
	render: function Landing(args) {
		const [you, setYou] = React.useState(2);
		const [partner, setPartner] = React.useState(3);
		return (
			<>
				<DeckStrip {...args} you={you} partner={partner} />
				<View className="flex-row gap-3">
					<Button className="h-12 flex-1 rounded-button" onPress={() => setYou((n) => n + 1)}>
						<Text className="text-cta-fg">Card to you</Text>
					</Button>
					<Button className="h-12 flex-1 rounded-button" onPress={() => setPartner((n) => n + 1)}>
						<Text className="text-cta-fg">Card to Sam</Text>
					</Button>
				</View>
			</>
		);
	},
};
