import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { CreateListForm } from "@/components/options/create-list-form";

/**
 * The Create New List sheet body (FEATURE-INVENTORY §1.11).
 *
 * Controlled — the Options screen owns the draft and re-pushes this content
 * into the drawer on every change — so these stories hand it a fixed value
 * and a no-op `onChange`. The sheet chrome around it is `BottomDrawer`'s.
 */
const meta = {
	title: "Options/CreateListForm",
	component: CreateListForm,
	args: {
		value: { title: "", description: "", options: [] },
		onChange: () => {},
		onSubmit: () => {},
		onCancel: () => {},
	},
	decorators: [
		(Story) => (
			<View className="w-full max-w-md self-center rounded-sheet bg-surface p-5">
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof CreateListForm>;

export default meta;

type Story = StoryObj<typeof meta>;

/** How the sheet opens: nothing typed, so "Create List" is inert. */
export const Empty: Story = {};

/** A draft with rows already in it. */
export const Filled: Story = {
	args: {
		value: {
			title: "Dinner spots",
			description: "Places we keep coming back to",
			options: [
				{ id: "o1", title: "Tacos" },
				{ id: "o2", title: "Ramen" },
			],
		},
	},
};

/** The write is in flight: the button says so and takes no second press. */
export const Submitting: Story = {
	args: {
		value: { title: "Dinner spots", description: "", options: [] },
		submitting: true,
	},
};
