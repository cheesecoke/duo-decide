import {
	calculateStats,
	formatRelativeDate,
	PAGE_SIZE,
	toHistoryDecision,
} from "@/components/history/history.model";
import type { DecisionWithOptions } from "@/types/database";

/**
 * The History tab's arithmetic (FEATURE-INVENTORY §1.12), as a table.
 *
 * These three functions used to live inside `history.tsx` and read the clock
 * themselves, so "2 days ago" was a fact about the machine. They now take
 * `now`, and every case below pins it.
 *
 * The absolute branch goes through `toLocaleDateString("en-US", …)`, which
 * formats in the *runtime's* zone. Its fixtures are noon UTC so any offset
 * from -11 to +11 lands on the same calendar day.
 */

/** 2026-09-20, midday UTC. Every relative case is measured back from here. */
const NOW = new Date("2026-09-20T12:00:00Z");

function decision(over: Partial<DecisionWithOptions> = {}): DecisionWithOptions {
	return {
		id: "d1",
		title: "Dinner tonight",
		description: null,
		deadline: null,
		creator_id: "user-1",
		partner_id: "user-2",
		couple_id: "couple-1",
		type: "vote",
		status: "completed",
		current_round: 1,
		decided_by: "user-1",
		decided_at: "2026-09-20T09:00:00Z",
		final_decision: "o1",
		created_at: "2026-09-19T00:00:00Z",
		updated_at: "2026-09-20T09:00:00Z",
		options: [
			{
				id: "o1",
				decision_id: "d1",
				title: "Tacos",
				votes: 1,
				eliminated_in_round: null,
				created_at: "2026-09-19T00:00:00Z",
			},
			{
				id: "o2",
				decision_id: "d1",
				title: "Ramen",
				votes: 0,
				eliminated_in_round: null,
				created_at: "2026-09-19T00:00:00Z",
			},
		],
		...over,
	} as DecisionWithOptions;
}

const YOU = { userId: "user-1", partnerName: "Sam" };

describe("formatRelativeDate", () => {
	it.each([
		["earlier the same day", "2026-09-20T09:00:00Z", "Today"],
		["this instant", "2026-09-20T12:00:00Z", "Today"],
		["just under a day", "2026-09-19T13:00:00Z", "Today"],
		["a day and a bit", "2026-09-19T09:00:00Z", "Yesterday"],
		["two days", "2026-09-18T09:00:00Z", "2 days ago"],
		["six days — the last relative day", "2026-09-14T09:00:00Z", "6 days ago"],
	])("%s → %s", (_case, iso, expected) => {
		expect(formatRelativeDate(iso, NOW)).toBe(expected);
	});

	it("goes absolute from a week out", () => {
		expect(formatRelativeDate("2026-09-13T12:00:00Z", NOW)).toBe("Sep 13, 2026");
	});

	it("keeps the year on an older decision", () => {
		expect(formatRelativeDate("2025-12-24T12:00:00Z", NOW)).toBe("Dec 24, 2025");
	});

	/**
	 * Recorded, not endorsed — the behaviour the screen had. Nothing writes a
	 * future `decided_at` (it is stamped at the moment of deciding), so this
	 * is unreachable in the app; a fix here would be a behaviour change
	 * smuggled into a move.
	 */
	it("renders a future date as a negative day count", () => {
		expect(formatRelativeDate("2026-09-21T12:00:00Z", NOW)).toBe("-1 days ago");
	});

	it("reads the real clock when no `now` is given", () => {
		expect(formatRelativeDate(new Date().toISOString())).toBe("Today");
	});
});

