/**
 * decision-card.model.ts — the decision card's props and its state machine.
 *
 * Everything the card *decides* lives here as a pure function, so the whole
 * FEATURE-INVENTORY §1.10a matrix is assertable without rendering: the 7-case
 * CTA ladder, the 6 status badges, the round colour, when options go dead, and
 * the two voter marks (including the privacy rule).
 *
 * Copy is verbatim from FEATURE-INVENTORY §1.10a. Where the round-3 mock
 * (design-refs/mocks/decision-queue-round-3.html) writes a friendlier label —
 * "Lock my vote", "Sam decides this round", "Select an option" — the
 * inventory wins, per the PLAN-3 task-6 brief. The mock's *colours* are
 * followed, because the inventory's palette (yellow / green / round1-3
 * purple) does not exist in the v2 token set.
 */

export type Person = { name: string; person: "a" | "b" };

export type DecisionCardOption = { id: string; title: string; selected: boolean };

export type DecisionMode = "vote" | "poll";
export type DecisionStatus = "pending" | "voted" | "completed";
export type DecisionRound = 1 | 2 | 3;

/** What `onSaveEdit` is handed when the creator confirms an inline edit. */
export type DecisionEditDraft = {
	title: string;
	description: string;
	deadline: Date | null;
	options: string[];
};

export type DecisionCardProps = {
	id: string;
	title: string;
	/** `UIDecision.details`. */
	description: string;
	mode: DecisionMode;
	status: DecisionStatus;
	/** Poll only; vote mode ignores it. */
	currentRound: DecisionRound;
	/** 0, 1, or 2+ — all three renders exist. */
	options: DecisionCardOption[];
	/** `null` → "No deadline". */
	deadline: Date | null;
	createdBy: Person;
	/** The viewer. */
	you: Person;
	/** `null` → the name falls back to the literal "Partner", person "b". */
	partner: Person | null;
	/** Completed only. */
	decidedBy: string | null;
	youVotedThisRound: boolean;
	partnerVotedThisRound: boolean;
	expanded: boolean;
	editing: boolean;
	submitting: boolean;
	/** Inline strip above the body (mock `.strip`). */
	error?: string | null;
	onToggle(): void;
	onOptionSelect(optionId: string): void;
	onDecide(): void;
	onEdit(): void;
	onCancelEdit(): void;
	onSaveEdit(draft: DecisionEditDraft): void;
	/** The card only calls it; confirmation is the screen's job. */
	onDelete(): void;
};

/**
 * The slice of the props every helper below reads. Pulled out so a table row
 * in the tests is a dozen fields rather than the full component contract.
 */
export type DecisionCardState = Pick<
	DecisionCardProps,
	| "mode"
	| "status"
	| "currentRound"
	| "options"
	| "createdBy"
	| "you"
	| "partner"
	| "decidedBy"
	| "youVotedThisRound"
	| "partnerVotedThisRound"
	| "submitting"
>;

/**
 * FEATURE-INVENTORY §1.10a: with nobody linked the app shows the literal
 * "Partner". Person "b" because the viewer is always drawn as their own hue
 * and the other seat is the other hue.
 */
export const PARTNER_FALLBACK: Person = { name: "Partner", person: "b" };

/** Every verbatim string the card renders that is not a helper's own label. */
export const COPY = {
	/** OptionsDisplay.tsx:42-44 — zero options, either mode. */
	emptyOptions: "Please add options",
	/** OptionsDisplay.tsx:47-68 — exactly one option. */
	validateVote: "Add more than one option",
	validatePoll: "Add at least 2 options to avoid bias",
	/** DecisionCardHeader.tsx:141-152 — a null deadline. */
	noDeadline: "No deadline",
	createdBy: (name: string) => `Created by ${name}`,
	/** CollapsibleCard.tsx:228-277 — the poll body's heading. */
	round: (round: DecisionRound) => `Round ${round}`,
	/**
	 * The voter line. VotingStatusIndicator renders "{name}:" plus an icon;
	 * a `Character`'s pose is not in its accessible label, so the state has
	 * to be said in words too. The three words are the round-3 mock's
	 * (`voterHTML`): "voted", "waiting", "sitting out".
	 */
	voter: (name: string, mark: VoterMark) => `${name}: ${VOTER_WORD[mark]}`,
} as const;

/**
 * "selected" says the same word as "idle" on purpose: the difference is that
 * you have a pick in flight, not that you have acted, and the mock draws that
 * distinction in colour (a muted character vs. a coloured one) rather than in
 * copy. Saying "selected" out loud would also be the one place the card could
 * leak a pick, if the partner line ever grew one.
 */
