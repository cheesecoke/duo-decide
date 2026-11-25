import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import {
	QueueFilterBar,
	type QueueFilterBarProps,
} from "@/components/decision-queue/queue-filter-bar/queue-filter-bar";
import type { QueueFilter } from "@/lib/queue-filter";

/**
 * The Decision Queue's filter row: count chips (the fish in "Your turn", the
 * goose in "{Partner}'s turn"), a magnifier that opens search, and the
 * search kept as a pill once the keyboard folds away.
 */
const noop = () => {};

const base: QueueFilterBarProps = {
	counts: { all: 7, yours: 2, theirs: 1, decided: 4 },
	filter: "all",
	onFilterChange: noop,
	you: "Chase",
	partner: "Sam",
	query: "",
	onQueryChange: noop,
	searchOpen: false,
	onOpenSearch: noop,
	onCloseSearch: noop,
	onCancelSearch: noop,
};

const meta = {
	title: "Decision Queue/QueueFilterBar",
	component: QueueFilterBar,
	args: base,
	decorators: [
		(Story) => (
			<View className="w-full max-w-[786px] self-center bg-bg p-4">
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof QueueFilterBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NoneSelected: Story = {};

export const YourTurnSelected: Story = { args: { filter: "yours" } };

export const PartnerTurnSelected: Story = { args: { filter: "theirs" } };

export const DecidedSelected: Story = { args: { filter: "decided" } };

/** Nobody linked: the second chip says "Partner's turn" and has no goose. */
export const NoPartner: Story = { args: { partner: null } };

export const SearchOpen: Story = { args: { searchOpen: true, query: "bea" } };

/** The keyboard has gone: the search is a pill and the chips narrow it. */
export const SearchKept: Story = {
	args: { query: "beach", filter: "decided", counts: { all: 2, yours: 0, theirs: 1, decided: 1 } },
};

/** The whole flow, live. */
function InteractiveBar() {
	const [filter, setFilter] = React.useState<QueueFilter>("all");
	const [query, setQuery] = React.useState("");
	const [searchOpen, setSearchOpen] = React.useState(false);
	return (
		<QueueFilterBar
			{...base}
			filter={filter}
			onFilterChange={setFilter}
			query={query}
			onQueryChange={setQuery}
			searchOpen={searchOpen}
			onOpenSearch={() => setSearchOpen(true)}
			onCloseSearch={() => {
				setQuery((q) => q.trim());
				setSearchOpen(false);
			}}
			onCancelSearch={() => {
				setQuery("");
				setSearchOpen(false);
			}}
		/>
	);
}

export const Interactive: Story = {
	render: () => <InteractiveBar />,
};
