/**
 * history.model.ts — the History tab's arithmetic, lifted out of the screen.
 *
 * FEATURE-INVENTORY §1.12 is three pure functions wearing a screen: a date
 * formatter, a row mapper that quietly drops what it cannot render, and the
 * stat block. Moving them here is what lets the parity that matters be
 * asserted in a table instead of through a rendered screen —
 * `__tests__/components/history/history.model.test.ts` is that table.
 *
 * ## `now` is a parameter
 *
 * The old formatter read the clock itself (`history.tsx:209`, before), which
 * makes "2 days ago" a fact about the machine running the test. Both
 * functions take `now` instead, defaulted to the real clock, and the screen
 * passes nothing — so the app is unchanged and the table is deterministic.
 *
 * ## The two seats
 *
 * The viewer is always person A and the other seat person B — the rule
 * `from-ui-decision.ts` is built on, and why the fish is you and the goose is
 * them on both phones. A completed decision therefore wears its decider's
 * seat, which is what `decidedBySeat` carries to the row's chip.
 */

import type { DecisionWithOptions } from "@/types/database";

/** §1.12: one page of history is twenty rows. */
const PAGE_SIZE = 20;

/** Everything one history row needs, and nothing a row cannot show. */
type HistoryDecision = {
	id: string;
	title: string;
	chosenOption: string;
	/** "You", the partner's name, or the fallback when there is no name. */
	decidedBy: string;
	/** The viewer is A, their partner is B. */
	decidedBySeat: "a" | "b";
	/** Already formatted — `formatRelativeDate`'s output, not an ISO string. */
	decisionDate: string;
};

/** The signed-in pair, as much of it as a history row depends on. */
type HistoryContext = {
	userId: string;
	partnerName: string | null;
};

type HistoryStats = {
	/**
	 * The loaded rows, unless the screen overwrites it with the count query —
	 * which it does whenever that query answered (§1.12).
	 */
	totalDecisions: number;
	youDecided: number;
	partnerDecided: number;
	/** `null` when nothing has been decided: there is no last decider yet. */
	lastDecider: string | null;
};

/** The name shown for the partner when the couple has no second name yet. */
const PARTNER_FALLBACK = "Partner";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * §1.12's date column: "Today" / "Yesterday" / "{n} days ago" for 2–6 / an
 * absolute `Mon D, YYYY` from a week out.
 *
 * Unchanged from the screen's own formatter, including its treatment of a
 * date in the *future*: a negative difference is neither 0 nor 1 and is
 * `< 7`, so it renders "-1 days ago". Nothing in the app writes a future
 * `decided_at` (it is set at the moment of deciding), so this is recorded
 * rather than fixed — changing it would be a behaviour change smuggled into
 * a move.
 */
function formatRelativeDate(iso: string, now: Date = new Date()): string {
	const date = new Date(iso);
	const diffInDays = Math.floor((now.getTime() - date.getTime()) / MS_PER_DAY);

	if (diffInDays === 0) return "Today";
	if (diffInDays === 1) return "Yesterday";
	if (diffInDays < 7) return `${diffInDays} days ago`;

	return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * One completed decision → one history row, or `null`.
 *
 * §1.12: a row whose `final_decision` matches none of its options, or which
 * is missing `decided_at` or `decided_by`, is **silently dropped**. Kept as
 * it was — but note what it means: the list can be shorter than the total the
 * count query reports, and neither the screen nor this function says so. That
 * is a real mismatch a user can see (nineteen rows under a "20"), recorded in
 * the task report rather than papered over here.
 */
function toHistoryDecision(
	decision: DecisionWithOptions,
	ctx: HistoryContext,
	now?: Date,
): HistoryDecision | null {
	const finalOption = (decision.options || []).find(
		(option) => option.id === decision.final_decision,
	);

	if (!finalOption || !decision.decided_at || !decision.decided_by) return null;

	const isYou = decision.decided_by === ctx.userId;

	return {
		id: decision.id,
		title: decision.title,
		chosenOption: finalOption.title,
		decidedBy: isYou ? "You" : ctx.partnerName || PARTNER_FALLBACK,
		decidedBySeat: isYou ? "a" : "b",
		decisionDate: formatRelativeDate(decision.decided_at, now),
	};
}

/**
 * The stat block, over every row loaded so far.
 *
 * `totalDecisions` is the loaded count; the screen overwrites it with the
 * separate count query whenever that query answered, which is why paging
 * never changes the headline number (§1.12).
 *
 * **One deliberate change from the old screen**: the last decider is now the
 * partner's *name* rather than the literal "Partner"
 * (`history.tsx:263`, before, which ignored `partnerName` even when the couple
 * had one). Every row already says "by Sam"; a stat card underneath saying
 * "Partner" about the same person was the odd one out.
 *
 * Rows that `toHistoryDecision` drops still count here, exactly as before:
 * the stats are computed over the raw page, not over the rendered list.
 */
function calculateStats(
	completed: DecisionWithOptions[],
	userId: string,
	partnerName: string | null,
): HistoryStats {
	const youDecided = completed.filter((decision) => decision.decided_by === userId).length;

	// Newest first. The query already orders by `decided_at` descending, but
	// the stats must not depend on a caller's ordering.
	const mostRecent = [...completed].sort(
		(left, right) =>
			new Date(right.decided_at || 0).getTime() - new Date(left.decided_at || 0).getTime(),
	)[0];

	return {
		totalDecisions: completed.length,
		youDecided,
		partnerDecided: completed.length - youDecided,
		lastDecider: mostRecent
			? mostRecent.decided_by === userId
				? "You"
				: partnerName || PARTNER_FALLBACK
			: null,
	};
}

export { calculateStats, formatRelativeDate, PAGE_SIZE, PARTNER_FALLBACK, toHistoryDecision };
export type { HistoryContext, HistoryDecision, HistoryStats };
