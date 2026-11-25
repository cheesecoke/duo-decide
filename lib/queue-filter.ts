import { resolveCta } from "@/components/decision-queue/decision-card/decision-card.model";
import type { DecisionCardData } from "@/components/decision-queue/decision-card/from-ui-decision";

/**
 * queue-filter.ts — which decisions the Decision Queue shows.
 *
 * Two independent filters, applied together:
 *
 *   1. **Status** — a bucket per *what the decision is waiting on*, from the
 *      viewer's seat. It is read off the card's own CTA ladder (`resolveCta`),
 *      not re-derived from `status`, so the filter and the card can never
 *      disagree: a card that says "Decide" is in "Your turn", one that says
 *      "Waiting for partner" is in "{Partner}'s turn", one that says "Decided by …" is
 *      in "Decided".
 *   2. **Search** — a forgiving match on the title, for "I remember what it
 *      was called".
 *
 * Pure, so both rules are table-tested (`__tests__/lib/queue-filter.test.ts`).
 */

export type QueueBucket = "yours" | "theirs" | "decided";

/**
 * `"all"` is the filter being *off* — no chip selected — not a fourth chip.
 * Tapping the selected chip again comes back here.
 */
export type QueueFilter = "all" | QueueBucket;

/** The chips, in reading order: what is on you, on them, and done. */
export const QUEUE_BUCKETS: readonly QueueBucket[] = ["yours", "theirs", "decided"];

/**
 * The bucket a card is in, from the viewer's seat.
 *
 * - **yours** — the card's next move is the viewer's: the live button, or
 *   it is asking them to pick / add options.
 * - **theirs** — the viewer has done their part (or is not allowed one,
 *   e.g. the creator of a vote, or of a poll in round 3); the partner is up.
 * - **decided** — finished, still in the queue until someone archives it.
 */
export function bucketOf(card: DecisionCardData): QueueBucket {
	// `submitting` only changes the live button's label, never its kind.
	const { kind } = resolveCta({ ...card, submitting: false });
	switch (kind) {
		case "decided":
			return "decided";
		case "active":
		case "select-option":
		case "need-options":
			return "yours";
		default:
			return "theirs";
	}
}

export type BucketCounts = Record<QueueFilter, number>;

export function countBuckets(buckets: QueueBucket[]): BucketCounts {
	const counts: BucketCounts = { all: buckets.length, yours: 0, theirs: 0, decided: 0 };
	for (const bucket of buckets) counts[bucket] += 1;
	return counts;
}

/* -------------------------------------------------------------------------- */
/* search                                                                      */
/* -------------------------------------------------------------------------- */

/** Lower-case, accents off ("Café" finds "cafe"), punctuation to spaces. */
export function normalize(text: string): string {
	return text
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, " ")
		.trim();
}

/** Every letter of `needle`, in order, somewhere in `haystack`. */
function isSubsequence(needle: string, haystack: string): boolean {
	let i = 0;
	for (const char of haystack) {
		if (char === needle[i]) i += 1;
		if (i === needle.length) return true;
	}
	return false;
}

/**
 * Does `title` match what was typed?
 *
 * Each word typed has to land somewhere in the title, in any order ("trip
 * beach" finds "Beach trip"). A word lands if it is a substring of the title,
 * or — for words of 3+ letters, so "dn" does not match half the queue — if
 * its letters appear in order inside one title word *that starts with the
 * same letter* ("rstrnt" finds "restaurant", "dinr" finds "Dinner").
 *
 * An empty query matches everything.
 */
export function matchesQuery(title: string, query: string): boolean {
	const terms = normalize(query).split(" ").filter(Boolean);
	if (terms.length === 0) return true;

	const haystack = normalize(title);
	const words = haystack.split(" ");

	return terms.every(
		(term) =>
			haystack.includes(term) ||
			(term.length >= 3 && words.some((word) => word[0] === term[0] && isSubsequence(term, word))),
	);
}

/* -------------------------------------------------------------------------- */
/* both                                                                        */
/* -------------------------------------------------------------------------- */

export type FilterableCard = { card: DecisionCardData; bucket: QueueBucket };

/**
 * The cards to show, in their original order, plus the counts for the
 * status chips.
 *
 * The counts are taken **after search, before status**: with "beach" typed,
 * the chips say how many beach decisions are in each bucket, so the numbers
 * always describe what tapping that chip would show.
 */
export function applyQueueFilter<T extends FilterableCard>(
	items: T[],
	filter: QueueFilter,
	query: string,
): { visible: T[]; counts: BucketCounts } {
	const searched = items.filter((item) => matchesQuery(item.card.title, query));
	const counts = countBuckets(searched.map((item) => item.bucket));
	const visible = filter === "all" ? searched : searched.filter((item) => item.bucket === filter);
	return { visible, counts };
}