const VOTER_WORD: Record<VoterMark, string> = {
	voted: "voted",
	blocked: "sitting out",
	selected: "waiting",
	idle: "waiting",
};

/* -------------------------------------------------------------------------- */
/* predicates                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * CollapsibleCard.tsx:91 — the app compares *names*, not ids, and that is
 * kept as-is. It is wrong for two people who share a first name, but it is
 * the behaviour today and Task 7 owns where the props come from.
 */
export function isCreator(p: Pick<DecisionCardState, "createdBy" | "you">): boolean {
	return p.createdBy.name === p.you.name;
}

/** The partner, or the "Partner" stand-in when nobody is linked. */
export function partnerOf(p: Pick<DecisionCardState, "partner">): Person {
	return p.partner ?? PARTNER_FALLBACK;
}

/**
 * Whether *you* have cast a vote that counts right now.
 *
 * Poll mode has a per-round ledger, so it is `youVotedThisRound`
 * (CollapsibleCard.tsx:95). Vote mode has none: DecisionDecideButton.tsx:63
 * reads a selected option as "you voted", because in vote mode the creator
 * cannot select and the partner's selection *is* the vote.
 */
export function hasYouVoted(
	p: Pick<DecisionCardState, "mode" | "options" | "youVotedThisRound">,
): boolean {
	return p.mode === "vote" ? p.options.some((option) => option.selected) : p.youVotedThisRound;
}

/** CollapsibleCard.tsx:101-107, unchanged. */
export function canDecide(p: DecisionCardState): boolean {
	const hasSelectedOption = p.options.some((option) => option.selected);
	const hasMinimumOptions = p.options.length >= 2;
	const votedThisRound = p.mode === "poll" && p.youVotedThisRound;

	return (
		hasSelectedOption &&
		hasMinimumOptions &&
		!votedThisRound &&
		(p.mode === "vote" ? !isCreator(p) && (p.status === "pending" || p.status === "voted") : true)
	);
}

/* -------------------------------------------------------------------------- */
/* round colour                                                                */
/* -------------------------------------------------------------------------- */

export type RoundTone = "a" | "b" | "together" | "neutral";

/**
 * The one colour a card is wearing (tokens.md §10).
 *
 * Poll: each round owns a hue, alternating the two people — R1 = A, R2 = B,
 * R3 = both. Vote: there are no rounds, so the card wears the person state.
 * Completed is `together` in both modes: the decision is now a shared object.
 *
 * `you` is a 4th argument the brief's signature does not have, and it is
 * optional so `resolveRoundTone(mode, round, status)` still type-checks. It
 * has to exist: "vote mode → `you` when you voted" cannot be answered without
 * knowing which hue the viewer is. Noted as a spec amendment in the report.
 */
export function resolveRoundTone(
	mode: DecisionMode,
	round: DecisionRound,
	status: DecisionStatus,
	you: "a" | "b" = "a",
): RoundTone {
	if (status === "completed") return "together";
	if (mode === "vote") return status === "voted" ? you : "neutral";
	if (round === 1) return "a";
	if (round === 2) return "b";
	return "together";
}

/* -------------------------------------------------------------------------- */
/* the CTA ladder                                                              */
/* -------------------------------------------------------------------------- */

export type CtaKind =
	| "decided"
	| "waiting-partner"
	| "vote-submitted"
	| "creator-blocked"
	| "creator-wait"
	| "active"
	| "need-options"
	| "select-option";

/** `cta` is the black pill — tokens.md §10 allows exactly one per card. */
export type CtaTone = "a" | "b" | "together" | "cta" | "muted";

export type Cta = { kind: CtaKind; label: string; disabled: boolean; tone: CtaTone };

/**
 * The colour the round thread hands the CTA's end-cap and, for the disabled
 * "you already acted" states, its whole fill. Poll follows the round; vote
 * follows the viewer, because a vote-mode card has no round to follow.
 */
function ctaRoundTone(p: Pick<DecisionCardState, "mode" | "currentRound" | "you">): CtaTone {
	if (p.mode === "vote") return p.you.person;
	if (p.currentRound === 1) return "a";
	if (p.currentRound === 2) return "b";
	return "together";
}

/**
 * DecisionDecideButton.tsx's state machine, in its order (the inventory's
 * seven rows; row 7 splits into two kinds because its two labels have
 * different causes).
 *
 * "Submitting…" is row 6's label rather than a row of its own — the button is
 * the *active* one, mid-flight — which is why it also carries `disabled`, the
 * way `disabled={loading}` did at DecisionDecideButton.tsx:139.
 */
