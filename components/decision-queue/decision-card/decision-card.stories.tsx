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

/**
 * DecisionCard — the whole FEATURE-INVENTORY §1.10a state matrix, one state
 * per story.
 *
 * The card is pure, so every story is just a set of props. They are wrapped
 * in a small `Live` harness that keeps expand / select / edit in local state,
 * which makes the motion real: the chevron turns, the chip fill springs from
 * its centre, the CTA cross-fades to its new tone over `dur.base` and the
 * card's rail and wash slide between person colours without passing through
 * grey (tokens.md §8, §10).
 *
 * What to look for:
 *
 * - **The round thread.** On a poll card exactly four things carry the round's
 *   hue — the "Round N" label, the segment indicator, the selected chip and
 *   the lock-in end-cap. R1 is A, R2 is B, R3 is both. Compare `PollRound1`,
 *   `PollRound2` and `PollRound3`, and check nothing *else* moved colour.
 * - **One black element per card** (tokens.md §10 eye flow). Only a live
 *   `Decide` / `Submit Vote` button is black; every other CTA state is a tint
 *   or a grey.
 * - **Collapsed is quieter.** Title steps back to `ink-2` and the body is gone.
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
};

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

/** 1 — "Decided by {name}". */
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

/** The creator editing in place: the badge is gone, the pencil is a pair. */
export const Editing: Story = { args: { createdBy: YOU, editing: true } };

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
