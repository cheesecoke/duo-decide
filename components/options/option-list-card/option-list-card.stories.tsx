import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { OptionListCard } from "@/components/options/option-list-card/option-list-card";

/**
 * OptionListCard — FEATURE-INVENTORY §1.11's `CollapsibleListCard`.
 *
 * Pure: the screen computes the two things the card cannot know — whose seat
 * it wears (its creator's) and whether this viewer may delete it. The rail and
 * wash come from `Card`, so a neutral card is one whose creator predates
 * `creator_id`.
 */
const LIST = {
	id: "l1",
	title: "Dinner spots",
	description: "Places we keep coming back to",
	options: [
		{ id: "o1", title: "Tacos" },
		{ id: "o2", title: "Ramen" },
		{ id: "o3", title: "Whatever is open" },
	],
	expanded: false,
};

const meta = {
	title: "Options/OptionListCard",
	component: OptionListCard,
	args: {
		list: LIST,
		state: "neutral",
		canDelete: false,
		onToggle: () => {},
		onDelete: () => {},
		onOptionsUpdate: () => {},
	},
	decorators: [
		(Story) => (
			<View className="w-full max-w-md gap-3 self-center">
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof OptionListCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Collapsed, no creator on record — the bare `line` rail. */
export const CollapsedNeutral: Story = {
	name: "Collapsed — neutral",
};

/** Collapsed, you made it. */
export const CollapsedA: Story = {
	name: "Collapsed — person A",
	args: { state: "a" },
};

/** Collapsed, your partner made it. */
export const CollapsedB: Story = {
	name: "Collapsed — person B",
	args: { state: "b", list: { ...LIST, title: "Sam's list" } },
};

/** Open, on somebody else's list: the repeater, no trash. */
export const Expanded: Story = {
	args: { state: "b", list: { ...LIST, expanded: true } },
};

/** Open, on your own: the trash circle in `destructive`, bottom right. */
export const ExpandedCanDelete: Story = {
	args: { state: "a", canDelete: true, list: { ...LIST, expanded: true } },
};

/** A list somebody made and never filled — the meta line and the empty copy. */
export const EmptyOptions: Story = {
	args: {
		state: "a",
		canDelete: true,
		list: { ...LIST, options: [], expanded: true },
	},
};

/** No description: the title sits straight on the meta line, no blank gap. */
export const NoDescription: Story = {
	args: { state: "a", list: { ...LIST, description: "" } },
};

/** The three seats side by side, which is how the tab actually reads. */
export const AllStates: Story = {
	render: () => (
		<>
			<OptionListCard
				list={{ ...LIST, title: "Dinner spots" }}
				state="a"
				canDelete
				onToggle={() => {}}
				onDelete={() => {}}
				onOptionsUpdate={() => {}}
			/>
			<OptionListCard
				list={{ ...LIST, title: "Date nights", description: "", options: [LIST.options[0]] }}
				state="b"
				canDelete={false}
				onToggle={() => {}}
				onDelete={() => {}}
				onOptionsUpdate={() => {}}
			/>
			<OptionListCard
				list={{ ...LIST, title: "Weekend plans", options: [] }}
				state="neutral"
				canDelete={false}
				onToggle={() => {}}
				onDelete={() => {}}
				onOptionsUpdate={() => {}}
			/>
		</>
	),
};