export function resolveCta(p: DecisionCardState): Cta {
	// 1 — already decided.
	if (p.status === "completed") {
		return {
			kind: "decided",
			label: `Decided by ${p.decidedBy ?? PARTNER_FALLBACK.name}`,
			disabled: true,
			tone: "together",
		};
	}

	// 2 — you voted, the round is still open.
	if (p.status === "voted" && hasYouVoted(p)) {
		return {
			kind: "waiting-partner",
			label: "Waiting for partner",
			disabled: true,
			tone: ctaRoundTone(p),
		};
	}

	// 3 — poll only: your vote for this round is in.
	if (p.mode === "poll" && p.youVotedThisRound) {
		return { kind: "vote-submitted", label: "Vote Submitted", disabled: true, tone: ctaRoundTone(p) };
	}

	// 4 — poll round 3 is the partner's call alone, so the creator sits out.
	if (p.mode === "poll" && p.currentRound === 3 && isCreator(p)) {
		return { kind: "creator-blocked", label: "Creator Blocked", disabled: true, tone: "together" };
	}

	// 5 — vote mode: the creator never votes on their own decision.
	if (p.mode === "vote" && isCreator(p)) {
		return {
			kind: "creator-wait",
			label: "Wait for partner to vote",
			disabled: true,
			tone: "muted",
		};
	}

	// 6 — the live button.
	if (canDecide(p)) {
		const label = p.submitting ? "Submitting…" : p.mode === "poll" ? "Submit Vote" : "Decide";
		return { kind: "active", label, disabled: p.submitting, tone: "cta" };
	}

	// 7 — not ready: say which of the two things is missing.
	return p.options.length < 2
		? { kind: "need-options", label: "Need 2+ options", disabled: true, tone: "muted" }
		: { kind: "select-option", label: "Select option", disabled: true, tone: "muted" };
}

/* -------------------------------------------------------------------------- */
/* the status badge                                                            */
/* -------------------------------------------------------------------------- */

export type BadgeTone = "a" | "b" | "together" | "neutral";

export type Badge = { label: string; tone: BadgeTone };

/**
 * DecisionStatusBadge.tsx:26-68 — six labels.
 *
 * The badge does *not* take the round colour: tokens.md §10 lists the round
 * thread as "round label → segment indicator → selected option-chip fill →
 * lock-in button end-cap. Nothing else on the card takes it." So the badge
 * wears the person state instead, exactly as the round-3 mock's `badge()`
 * does — together once both have voted, the viewer's hue while only they
 * have, neutral otherwise.
 */
export function resolveBadge(p: DecisionCardState): Badge {
	if (p.status === "completed") return { label: "Decided", tone: "together" };

	if (p.mode === "poll") {
		if (p.youVotedThisRound && p.partnerVotedThisRound) {
			return { label: `Round ${p.currentRound} Complete`, tone: "together" };
		}
		if (p.youVotedThisRound) return { label: "Waiting", tone: p.you.person };
		return { label: `Round ${p.currentRound}`, tone: "neutral" };
	}

	if (p.status === "voted") return { label: "Vote", tone: p.you.person };
	return { label: "Pending", tone: "neutral" };
}

/* -------------------------------------------------------------------------- */
/* options and voters                                                          */
/* -------------------------------------------------------------------------- */

/**
 * CollapsibleCard.tsx:268-272 and :301 — when the option chips go dead.
 *
 * Vote mode: the creator physically cannot pick, and a completed decision is
 * frozen. Poll mode: once your vote for this round is in it cannot be
 * changed, round 3 is the partner's alone, and completed is frozen.
 */
export function optionsDisabled(p: DecisionCardState): boolean {
	if (p.status === "completed") return true;
	if (p.mode === "vote") return isCreator(p);
	return p.youVotedThisRound || (p.currentRound === 3 && isCreator(p));
}

export type VoterMark = "blocked" | "voted" | "selected" | "idle";

/**
 * VotingStatusIndicator.tsx:31-55 — what to draw beside each person's name.
 *
 * **Privacy** (VotingStatusIndicator's `hasSelectedOption={false}` at
 * CollapsibleCard.tsx:254): the partner can never be "selected". You see that
 * they have voted or that they have not; you never see a pick forming.
 *
 * Checked in the indicator's own order, so a blocked creator reads as blocked
 * even on a completed decision — the inventory keeps the cross there and only
 * changes its colour.
 */
export function voterMark(p: DecisionCardState, who: "you" | "partner"): VoterMark {
	const theyAreTheCreator = who === "you" ? isCreator(p) : !isCreator(p);

	if (p.mode === "poll" && p.currentRound === 3 && theyAreTheCreator) return "blocked";

	if (who === "partner") return p.partnerVotedThisRound ? "voted" : "idle";

	if (hasYouVoted(p)) return "voted";
	return p.options.some((option) => option.selected) ? "selected" : "idle";
}
