import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { AddCardForm, EMPTY_CARD } from "@/components/cards/add-card-form";

/**
 * The "Add a card" sheet body.
 *
 * Controlled, so these stories hand it a fixed value and a no-op `onChange`.
 * The sheet chrome around it is `BottomDrawer`'s.
 */
const meta = {
	title: "Cards/AddCardForm",
	component: AddCardForm,
	args: {
		value: EMPTY_CARD,
		onChange: () => {},
		onSubmit: () => {},
		onCancel: () => {},
		partnerLabel: "Sam",
	},
	decorators: [
		(Story) => (
			<View className="w-full max-w-md self-center rounded-sheet bg-surface p-5">
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof AddCardForm>;

export default meta;

type Story = StoryObj<typeof meta>;

/** How the sheet opens: nothing typed, so "Add card" is inert. */
export const Empty: Story = {};

/** Filled in and dealt to you. */
export const Filled: Story = {
	args: { value: { title: "Taxes", category: "out", daily: false, holder: "a" } },
};

/** A daily job dealt to your partner. */
export const DailyForPartner: Story = {
	args: { value: { title: "School run", category: "care", daily: true, holder: "b" } },
};

/** No partner linked yet: only your own chip under "Who holds it". */
export const NoPartner: Story = {
	args: { partnerLabel: null },
};

/** The write is in flight. */
export const Submitting: Story = {
	args: { value: { ...EMPTY_CARD, title: "Taxes" }, submitting: true },
};