describe("toHistoryDecision", () => {
	it("maps a decision you made into your own seat", () => {
		expect(toHistoryDecision(decision(), YOU, NOW)).toEqual({
			id: "d1",
			title: "Dinner tonight",
			chosenOption: "Tacos",
			decidedBy: "You",
			decidedBySeat: "a",
			decisionDate: "Today",
		});
	});

	it("maps one your partner made into theirs, under their name", () => {
		expect(toHistoryDecision(decision({ decided_by: "user-2" }), YOU, NOW)).toMatchObject({
			decidedBy: "Sam",
			decidedBySeat: "b",
		});
	});

	it("falls back to “Partner” when the couple has no second name", () => {
		expect(
			toHistoryDecision(decision({ decided_by: "user-2" }), { ...YOU, partnerName: null }, NOW),
		).toMatchObject({ decidedBy: "Partner", decidedBySeat: "b" });
	});

	it("seats anyone who is not you as B", () => {
		// Neither of the pair — an id from a couple the row does not belong
		// to. It is still not you, so it is still the other seat.
		expect(toHistoryDecision(decision({ decided_by: "user-9" }), YOU, NOW)).toMatchObject({
			decidedBySeat: "b",
		});
	});

	it("names the winning option, not the first one", () => {
		expect(toHistoryDecision(decision({ final_decision: "o2" }), YOU, NOW)).toMatchObject({
			chosenOption: "Ramen",
		});
	});

	/**
	 * §1.12's "silently dropped". Kept as it was — and it is why the list can
	 * be shorter than the total the count query reports.
	 */
	it.each([
		["the final decision matches no option", { final_decision: "o9" }],
		["there is no final decision", { final_decision: null }],
		["the options never loaded", { options: [] }],
		["nobody is recorded as having decided", { decided_by: null }],
		["there is no decided_at", { decided_at: null }],
	])("drops a row when %s", (_case, over) => {
		expect(toHistoryDecision(decision(over as Partial<DecisionWithOptions>), YOU, NOW)).toBeNull();
	});
});

describe("calculateStats", () => {
	it("splits the loaded rows between the two of you", () => {
		const stats = calculateStats(
			[
				decision({ id: "d1", decided_by: "user-1", decided_at: "2026-09-20T09:00:00Z" }),
				decision({ id: "d2", decided_by: "user-2", decided_at: "2026-09-19T09:00:00Z" }),
				decision({ id: "d3", decided_by: "user-2", decided_at: "2026-09-18T09:00:00Z" }),
			],
			"user-1",
			"Sam",
		);

		expect(stats).toEqual({
			totalDecisions: 3,
			youDecided: 1,
			partnerDecided: 2,
			lastDecider: "You",
		});
	});

	it("finds the last decider by date, not by position", () => {
		const stats = calculateStats(
			[
				decision({ id: "d1", decided_by: "user-1", decided_at: "2026-09-18T09:00:00Z" }),
				decision({ id: "d2", decided_by: "user-2", decided_at: "2026-09-20T09:00:00Z" }),
			],
			"user-1",
			"Sam",
		);

		expect(stats.lastDecider).toBe("Sam");
	});

	/**
	 * The one deliberate change from the old screen: it returned the literal
	 * "Partner" here even when the couple had a name on record
	 * (`history.tsx:263`, before), while every row beneath it said "by Sam".
	 */
	it("names the partner rather than calling them “Partner”", () => {
		const stats = calculateStats([decision({ decided_by: "user-2" })], "user-1", "Sam");

		expect(stats.lastDecider).toBe("Sam");
	});

	it("still says “Partner” when there is no name to use", () => {
		const stats = calculateStats([decision({ decided_by: "user-2" })], "user-1", null);

		expect(stats.lastDecider).toBe("Partner");
	});

	it("has no last decider when nothing has been decided", () => {
		expect(calculateStats([], "user-1", "Sam")).toEqual({
			totalDecisions: 0,
			youDecided: 0,
			partnerDecided: 0,
			lastDecider: null,
		});
	});

	/**
	 * The stats are computed over the raw page, not the rendered list — a row
	 * the mapper drops is still one of the pair's decisions. Unchanged.
	 */
	it("counts rows the row mapper would drop", () => {
		const stats = calculateStats(
			[decision({ id: "d1" }), decision({ id: "d2", decided_by: "user-2", final_decision: null })],
			"user-1",
			"Sam",
		);

		expect(stats.totalDecisions).toBe(2);
		expect(stats.partnerDecided).toBe(1);
	});

	it("does not reorder the caller's array", () => {
		const rows = [
			decision({ id: "d1", decided_at: "2026-09-18T09:00:00Z" }),
			decision({ id: "d2", decided_at: "2026-09-20T09:00:00Z" }),
		];

		calculateStats(rows, "user-1", "Sam");

		expect(rows.map((row) => row.id)).toEqual(["d1", "d2"]);
	});
});

describe("PAGE_SIZE", () => {
	it("is the twenty rows §1.12 pages by", () => {
		expect(PAGE_SIZE).toBe(20);
	});
});
