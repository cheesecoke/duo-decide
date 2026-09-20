/**
 * from-ui-decision.ts — the one place `UIDecision` becomes `DecisionCardProps`.
 *
 * `DecisionCard` is pure (decision-card.tsx): every fact arrives as a prop.
 * The screen has the hooks' shapes — a `UIDecision`, the per-decision poll
 * ledger, the signed-in `UserContext` — and this module is the seam between
 * them. It is a plain function so the parity that matters can be asserted in a
 * table instead of through a rendered screen: what the old `CollapsibleCard`
 * computed from these same three inputs, this computes identically.
 *
 * ## The parity rules, and where they come from
 *
 * - **Creator is compared by *name*** (CollapsibleCard.tsx:91,
 *   `isCreator = createdBy === userName`). `UIDecision.createdBy` is already a
 *   display name resolved by the data hook (useDecisionsData.ts:59-61), so the
 *   mapper hands the card a `Person` carrying that same name and
 *   `decision-card.model.ts`'s `isCreator` makes the same comparison.
 * - **The poll ledger is keyed by display name**, not user id
 *   (useDecisionsData.ts:110-111 and :277-278, useDecisionVoting.ts:262). So
 *   "you voted this round" is `pollVotes[userName] !== undefined`
 *   (CollapsibleCard.tsx:95, DecisionDecideButton.tsx:63) and "your partner
 *   voted this round" is `pollVotes[partnerName] !== undefined`
 *   (CollapsibleCard.tsx:250-257), where the partner's key is
 *   `partnerName || "Partner"` — the same fallback the hook writes with.
 * - **Vote mode has no round ledger.** "You voted" in vote mode is read off a
 *   *selected* option (DecisionDecideButton.tsx:61-63), which the card's model
 *   does for itself (`hasYouVoted`). So `youVotedThisRound` is `false` there,
 *   and `partnerVotedThisRound` is `false` too: nothing in the vote-mode data
 *   says the partner has voted, and the model trusts that flag verbatim to
 *   colour a `status: "pending"` card. A `true` we could not justify would
 *   paint the partner's hue on a card nobody has touched. `status: "voted"`
 *   with no selection of yours is already read as the partner's vote inside
 *   the model (`voters()`), which is the one case vote mode *does* know about.
 *
 * ## The two seats
 *
 * The viewer is always person A and the other seat person B — the same rule
 * `PARTNER_FALLBACK` is built on (decision-card.model.ts:89-94), and why the
 * fish is you and the goose is them on both phones.
 */

import type { UIDecision } from "@/hooks/decision-queue/useDecisionsData";
import type { UserContext } from "@/types/database";

import {
	PARTNER_FALLBACK,
	type DecisionCardProps,
	type DecisionRound,
	type Person,
} from "./decision-card.model";

/**
 * Everything about a decision the card cannot work out for itself.
 *
 * The four view-state props (`expanded`, `editing`, `submitting`, `error`) and
 * the seven callbacks stay with the screen: they are about what the user is
 * doing right now, not about what the decision is.
 */
export type DecisionCardData = Omit<
	DecisionCardProps,
	| "expanded"
	| "editing"
	| "submitting"
	| "error"
	| "onToggle"
	| "onOptionSelect"
	| "onDecide"
	| "onEdit"
	| "onCancelEdit"
	| "onSaveEdit"
	| "onDelete"
>;

/** The poll ledger for one decision: display name → the option they picked. */
export type RoundVotes = Record<string, string>;

/** CollapsibleCard.tsx:95 — a missing `current_round` is round 1. */
function toRound(round: number | null | undefined): DecisionRound {
	return round === 2 ? 2 : round === 3 ? 3 : 1;
}

/**
 * `deadline` is a nullable ISO string in the database and the card wants a
 * `Date`. An unparseable string is `null` rather than an `Invalid Date`,
 * because the card renders "No deadline" for `null` and would otherwise print
 * the word "Invalid".
 */
function toDeadline(deadline: string | null | undefined): Date | null {
	if (!deadline) return null;
	const parsed = new Date(deadline);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toDecisionCardProps(
	decision: UIDecision,
	pollVotes: RoundVotes,
	userContext: UserContext,
): DecisionCardData {
	const you: Person = { name: userContext.userName, person: "a" };
	const partner: Person | null = userContext.partnerName
		? { name: userContext.partnerName, person: "b" }
		: null;

	// The name the data hook files the partner's vote under, linked or not.
	const partnerKey = (partner ?? PARTNER_FALLBACK).name;

	// `createdBy` is already "your name" or the partner's (or the literal
	// "Partner"). Keeping the string rather than re-deriving it means the
	// card's by-name creator check is the hook's answer, not a second guess.
	const createdBy: Person =
		decision.createdBy === you.name ? you : { name: decision.createdBy, person: "b" };

	const mode = decision.type;

	return {
		id: decision.id,
		title: decision.title,
		description: decision.details ?? "",
		mode,
		status: decision.status,
		currentRound: toRound(decision.current_round),
		options: decision.options ?? [],
		deadline: toDeadline(decision.deadline),
		createdBy,
		you,
		partner,
		decidedBy: decision.decidedBy ?? null,
		youVotedThisRound: mode === "poll" && pollVotes[you.name] !== undefined,
		partnerVotedThisRound: mode === "poll" && pollVotes[partnerKey] !== undefined,
	};
}
