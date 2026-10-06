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
 * fields with an add circle, a done circle, and a trash button per row. Both
 * callers (the option-list card and the Create New List sheet) render it
 * inside something that already has a title, so the header line is `Body`
 * semibold rather than `Title`.
 *
 * Since tweak T4 the draft is seeded once on ✎ and owns itself from there:
 * the `options` arg can change underneath an open editor without disturbing
 * it, and `onOptionsUpdate` gets the *filled* rows on a ~600 ms debounce and
 * again on ✓. These stories are where that is visible — jest has no
 * NativeWind, so the hairlines and the row sizing are only real here.
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

/**
 * Typing a list without ever reaching for the mouse: ✎, then a row, Enter,
 * the next row. The new row lands directly after the one submitted.
 */
export const TypingWithEnter: Story = {
	args: { options: [] },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByLabelText("Edit options"));

		await userEvent.type(canvas.getByLabelText("Option 1"), "Tacos{enter}");
		await userEvent.type(canvas.getByLabelText("Option 2"), "Ramen{enter}");
		await userEvent.type(canvas.getByLabelText("Option 3"), "Sushi");
	},
};

/**
 * The + circle appends a blank row and leaves the editor open — it used to
 * write the blank straight to Supabase and bounce the user back to view mode
 * (tweak T4).
 */
export const AddingARow: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByLabelText("Edit options"));
		await userEvent.click(canvas.getByLabelText("Add option"));
	},
};

/** Per-row remove. The row goes, and its hairline goes with it. */
export const RemovingARow: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByLabelText("Edit options"));
		await userEvent.click(canvas.getByLabelText("Remove option 2"));
	},
};

/**
 * A blank row already in the data — every list that was edited before T4 has
 * some. View mode refuses to draw it, so there is no naked hairline.
 */
export const StoredBlanks: Story = {
	args: {
		options: [
			{ id: "o1", title: "Shrek" },
			{ id: "o2", title: "Pirate King" },
			{ id: "o3", title: "" },
			{ id: "o4", title: "" },
		],
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
