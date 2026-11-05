import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { ConfirmDelete } from "@/components/decision-queue/confirm-delete/confirm-delete";
import { Title } from "@/components/ui/reusables/headline/headline";

/**
 * ConfirmDelete — the body of the "Delete this decision?" sheet, on its own.
 * `Shell/BottomDrawer` shows it in the sheet's chrome; these are the copy
 * variants each screen hands it since migration 024 made delete a soft delete.
 */
const meta = {
	title: "Decision queue/ConfirmDelete",
	component: ConfirmDelete,
	args: { title: "Which couch", onCancel: () => {}, onConfirm: () => {} },
	decorators: [
		(Story) => (
			<View className="w-full max-w-md gap-4 self-center rounded-sheet bg-surface p-5">
				<Title>Delete this decision?</Title>
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof ConfirmDelete>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The default copy. */
export const Default: Story = {};

/** The queue, deleting an open decision. */
export const QueueOpenDecision: Story = {
	name: "Queue · open decision",
	args: {
		title: "Trip in March",
		message: "“Trip in March” is removed for both of you. This cannot be undone.",
	},
};

/** History's ⋮ → Delete. */
export const HistoryRow: Story = {
	name: "History · row",
	args: { title: "Dinner tonight", message: "It will be removed from your history." },
};
