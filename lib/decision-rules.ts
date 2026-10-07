/**
 * How many options a decision needs before it can be created or saved.
 *
 * Polls need three: round 1 narrows them to the two that were picked, and a
 * poll with only two options would skip straight to the round-2 shape (Chase,
 * Oct 2026). Votes need two, so there is a choice to make.
 *
 * Only creation and editing use this. Voting itself never does: poll rounds 2
 * and 3 always have exactly two options, by design.
 */

export type DecisionKind = "vote" | "poll";

export const MIN_OPTIONS: Record<DecisionKind, number> = { vote: 2, poll: 3 };

/** The minimum for a decision being created or edited in `round`. */
export function minOptionsFor(kind: DecisionKind, round = 1): number {
	// Past round 1 a poll is down to its two picked options.
	return kind === "poll" && round > 1 ? 2 : MIN_OPTIONS[kind];
}

/** Counts options that actually have text. */
export function countFilled(titles: readonly string[]): number {
	return titles.filter((title) => title.trim().length > 0).length;
}

/** The message to show when there are too few options, or null when there are enough. */
export function optionShortfall(kind: DecisionKind, filled: number, round = 1): string | null {
	const min = minOptionsFor(kind, round);
	if (filled >= min) return null;
	return kind === "poll" && min === 3
		? "Polls need at least 3 options"
		: `Add at least ${min} options`;
}
