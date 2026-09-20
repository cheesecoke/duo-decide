import type { UIDecision } from "@/hooks/decision-queue/useDecisionsData";

/**
 * who-line.ts — the line under the headline (the mock's `whoLine`,
 * design-refs/mocks/decision-queue-round-3.html:448-451 and :785-789).
 *
 * It is the one place the queue says who "we" are and how much is outstanding,
 * which is why it sits beside the 32 px fish/goose pair rather than inside a
 * card: the pair is the two of you, and this is what the two of you have.
 *
 * Pure, and separate from the screen, because the counting rule is a rule —
 * "open" is anything not yet decided, and a completed decision stays in the
 * queue until somebody deletes it (FEATURE-INVENTORY §1.10,
 * `lib/database.ts:758-762`), so "settled" is a real and growing second
 * number rather than an empty slot.
 */

/** The interpunct is the mock's separator, not a hyphen. */
const SEP = " · ";

/**
 * "You & Sam · 3 open, 1 settled".
 *
 * With nobody linked it is "You" alone — the queue is still usable solo, and
 * saying "You & Partner" would name a person who does not exist. The screen
 * drops the goose in that case for the same reason.
 *
 * An empty queue gets a sentence instead of "0 open, 0 settled", which reads
 * like a broken counter. Not the mock's own wording (:786): the empty-queue
 * tile below already says "Nothing in the queue yet" in 20 px, and the same
 * sentence twice on one screen reads as a rendering fault rather than as
 * emphasis (PLAN-3 final review M2). This half says the same thing about the
 * two of you, which is what this line is for.
 */
export function whoLine(decisions: Pick<UIDecision, "status">[], partner: string | null): string {
	const who = partner ? `You & ${partner}` : "You";

	if (decisions.length === 0) return `${who}${SEP}Nothing waiting on either of you`;

	const settled = decisions.filter((decision) => decision.status === "completed").length;
	const open = decisions.length - settled;

	return `${who}${SEP}${open} open, ${settled} settled`;
}
