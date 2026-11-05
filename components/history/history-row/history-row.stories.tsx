import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { HistoryRow } from "@/components/history/history-row/history-row";

/**
 * HistoryRow — FEATURE-INVENTORY §1.12's history item, on the v2 system.
 *
 * Always a `together` card (tokens.md §10: a completed decision is the pair's),
 * with the decider's own hue carried by the selected chip instead. The chip is
 * inert but not faded — it is the answer the card exists to give.
 */
const meta = {
	title: "History/HistoryRow",
	component: HistoryRow,
	args: {
		title: "Dinner tonight",
		chosenOption: "Tacos",
		decidedBy: "You",
		decidedBySeat: "a",
		decisionDate: "Today",
	},
	decorators: [
		(Story) => (
			<View className="w-full max-w-md gap-3 self-center">
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof HistoryRow>;

export default meta;

type Story = StoryObj<typeof meta>;

/** You ended it — the chip is person A. */
export const ByYou: Story = {
	name: "Decided by you",
};

/** Your partner ended it — the same row in seat B, under their name. */
export const ByPartner: Story = {
	name: "Decided by your partner",
	args: {
		title: "Saturday plans",
		chosenOption: "Farmers market",
		decidedBy: "Sam",
		decidedBySeat: "b",
		decisionDate: "3 days ago",
	},
};

/**
 * The wrapping case: a long title keeps the date on its first line, and a
 * long option wraps the "by …" caption under the chip rather than squeezing
 * it.
 */
export const LongTitle: Story = {
	name: "Long title and option",
	args: {
		title: "Where are we going for the long weekend in October, given the drive",
		chosenOption: "The cabin, if the road is open by then",
		decidedBy: "Sam",
		decidedBySeat: "b",
		decisionDate: "Sep 13, 2026",
	},
};

/**
 * A winning option that is a pasted link: the link reads as its hostname with
 * an external-link mark, and opens in a new tab. View at phone width (375 px).
 */
export const LongUrlOption: Story = {
	name: "Long URL option",
	args: {
		title: "Which therapist",
		chosenOption:
			"Alexa Sharf: https://www.psychologytoday.com/us/therapists/alexa-sharf-boulder-co/1234567",
		decidedBy: "Sam",
		decidedBySeat: "b",
		decisionDate: "Sep 13, 2026",
	},
};

/** A winning option that is a sentence wider than the card. */
export const LongTextOption: Story = {
	name: "Long multi-word option",
	args: {
		title: "Saturday",
		chosenOption:
			"Have a picnic - hike some where for lunch and eat by the creek, then nap in the shade",
		decidedBy: "You",
		decidedBySeat: "a",
		decisionDate: "Yesterday",
	},
};

/** Presses the row's ⋮ once mounted, so the story shows the menu open (web only). */
function OpenMenu({ children }: { children: React.ReactNode }) {
	React.useEffect(() => {
		const timer = setTimeout(() => {
			document.querySelector<HTMLElement>('[aria-label="More"]')?.click();
		}, 50);
		return () => clearTimeout(timer);
	}, []);
	return <>{children}</>;
}

/** With its ⋮ — what the History screen renders (migration 024). */
export const WithMenu: Story = {
	name: "With menu",
	args: { onDelete: () => {}, onMoveToQueue: () => {} },
};

/** A decision still on the queue: ⋮ → Delete only. */
export const MenuOpen: Story = {
	name: "Menu open · Delete",
	args: { onDelete: () => {}, onMoveToQueue: () => {} },
	decorators: [(Story) => <OpenMenu>{<Story />}</OpenMenu>],
};

/** Archived off the queue: ⋮ → Move back to queue, or Delete. */
export const ArchivedMenuOpen: Story = {
	name: "Menu open · archived",
	args: {
		title: "Saturday plans",
		chosenOption: "Farmers market",
		decidedBy: "Sam",
		decidedBySeat: "b",
		decisionDate: "3 days ago",
		archived: true,
		onDelete: () => {},
		onMoveToQueue: () => {},
	},
	decorators: [(Story) => <OpenMenu>{<Story />}</OpenMenu>],
};

/** Three in a column — what the screen actually shows. */
export const AColumn: Story = {
	name: "A column of them",
	render: () => (
		<>
			<HistoryRow
				title="Dinner tonight"
				chosenOption="Tacos"
				decidedBy="You"
				decidedBySeat="a"
				decisionDate="Today"
			/>
			<HistoryRow
				title="Saturday plans"
				chosenOption="Farmers market"
				decidedBy="Sam"
				decidedBySeat="b"
				decisionDate="Yesterday"
			/>
			<HistoryRow
				title="Which couch"
				chosenOption="The green one"
				decidedBy="You"
				decidedBySeat="a"
				decisionDate="Sep 13, 2026"
			/>
		</>
	),
};
