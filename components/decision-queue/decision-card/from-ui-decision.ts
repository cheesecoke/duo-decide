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

/* -------------------------------------------------------------------------- */
/* the way back: an inline edit, as the management hook wants it               */
/* -------------------------------------------------------------------------- */

/** `useDecisionManagement.ts:164-171`'s payload, spelled out. */
export type InlineEditPayload = {
	title: string;
	details: string;
	/** The raw column value; "" clears it (useDecisionManagement.ts:177). */
	deadline: string;
	options: { id: string; title: string; selected: boolean }[];
};

/**
 * `DecisionEditDraft` → `updateDecisionInline`'s payload.
 *
 * Two shapes have to be bridged, and the interesting one is the options.
 *
 * **Option identity.** The draft carries *titles*, because that is all the
 * card's edit body has (decision-card.tsx's `draft`). `syncDecisionOptions`
 * (database.ts:941-1000) reads the ids: a real id is an UPDATE of that row's
 * title, a `temp-` id is an INSERT, and an id that does not come back is a
 * DELETE — and deleting a row takes the votes recorded against it. So this
 * has to decide, from titles alone, which rows are "the same row".
 *
 * It matches in two passes, and the order is the point:
 *
 *   1. exact title matches claim their own id first, so a row nobody touched
 *      keeps its id no matter how the rows around it moved;
 *   2. what is left is matched positionally against the ids still unclaimed,
 *      so an edited title is an UPDATE of the row it was typed into rather
 *      than a delete-and-insert that would drop that option's votes.
 *
 * Anything still unmatched is genuinely new and gets a `temp-` id; any
 * original id never claimed was a row the user removed, and its absence is
 * what deletes it.
 *
 * **The deadline.** The card has no date picker (edit-body.tsx), so the draft
 * hands back the same `Date` it was given. The original column string is
 * therefore preferred whenever it parses to that same instant — a date-only
 * `"2026-09-25"` must not silently become a timestamp because it made a round
 * trip through `Date`.
 */
export function toInlineEditPayload(
	decision: Pick<UIDecision, "deadline" | "options">,
	draft: { title: string; description: string; deadline: Date | null; options: string[] },
): InlineEditPayload {
	const originals = (decision.options ?? []).map((option) => ({ ...option }));
	const claimed = new Array<boolean>(originals.length).fill(false);
	const matched = new Array<(typeof originals)[number] | null>(draft.options.length).fill(null);

	draft.options.forEach((title, index) => {
		const exact = originals.findIndex((option, i) => !claimed[i] && option.title === title);
		if (exact !== -1) {
			claimed[exact] = true;
			matched[index] = originals[exact];
		}
	});

	let next = 0;
	draft.options.forEach((_title, index) => {
		if (matched[index]) return;
		while (next < originals.length && claimed[next]) next += 1;
		if (next < originals.length) {
			claimed[next] = true;
			matched[index] = originals[next];
		}
	});

	// One stamp for the whole save, suffixed per row: `Date.now()` alone
	// repeats within a millisecond, and two new options sharing an id would
	// both be inserted but only one of them tracked.
	const stamp = Date.now();

	return {
		title: draft.title,
		details: draft.description,
		deadline: toDeadlineString(decision.deadline, draft.deadline),
		options: draft.options.map((title, index) => {
			const original = matched[index];
			return original
				? { id: original.id, title, selected: original.selected }
				: { id: `temp-${stamp}-${index}`, title, selected: false };
		}),
	};
}

/** See `toInlineEditPayload`: keep the column's own spelling where it means the same instant. */
function toDeadlineString(original: string | null | undefined, draft: Date | null): string {
	if (!draft) return "";
	if (original) {
		const parsed = new Date(original);
		if (!Number.isNaN(parsed.getTime()) && parsed.getTime() === draft.getTime()) return original;
	}
	return draft.toISOString();
}
