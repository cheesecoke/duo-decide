import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { DecisionCard } from "@/components/decision-queue/decision-card/decision-card";
import type {
	DecisionCardOption,
	DecisionCardProps,
	Person,
} from "@/components/decision-queue/decision-card/decision-card.model";
import { Caption } from "@/components/ui/reusables/headline/headline";
import type { CalendarAddView } from "@/lib/calendar-add-view";
import type { FollowUp } from "@/lib/follow-up";

/**
 * DecisionCard — the whole FEATURE-INVENTORY §1.10a state matrix, one state
 * per story.
 *
 * The card is pure, so every story is just a set of props. They are wrapped
 * in a small `Live` harness that keeps expand / select / edit in local state,
 * which makes the motion real: the chevron turns, the option rows take
 * presses, the CTA cross-fades to its new tone over `dur.base` and the
 * card's rail and wash slide between person colours without passing through
 * grey (tokens.md §8, §10).
 *
 * What to look for:
 *
 * - **The round thread.** On a poll card three things carry the round's hue —
 *   the "Round N" label, the segment indicator and the lock-in end-cap. R1 is
 *   A, R2 is B, R3 is both. Compare `PollRound1`, `PollRound2` and
 *   `PollRound3`, and check nothing *else* moved colour.
 * - **The option rows.** One square-cornered list, hairlines between rows and
 *   none after the last; text on the left, the mark on the far right. Empty
 *   ring = not picked, filled person-A circle with a tick = picked, and the
 *   winner of a decided card also takes person A's tint. The `Rows*` stories
 *   at the bottom run every state on a mix of short, long and link options.
 * - **One black element per card** (tokens.md §10 eye flow). Only a live
 *   `Decide` / `Submit Vote` button is black; every other CTA state is a tint
 *   or a grey.
 * - **Collapsed is quieter.** Title steps back to `ink-2` and the body is gone.
 * - **A decided card ends with one thing, or nothing.** The `Next*` stories:
 *   a single `together`-tinted pill with a leading glyph (never black), a
 *   calendar line with a seat-coloured mark, or no footer at all. Everything
 *   else is in ⋮.
 */

const YOU: Person = { name: "Chase", person: "a" };
const PARTNER: Person = { name: "Sam", person: "b" };

function options(selectedId?: string): DecisionCardOption[] {
	return [
		{ id: "o1", title: "Tacos", selected: selectedId === "o1" },
		{ id: "o2", title: "Ramen", selected: selectedId === "o2" },
		{ id: "o3", title: "That new pizza place", selected: selectedId === "o3" },
	];
}

