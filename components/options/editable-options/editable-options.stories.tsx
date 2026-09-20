import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { userEvent, within } from "storybook/test";

import {
	EditableOptions,
	type EditableOption,
} from "@/components/options/editable-options/editable-options";

/**
 * EditableOptions — FEATURE-INVENTORY §1.11's `EditableOptionsList`, rebuilt.
 *
 * Two modes in one component: a read-only list with a pencil, and a column of
 * fields with an add and a done circle. Both callers (the option-list card and
 * the Create New List sheet) render it inside something that already has a
 * title, so the header line is `Body` semibold rather than `Title`.
 */
const OPTIONS: EditableOption[] = [
	{ id: "o1", title: "Tacos" },
	{ id: "o2", title: "Ramen" },
	{ id: "o3", title: "Whatever is open" },
];

const meta = {
	title: "Options/EditableOptions",
	component: EditableOptions,
	args: {
		options: OPTIONS,
		onOptionsUpdate: () => {},
	},
	decorators: [
		(Story) => (
			<View className="w-full max-w-md self-center rounded-card bg-surface p-5">
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof EditableOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The card's empty face — §1.11's card copy. */
export const Empty: Story = {
	args: {
		options: [],
		emptyMessage: "No options in this list yet. Tap the edit button to add some!",
	},
};

/** The resting state: rows on hairlines, one pencil. */
export const WithOptions: Story = {};

/**
 * Edit mode. It is component state, not a prop, so the story presses the
 * pencil to get there — which is also the cheapest check that the two
 * header circles really do swap in.
 */
export const Editing: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByLabelText("Edit options"));
	},
};

/** `showValidation` — off everywhere today, and the reason it exists. */
export const Validation: Story = {
	args: { options: [{ id: "o1", title: "Tacos" }], showValidation: true, minOptions: 2 },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByLabelText("Edit options"));
	},
};
