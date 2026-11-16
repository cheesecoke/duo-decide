import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { BalanceStrip } from "@/components/cards/balance-strip/balance-strip";

/**
 * BalanceStrip: jobs each person marked done in the last seven days, and how
 * many cards each holds.
 */
const meta = {
	title: "Cards/BalanceStrip",
	component: BalanceStrip,
	args: {
		you: { done: 14, holding: 11 },
		partner: { done: 9, holding: 8 },
		partnerLabel: "Sam",
	},
	decorators: [
		(Story) => (
			<View className="w-[390px] self-center">
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof BalanceStrip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A new deck: nothing done, nothing dealt. */
export const Empty: Story = {
	args: { you: { done: 0, holding: 0 }, partner: { done: 0, holding: 0 } },
};

/** One card each reads "card", not "cards". */
export const Singular: Story = {
	args: { you: { done: 1, holding: 1 }, partner: { done: 1, holding: 1 } },
};

/** No partner linked yet: one side only. */
export const NoPartner: Story = {
	args: { partnerLabel: null },
};