const BASE: DecisionCardProps = {
	id: "d1",
	title: "Where are we eating Friday?",
	description: "Somewhere we have not been, and somewhere we can walk to.",
	mode: "vote",
	status: "pending",
	currentRound: 1,
	options: options(),
	deadline: new Date("2026-09-25T12:00:00Z"),
	createdBy: PARTNER,
	you: YOU,
	partner: PARTNER,
	decidedBy: null,
	youVotedThisRound: false,
	partnerVotedThisRound: false,
	expanded: true,
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

/**
 * Presses the card's ⋮ once it has mounted, so a story can show the menu
 * open. Storybook is web-only, so this reaches for the DOM; the component
 * itself has no "start open" prop to keep honest.
 */
function OpenMenu({ children }: { children: React.ReactNode }) {
	React.useEffect(() => {
		const timer = setTimeout(() => {
			document.querySelector<HTMLElement>('[aria-label="More"]')?.click();
		}, 50);
		return () => clearTimeout(timer);
	}, []);
	return <>{children}</>;
}

/**
 * Keeps the three things a real screen would own in local state, so the
 * stories are pressable. Every story's *starting* state still comes from its
 * args; this only reacts to the presses.
 */
function Live(props: DecisionCardProps) {
	const [expanded, setExpanded] = React.useState(props.expanded);
	const [editing, setEditing] = React.useState(props.editing);
	const [picked, setPicked] = React.useState(props.options);

	React.useEffect(() => setExpanded(props.expanded), [props.expanded]);
	React.useEffect(() => setEditing(props.editing), [props.editing]);
	React.useEffect(() => setPicked(props.options), [props.options]);

	return (
		<DecisionCard
			{...props}
			expanded={expanded}
			editing={editing}
			options={picked}
			onToggle={() => setExpanded((open) => !open)}
			onOptionSelect={(id) =>
				setPicked((current) => current.map((option) => ({ ...option, selected: option.id === id })))
			}
			onEdit={() => setEditing(true)}
			onCancelEdit={() => setEditing(false)}
			onSaveEdit={() => setEditing(false)}
		/>
	);
}

const meta = {
	title: "Decision queue/DecisionCard",
	component: DecisionCard,
	args: BASE,
	render: (args) => <Live {...args} />,
	decorators: [
		(Story) => (
			<View className="w-full max-w-md gap-4 self-center">
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof DecisionCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/* -------------------------------------------------------------------------- */
/* collapsed / expanded × vote / poll                                          */
/* -------------------------------------------------------------------------- */

export const VoteCollapsed: Story = { args: { expanded: false } };

export const VoteExpanded: Story = { args: {} };

export const PollCollapsed: Story = { args: { mode: "poll", expanded: false } };

export const PollExpanded: Story = { args: { mode: "poll" } };

/* -------------------------------------------------------------------------- */
/* the round thread, from both seats                                           */
/* -------------------------------------------------------------------------- */

/** Round 1 is person A's. You are A, so the card is in your hue. */
export const PollRound1: Story = { args: { mode: "poll", currentRound: 1 } };

/** Round 2 is person B's — the same card, the other hue. */
export const PollRound2: Story = { args: { mode: "poll", currentRound: 2 } };

/** Round 3 belongs to both: gradient rail, gradient wash, split end-cap. */
export const PollRound3: Story = { args: { mode: "poll", currentRound: 3 } };

/** The same three rounds from B's phone. The round's hue does not follow the viewer. */
const AS_B = { you: PARTNER, partner: YOU, createdBy: YOU } as const;

export const PollRound1AsPersonB: Story = { args: { mode: "poll", currentRound: 1, ...AS_B } };

export const PollRound2AsPersonB: Story = { args: { mode: "poll", currentRound: 2, ...AS_B } };

export const PollRound3AsPersonB: Story = { args: { mode: "poll", currentRound: 3, ...AS_B } };

/* -------------------------------------------------------------------------- */
/* the OTHER colour: whose card this is                                        */
/* -------------------------------------------------------------------------- */

/**
 * The card's own hue is the **person state**, not the round: nobody yet is
 * neutral, one of you is that person's hue, both of you is `together`. On a
 * poll card that runs underneath the round thread, which is why this one is
 * in person A's hue (you voted) while its round label, segments and end-cap
 * are all person B's (round 2).
 */
export const PersonStateVsRoundThread: Story = {
	args: { mode: "poll", currentRound: 2, youVotedThisRound: true },
};

/** A vote card you have voted on — your hue. */
export const VoteYouVoted: Story = {
	args: { status: "voted", options: options("o1") },
};

/**
 * A vote card **only the partner** has voted on. It wears *their* hue: in
 * vote mode `status: "voted"` with no selection of yours is their vote, not
 * yours, and this card used to be painted in the viewer's colour.
 */
export const VotePartnerVoted: Story = {
	args: { status: "voted" },
};

/** Both of you are in — the together gradient, in either mode. */
export const VoteBothVoted: Story = {
	args: { mode: "poll", youVotedThisRound: true, partnerVotedThisRound: true },
};

/* -------------------------------------------------------------------------- */
/* the CTA ladder — one story per case                                         */
/* -------------------------------------------------------------------------- */

/**
 * 1 — decided. There is no decide button any more: who decided is on the
 * header's meta line, and with no follow-up the card ends at its option rows.
 * The `Next*` stories at the bottom are everything the slot can hold instead.
 */
export const CtaDecided: Story = {
	args: { status: "completed", decidedBy: "Sam", options: options("o2") },
};

/** 2 — you voted and the round is still open. */
export const CtaWaitingForPartner: Story = {
	args: { status: "voted", options: options("o1") },
};

/** 3 — poll only: your vote for this round is in. */
export const CtaVoteSubmitted: Story = {
	args: { mode: "poll", youVotedThisRound: true },
};

/** 4 — round 3 is the partner's call alone. */
export const CtaCreatorBlocked: Story = {
	args: { mode: "poll", currentRound: 3, createdBy: YOU },
};

/** 5 — vote mode: the creator never votes on their own decision. */
export const CtaCreatorWait: Story = { args: { createdBy: YOU } };

/** 6 — the one black element on the card. */
export const CtaActive: Story = { args: { options: options("o1") } };

/** 6 — mid-flight. */
export const CtaSubmitting: Story = {
	args: { mode: "poll", options: options("o1"), submitting: true },
};

/** 7 — fewer than two options is not a decision. */
export const CtaNeedOptions: Story = {
	args: { options: [{ id: "o1", title: "Tacos", selected: false }] },
};

/** 7 — two options and nothing picked. */
export const CtaSelectOption: Story = { args: {} };

/* -------------------------------------------------------------------------- */
/* the six badges                                                              */
/* -------------------------------------------------------------------------- */

export const BadgeDecided: Story = {
	args: { status: "completed", decidedBy: "Sam", expanded: false },
};

export const BadgeRoundComplete: Story = {
	args: {
		mode: "poll",
		currentRound: 2,
		youVotedThisRound: true,
		partnerVotedThisRound: true,
		expanded: false,
	},
};

export const BadgeWaiting: Story = {
	args: { mode: "poll", youVotedThisRound: true, expanded: false },
};

export const BadgeRoundN: Story = { args: { mode: "poll", currentRound: 3, expanded: false } };

export const BadgeVote: Story = { args: { status: "voted", expanded: false } };

export const BadgePending: Story = { args: { expanded: false } };

/* -------------------------------------------------------------------------- */
/* options: none, one, many                                                    */
/* -------------------------------------------------------------------------- */

export const NoOptions: Story = { args: { options: [], createdBy: YOU } };

export const OneOptionVote: Story = {
	args: { options: [{ id: "o1", title: "Tacos", selected: false }] },
};

export const OneOptionPoll: Story = {
	args: { mode: "poll", options: [{ id: "o1", title: "Tacos", selected: false }] },
};

export const ManyOptions: Story = {
	args: {
		options: [
			...options("o2"),
			{ id: "o4", title: "The dumpling place", selected: false },
			{ id: "o5", title: "Leftovers, honestly", selected: false },
		],
	},
};

/* -------------------------------------------------------------------------- */
/* the rest of the matrix                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The creator editing in place: the badge is gone, the pencil is a pair, and
 * the form runs description → **deadline** → option rows, which is v1's order
 * (DecisionCardHeader.tsx:159-166). Press the "Decide by" slab and the app's
 * one calendar opens over the card — the same `DatePickerComponent` the create
 * sheet uses, with its own `PersonVarsBoundary`, so the selected day wears the
 * couple's hue and not sage.
 */
export const Editing: Story = { args: { createdBy: YOU, editing: true } };

/** The same form with nothing set — the deadline slab reads "Select deadline". */
export const EditingWithoutDeadline: Story = {
	args: { createdBy: YOU, editing: true, deadline: null },
};

/**
 * Editing a card that was collapsed. Starting an edit force-expands it
 * (FEATURE-INVENTORY §1.10a, CollapsibleCard.tsx:136-147), so this renders
 * identically to `Editing` — the full form under a full-strength header,
 * never a form under a collapsed one.
 */
export const EditingCollapsed: Story = {
	args: { createdBy: YOU, expanded: false, editing: true },
};

/** Nobody linked yet — the partner is the literal "Partner". */
export const PartnerMissing: Story = {
	args: { mode: "poll", partner: null, createdBy: YOU, currentRound: 1 },
};

export const CompletedVote: Story = {
	args: { status: "completed", decidedBy: "Sam", options: options("o2") },
};

export const CompletedPoll: Story = {
	args: {
		mode: "poll",
		currentRound: 3,
		status: "completed",
		decidedBy: "Sam",
		options: options("o3"),
		youVotedThisRound: true,
		partnerVotedThisRound: true,
	},
};

/* -------------------------------------------------------------------------- */
/* the ⋮ menu — archive a decided card, delete an open one (migration 024)    */
/* -------------------------------------------------------------------------- */

/**
 * A decided card's ⋮ has one row, **Archive**, for either partner: it leaves
 * the queue for both of you and stays in History. No delete here any more.
 */
export const MenuDecidedArchive: Story = {
	name: "Menu · decided → Archive",
	args: { status: "completed", decidedBy: "Sam", options: options("o2"), expanded: false },
	decorators: [(Story) => <OpenMenu>{<Story />}</OpenMenu>],
};

/** Same, on a card you created — the creator archives it the same way. */
export const MenuDecidedArchiveAsCreator: Story = {
	name: "Menu · decided, yours → Archive",
	args: {
		status: "completed",
		createdBy: YOU,
		decidedBy: "Sam",
		options: options("o1"),
		expanded: false,
	},
	decorators: [(Story) => <OpenMenu>{<Story />}</OpenMenu>],
};

/** An open card you created: ⋮ → **Delete decision** (a soft delete, confirmed first). */
export const MenuOpenDelete: Story = {
	name: "Menu · open, yours → Delete",
	args: { createdBy: YOU, expanded: false },
	decorators: [(Story) => <OpenMenu>{<Story />}</OpenMenu>],
};

/** An open card your partner created has no ⋮ at all. */
export const MenuNoneOpenPartners: Story = {
	name: "Menu · open, theirs → none",
	args: { expanded: false },
};

/** The inline strip (mock `.strip.err`), above the body and below the header. */
export const ErrorStrip: Story = {
	args: { mode: "poll", error: "Please select an option first" },
};

/* -------------------------------------------------------------------------- */
/* the matrix, in one frame                                                    */
/* -------------------------------------------------------------------------- */

const VOTE_COMBINATIONS = [
	{ label: "neither", you: false, partner: false },
	{ label: "you voted", you: true, partner: false },
	{ label: "partner voted", you: false, partner: true },
	{ label: "both voted", you: true, partner: true },
] as const;

/**
 * Rounds 1–3 against who has voted — the poll half of the §1.10a matrix on
 * one page, which is the only way to see the round thread hold its line while
 * the person state changes underneath it.
 */
export const Matrix: Story = {
	parameters: { controls: { disable: true } },
	render: () => (
		<View className="gap-6">
			{([1, 2, 3] as const).map((round) => (
				<View key={round} className="gap-3">
					<Caption>Round {round}</Caption>
					{VOTE_COMBINATIONS.map((combination) => (
						<View key={combination.label} className="gap-1.5">
							<Caption className="text-ink-3">{combination.label}</Caption>
							<DecisionCard
								{...BASE}
								mode="poll"
								currentRound={round}
								youVotedThisRound={combination.you}
								partnerVotedThisRound={combination.partner}
								status={combination.you && combination.partner ? "voted" : "pending"}
							/>
						</View>
					))}
				</View>
			))}
		</View>
	),
};

/* -------------------------------------------------------------------------- */
/* option rows: every state, on real-world options                             */
/* -------------------------------------------------------------------------- */

/**
 * Real option titles from the queue: a short one, plain sentences longer
 * than the card is wide, and pasted links. Every row wraps at the full width
 * of the card, and a link reads as its hostname plus ↗ — press it and it
 * opens in a new tab without selecting the row. View these at phone width
 * (375 px).
 */
function mixedOptions(selectedId?: string): DecisionCardOption[] {
	return [
		{
			id: "l1",
			title: "Hazel Patel: https://secure.helloalma.com/providers/hazel-patel-lmft-therapist-boulder/",
			selected: selectedId === "l1",
		},
		{
			id: "l2",
			title:
				"Alexa Sharf: https://www.psychologytoday.com/us/therapists/alexa-sharf-boulder-co/1234567",
			selected: selectedId === "l2",
		},
		{
			id: "l3",
			title: "Coffee/Boulder Creek Festival - recreate our date.",
			selected: selectedId === "l3",
		},
		{
			id: "l4",
			title: "Have a picnic - hike some where for lunch and eat by the creek, then nap in the shade",
			selected: selectedId === "l4",
		},
		{ id: "l5", title: "Tacos", selected: selectedId === "l5" },
	];
}

/** Rounds 2 and 3 only ever have the two options round 1 split on. */
function finalTwo(selectedId?: string): DecisionCardOption[] {
	return mixedOptions(selectedId).filter((option) => option.id === "l2" || option.id === "l4");
}

const MIXED = {
	title: "Pick a therapist, then plan the weekend",
	options: mixedOptions(),
} as const;

const POLL_DONE = {
	mode: "poll",
	currentRound: 3,
	status: "completed",
	decidedBy: "Sam",
	youVotedThisRound: true,
	partnerVotedThisRound: true,
} as const;

/** Voting: nothing picked yet, every row pressable. */
export const RowsVoting: Story = { args: { ...MIXED } };

/** A pick in hand, not yet submitted: the filled mark, and the live Decide. */
export const RowsSelected: Story = { args: { ...MIXED, options: mixedOptions("l1") } };

/** Voted and waiting: your pick keeps its mark, the rest step back. */
export const RowsVotedWaiting: Story = {
	args: { ...MIXED, status: "voted", options: mixedOptions("l4") },
};

/** Vote mode, your own decision: the creator waits, every row is inert. */
export const RowsCreatorWait: Story = { args: { ...MIXED, createdBy: YOU } };

/** Poll round 1, both of you to vote. */
export const RowsPollRound1: Story = {
	args: { ...MIXED, mode: "poll", currentRound: 1, options: mixedOptions("l3") },
};

/** Poll round 1, your vote is in: "Vote Submitted", rows inert. */
export const RowsPollVoteSubmitted: Story = {
	args: {
		...MIXED,
		mode: "poll",
		currentRound: 1,
		youVotedThisRound: true,
		options: mixedOptions("l2"),
	},
};

/** Poll round 2: the two options that survived round 1. */
export const RowsPollRound2: Story = {
	args: { ...MIXED, mode: "poll", currentRound: 2, options: finalTwo() },
};

/** Poll round 3, from the partner's seat: they decide. */
export const RowsPollRound3: Story = {
	args: { ...MIXED, mode: "poll", currentRound: 3, options: finalTwo("l2") },
};

/** Poll round 3, the creator sits out — rows inert, nothing picked. */
export const RowsPollRound3CreatorBlocked: Story = {
	args: { ...MIXED, mode: "poll", currentRound: 3, createdBy: YOU, options: finalTwo() },
};

/** Decided, vote mode — the winner is a link: tick, tint, and the link still opens. */
export const RowsDecidedVote: Story = {
	args: { ...MIXED, status: "completed", decidedBy: "Sam", options: mixedOptions("l2") },
};

/** Decided, poll mode — the winner is the long sentence. */
export const RowsDecidedPoll: Story = {
	args: { ...MIXED, ...POLL_DONE, options: finalTwo("l4") },
};

/** The four states side by side, for review. */
export const RowsOverview: Story = {
	parameters: { controls: { disable: true } },
	render: () => (
		<View className="gap-6">
			{(
				[
					["Voting", { ...BASE, ...MIXED }],
					["Selected", { ...BASE, ...MIXED, options: mixedOptions("l1") }],
					[
						"Decided — vote",
						{ ...BASE, ...MIXED, status: "completed", decidedBy: "Sam", options: mixedOptions("l2") },
					],
					["Decided — poll", { ...BASE, ...MIXED, ...POLL_DONE, options: finalTwo("l4") }],
				] as const
			).map(([label, card]) => (
				<View key={label} className="gap-1.5">
					<Caption>{label}</Caption>
					<DecisionCard {...card} />
				</View>
			))}
		</View>
	),
};

/* -------------------------------------------------------------------------- */
/* the decided card's next action — one story per footer state                 */
/* -------------------------------------------------------------------------- */

/**
 * A fixed clock, so "Sat, Dec 12" has no year in it whenever this is opened.
 * (`NextCalendarNextYear` is the story with one.)
 */
const NOW = new Date(2026, 10, 19, 9, 0);

const WHEN: NonNullable<FollowUp["when"]> = {
	date: "2026-12-12",
	time: null,
	matchedText: "Dec 12",
	relative: false,
	source: "parsed",
	foundIn: "title",
};

function followUp(over: Partial<FollowUp> = {}): FollowUp {
	return {
		suggested: null,
		signal: "none",
		when: null,
		datePast: false,
		link: null,
		isYesNo: false,
		negativeWon: false,
		available: ["calendar"],
		...over,
	};
}

const DATED = followUp({ suggested: "calendar", signal: "parsed_date", when: WHEN });

const AT = "2026-11-19T15:00:00Z";
const MINE_OPENED: CalendarAddView = {
	kind: "mine-opened",
	openedAt: AT,
	method: "google_link",
	changed: false,
};
const MINE_ADDED: CalendarAddView = {
	kind: "mine-added",
	addedAt: AT,
	method: "google_link",
	confirmed: true,
	changed: false,
};
const PARTNER_ADDED: CalendarAddView = {
	kind: "partner-added",
	addedAt: AT,
	method: "google_link",
	confirmed: true,
	changed: false,
};

const YES_NO: DecisionCardOption[] = [
	{ id: "y", title: "Yes", selected: true },
	{ id: "n", title: "No", selected: false },
];

/** Steph asked, Chase said yes — the decision that started this. */
const NUTCRACKER = {
	title: "Want to join me at the Nutcracker on Dec 12?",
	description: "Saturday matinee. I can get the tickets if you are in.",
	status: "completed",
	decidedBy: "Chase",
	options: YES_NO,
	now: NOW,
	followUp: DATED,
} satisfies Partial<DecisionCardProps>;

/** Nothing detected: no footer at all. ⋮ still has Add to calendar. */
export const NextNothing: Story = {
	name: "Next · nothing (no footer)",
	args: {
		status: "completed",
		decidedBy: "Sam",
		options: options("o2"),
		now: NOW,
		followUp: followUp(),
	},
};

/** A future date: the one pill. `together` tint, calendar glyph, dips when pressed. */
export const NextAddToCalendar: Story = {
	name: "Next · pill · Add to calendar",
	args: { ...NUTCRACKER },
};

/** The year is in the label only when it is not this one. */
export const NextCalendarNextYear: Story = {
	name: "Next · pill · Add to calendar, next year",
	args: {
		...NUTCRACKER,
		title: "Ski weekend on Jan 8?",
		followUp: { ...DATED, when: { ...WHEN, date: "2027-01-08", matchedText: "Jan 8" } },
	},
};

/** A link in the winning option. */
export const NextOpenLink: Story = {
	name: "Next · pill · Open link",
	args: {
		title: "Which therapist?",
		description: "Three I found that take our insurance.",
		status: "completed",
		decidedBy: "Sam",
		now: NOW,
		options: [
			{
				id: "t1",
				title: "Alexa Sharf: https://www.psychologytoday.com/us/therapists/alexa-sharf",
				selected: true,
			},
			{ id: "t2", title: "Someone from the list Dana sent", selected: false },
		],
		followUp: followUp({
			suggested: "open_link",
			signal: "url",
			link: "https://www.psychologytoday.com/us/therapists/alexa-sharf",
			available: ["calendar", "open_link"],
		}),
	},
};

/** Yes on a yes/no with no date and no link. */
export const NextDecideNext: Story = {
	name: "Next · pill · Decide the next thing",
	args: {
		title: "Should we get a dog?",
		description: "For real this time.",
		status: "completed",
		decidedBy: "Chase",
		now: NOW,
		options: YES_NO,
		followUp: followUp({
			suggested: "decide_next",
			signal: "yes_shape",
			isYesNo: true,
			available: ["calendar", "decide_next"],
		}),
	},
};

/** A "no" won: the date was seen and nothing is offered. */
export const NextNoWon: Story = {
	name: "Next · a no won (no footer)",
	args: {
		...NUTCRACKER,
		options: [
			{ id: "y", title: "Yes", selected: false },
			{ id: "n", title: "No", selected: true },
		],
		followUp: followUp({ signal: "parsed_date", when: WHEN, isYesNo: true, negativeWon: true }),
	},
};

/** I handed off to Google and have not said whether it saved. A ring, not a tick. */
export const NextDidItSave: Story = {
	name: "Next · line · Did it save?",
	args: { ...NUTCRACKER, calendar: MINE_OPENED },
};

/** The partner handed off under ten minutes ago: their ring, and no pill. */
export const NextPartnerAdding: Story = {
	name: "Next · line · partner is adding",
	args: {
		...NUTCRACKER,
		calendar: {
			kind: "partner-opening",
			openedAt: AT,
			staleAt: Date.parse(AT) + 600_000,
			method: "google_link",
			changed: false,
		},
	},
};

/** …and longer ago than that. The button is back, as if nobody had started. */
export const NextPartnerStarted: Story = {
	name: "Next · pill · partner started, then went quiet",
	args: {
		...NUTCRACKER,
		calendar: { kind: "partner-started", openedAt: AT, method: "google_link", changed: false },
	},
};

/** Seat A's tick. ⋮ gains "Mark as not added". */
export const NextYouAdded: Story = {
	name: "Next · line · you added it",
	args: { ...NUTCRACKER, calendar: MINE_ADDED },
};

/** Seat B's tick, and no add pill. ⋮ gains "Add to my calendar too". */
export const NextPartnerAdded: Story = {
	name: "Next · line · partner added it",
	args: { ...NUTCRACKER, calendar: PARTNER_ADDED },
};

/** Both ticks. */
export const NextBothAdded: Story = {
	name: "Next · line · both added it",
	args: {
		...NUTCRACKER,
		calendar: {
			kind: "both-added",
			addedAt: AT,
			partnerAddedAt: AT,
			method: "google_link",
			partnerMethod: "google_link",
			confirmed: true,
			changed: false,
		},
	},
};

/** The row's owner has no name any more (nobody linked, or a deleted account). */
export const NextPartnerAddedUnnamed: Story = {
	name: "Next · line · partner added it, no name",
	args: {
		...NUTCRACKER,
		partner: null,
		createdBy: { name: "Partner", person: "b" },
		calendar: PARTNER_ADDED,
	},
};

/** The decision moved to the 13th after it was added: a caption over "Add again". */
export const NextChanged: Story = {
	name: "Next · changed since it was added",
	args: {
		...NUTCRACKER,
		title: "Want to join me at the Nutcracker on Dec 13?",
		followUp: { ...DATED, when: { ...WHEN, date: "2026-12-13", matchedText: "Dec 13" } },
		calendar: { ...MINE_ADDED, changed: true },
	},
};

/** Collapsed: no footer, and "Decided by Chase" on the header line. */
export const NextCollapsed: Story = {
	name: "Next · collapsed",
	args: { ...NUTCRACKER, expanded: false },
};

/** ⋮ when nothing was detected: Add to calendar is the fallback, Archive is last. */
export const NextMenuFallback: Story = {
	name: "Next · menu · nothing detected",
	args: {
		status: "completed",
		decidedBy: "Sam",
		options: options("o2"),
		now: NOW,
		followUp: followUp(),
		expanded: false,
	},
	decorators: [(Story) => <OpenMenu>{<Story />}</OpenMenu>],
};

/** ⋮ once I have added it: Mark as not added, then Archive. */
export const NextMenuAdded: Story = {
	name: "Next · menu · you added it",
	args: { ...NUTCRACKER, calendar: MINE_ADDED },
	decorators: [(Story) => <OpenMenu>{<Story />}</OpenMenu>],
};

/**
 * The slot changing hands, pressable: the pill → "Did it save?" → your tick,
 * and ⋮ → "Mark as not added" back to the pill. This is the story for the
 * motion — the pill and the line cross-fade over `dur.base`, the mark scales
 * in — and for checking that the card's height moves once per change.
 */
function NextFlowDemo(args: DecisionCardProps) {
	const [calendar, setCalendar] = React.useState<CalendarAddView>({ kind: "none", changed: false });

	return (
		<Live
			{...args}
			calendar={calendar}
			onFollowUp={(action) => {
				if (action === "calendar") setCalendar(MINE_OPENED);
			}}
			onCalendarAnswer={(answer) =>
				setCalendar(answer === "yes" ? MINE_ADDED : { kind: "none", changed: false })
			}
			onCalendarRemove={() => setCalendar({ kind: "none", changed: false })}
		/>
	);
}

export const NextFlow: Story = {
	name: "Next · the flow (press through it)",
	args: { ...NUTCRACKER },
	render: (args) => <NextFlowDemo {...args} />,
};
