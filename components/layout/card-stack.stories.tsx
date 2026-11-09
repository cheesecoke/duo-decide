import * as React from "react";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { DecisionCard } from "@/components/decision-queue/decision-card/decision-card";
import type {
	DecisionCardProps,
	Person,
} from "@/components/decision-queue/decision-card/decision-card.model";
import { LeaveOut } from "@/components/decision-queue/leave-out/leave-out";
import { HistoryRow, type HistoryRowProps } from "@/components/history/history-row/history-row";
import { ResponsiveCardList } from "@/components/layout/ResponsiveCardList";
import { StaggerIn } from "@/components/layout/stagger-in";

/**
 * Card stack — the queue's and History's lists exactly as the screens compose
 * them: `ResponsiveCardList` → `StaggerIn` (→ `LeaveOut`) → card, with **no**
 * `gap` on any parent. The component stories each sit in a `gap-3`/`gap-4`
 * decorator, which is why they always showed a gap; the gap the app actually
 * has is the `StaggerIn` cell's margin, and this is the only place it is on
 * screen by itself.
 *
 * What to look for:
 *
 * - **The gap.** 12 pt between every pair of cards, the same above and below
 *   the open one.
 * - **The shadow.** Soft, warm and low — the white cards lift off the cream
 *   page without a hard edge (theme/shadows.ts `card`).
 * - **Open and close.** `Toggling` opens and closes the second card on a
 *   loop; the cards below it ride the height and the gap never closes.
 */

const YOU: Person = { name: "Chase", person: "a" };
const PARTNER: Person = { name: "Sam", person: "b" };

const CARD: DecisionCardProps = {
	id: "d1",
	title: "Where are we eating Friday?",
	description: "Somewhere we have not been, and somewhere we can walk to.",
	mode: "vote",
	status: "pending",
	currentRound: 1,
	options: [
		{ id: "o1", title: "Tacos", selected: false },
		{ id: "o2", title: "Ramen", selected: false },
		{ id: "o3", title: "That new pizza place", selected: false },
	],
	deadline: new Date("2026-09-25T12:00:00Z"),
	createdBy: PARTNER,
	you: YOU,
	partner: PARTNER,
	decidedBy: null,
	youVotedThisRound: false,
	partnerVotedThisRound: false,
	expanded: false,
	editing: false,
	submitting: false,
	error: null,
	onToggle: () => {},
	onOptionSelect: () => {},
	onDecide: () => {},
	onEdit: () => {},
	onCancelEdit: () => {},
	onSaveEdit: () => {},
	onDelete: () => {},
	onArchive: () => {},
};

const QUEUE: DecisionCardProps[] = [
	{ ...CARD, id: "q1", title: "Movie tonight?", createdBy: YOU },
	{ ...CARD, id: "q2" },
	{ ...CARD, id: "q3", title: "Weekend away in October", mode: "poll", createdBy: YOU },
	{ ...CARD, id: "q4", title: "New couch colour" },
];

const HISTORY: HistoryRowProps[] = [
	{
		title: "Dinner tonight",
		chosenOption: "Tacos",
		decidedBy: "You",
		decidedBySeat: "a",
		decisionDate: "Today",
	},
	{
		title: "Which weekend do we visit your parents?",
		chosenOption: "The one after Thanksgiving, so we can drive up on the Friday",
		decidedBy: "Sam",
		decidedBySeat: "b",
		decisionDate: "3 days ago",
	},
	{
		title: "Saturday plans",
		chosenOption: "Farmers market",
		decidedBy: "Sam",
		decidedBySeat: "b",
		decisionDate: "Sep 13, 2026",
	},
	{
		title: "Movie night",
		chosenOption: "Dune",
		decidedBy: "You",
		decidedBySeat: "a",
		decisionDate: "Sep 2, 2026",
		archived: true,
	},
];

type QueueStackProps = {
	/** Which card starts open, by index. -1 for none. */
	openIndex: number;
	/**
	 * Toggle the second card every this many ms (0 = never). Lets a story, or
	 * a screenshot at a chosen virtual time, catch a card mid-open/-close.
	 */
	toggleEvery: number;
};

function QueueStack({ openIndex, toggleEvery }: QueueStackProps) {
	const [open, setOpen] = React.useState(openIndex);

	React.useEffect(() => setOpen(openIndex), [openIndex]);
	React.useEffect(() => {
		if (!toggleEvery) return;
		const timer = setInterval(() => setOpen((current) => (current === 1 ? -1 : 1)), toggleEvery);
		return () => clearInterval(timer);
	}, [toggleEvery]);

	return (
		<ResponsiveCardList>
			{QUEUE.map((card, index) => (
				<StaggerIn key={card.id} index={index}>
					<LeaveOut leaving={false} onLeft={() => {}}>
						<DecisionCard
							{...card}
							expanded={open === index}
							onToggle={() => setOpen((current) => (current === index ? -1 : index))}
						/>
					</LeaveOut>
				</StaggerIn>
			))}
		</ResponsiveCardList>
	);
}

function HistoryStack() {
	return (
		<>
			{HISTORY.map((row, index) => (
				<StaggerIn key={row.title} index={index}>
					<HistoryRow {...row} onDelete={() => {}} onMoveToQueue={() => {}} />
				</StaggerIn>
			))}
		</>
	);
}

const meta = {
	title: "Layout/Card stack",
	component: QueueStack,
	args: { openIndex: 1, toggleEvery: 0 },
} satisfies Meta<typeof QueueStack>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The queue: three collapsed cards and one open, as the screen stacks them. */
export const Queue: Story = {};

/** The queue with every card collapsed. */
export const QueueCollapsed: Story = { name: "Queue, all collapsed", args: { openIndex: -1 } };

/**
 * The second card opens and closes every 1.2 s, forever. Watch the gap under
 * it while it moves.
 */
export const Toggling: Story = { args: { openIndex: -1, toggleEvery: 1200 } };

/**
 * History's "Recent decisions": rows don't expand, so the stack mixes a
 * one-line row with a two-line title and a wrapped winner to vary heights.
 */
export const History: Story = { render: () => <HistoryStack /> };
