/**
 * The mapper's whole job is parity with the card the redesign replaces, so
 * every table here is written against the old code's own rule, cited on the
 * row. If one of these changes, a behaviour changed with it.
 *
 * Pure data in, pure data out — nothing renders.
 */

import {
	calendarPrefillFor,
	toDecisionCardProps,
	toFollowUp,
	toInlineEditPayload,
	type RoundVotes,
} from "@/components/decision-queue/decision-card/from-ui-decision";
import { eventSnapshot } from "@/lib/calendar-link";
import { PARTNER_FALLBACK } from "@/components/decision-queue/decision-card/decision-card.model";
import type { UIDecision } from "@/hooks/decision-queue/useDecisionsData";
import type { UserContext } from "@/types/database";

const YOU_ID = "user-1";
const PARTNER_ID = "user-2";

function context(over: Partial<UserContext> = {}): UserContext {
	return {
		userId: YOU_ID,
		userName: "Chase",
		coupleId: "couple-1",
		partnerId: PARTNER_ID,
		partnerName: "Sam",
		...over,
	};
}

function decision(over: Partial<UIDecision> = {}): UIDecision {
	return {
		id: "d1",
		title: "Where are we eating?",
		description: "Somewhere we have not been.",
		deadline: "2026-09-25",
		creator_id: PARTNER_ID,
		partner_id: YOU_ID,
		couple_id: "couple-1",
		type: "vote",
		status: "pending",
		current_round: 1,
		decided_by: null,
		decided_at: null,
		final_decision: null,
		created_at: "2026-09-01T00:00:00Z",
		updated_at: "2026-09-01T00:00:00Z",
		expanded: false,
		createdBy: "Sam",
		details: "Somewhere we have not been.",
		options: [
			{ id: "o1", title: "Tacos", selected: false },
			{ id: "o2", title: "Ramen", selected: false },
		],
		...over,
	};
}

describe("identity and copy", () => {
	it("carries the decision through unchanged", () => {
		const props = toDecisionCardProps(decision(), {}, context());

		expect(props.id).toBe("d1");
		expect(props.title).toBe("Where are we eating?");
		expect(props.mode).toBe("vote");
		expect(props.status).toBe("pending");
		expect(props.options).toEqual([
			{ id: "o1", title: "Tacos", selected: false },
			{ id: "o2", title: "Ramen", selected: false },
		]);
	});

	// index.tsx:315 passed `details`, not `description` — the data hook resolves
	// one from the other (useDecisionsData.ts:62) and the card reads the resolved
	// one.
	it("reads the description off `details`, blank when it is missing", () => {
		expect(toDecisionCardProps(decision(), {}, context()).description).toBe(
			"Somewhere we have not been.",
		);
		expect(toDecisionCardProps(decision({ details: "" }), {}, context()).description).toBe("");
	});

	// index.tsx:316 — `decision.options || []`.
	it("survives a decision with no options array", () => {
		expect(
			toDecisionCardProps(
				decision({ options: undefined as unknown as UIDecision["options"] }),
				{},
				context(),
			).options,
		).toEqual([]);
	});
});

describe("deadline — index.tsx:313 passed the raw string; the card takes a Date", () => {
	const cases: [string, string | null, string | null][] = [
		["an ISO date", "2026-09-25", "2026-09-25T00:00:00.000Z"],
		["a full timestamp", "2026-09-25T12:30:00.000Z", "2026-09-25T12:30:00.000Z"],
		["null", null, null],
		["the empty string", "", null],
		["something unparseable", "not a date", null],
	];

	it.each(cases)("%s", (_label, deadline, expected) => {
		const parsed = toDecisionCardProps(decision({ deadline }), {}, context()).deadline;

		expect(parsed === null ? null : parsed.toISOString()).toBe(expected);
	});
});

describe("current_round — CollapsibleCard defaulted it to 1 (index.tsx:320)", () => {
	const cases: [number | null | undefined, 1 | 2 | 3][] = [
		[1, 1],
		[2, 2],
		[3, 3],
		[0, 1],
		[null, 1],
		[undefined, 1],
		// Nothing writes a 4th round (database.ts completes at round 3), but a
		// number the card's union cannot hold must not reach it.
		[4, 1],
	];

	it.each(cases)("%p → round %p", (round, expected) => {
		expect(
			toDecisionCardProps(decision({ current_round: round as unknown as number }), {}, context())
				.currentRound,
		).toBe(expected);
	});
});

describe("the two seats — the viewer is A, the other seat is B", () => {
	it("names you off the user context", () => {
		expect(toDecisionCardProps(decision(), {}, context()).you).toEqual({
			name: "Chase",
			person: "a",
		});
	});

	it("names the partner off the user context", () => {
		expect(toDecisionCardProps(decision(), {}, context()).partner).toEqual({
			name: "Sam",
			person: "b",
		});
	});

	// index.tsx:312 passed `userContext.partnerName || "Partner"`. The card owns
	// that fallback now (PARTNER_FALLBACK), so the mapper says "nobody".
	it("is null when no partner name is known, and the card falls back", () => {
		expect(toDecisionCardProps(decision(), {}, context({ partnerName: null })).partner).toBeNull();
		expect(PARTNER_FALLBACK).toEqual({ name: "Partner", person: "b" });
	});
});

describe("createdBy — compared by NAME (CollapsibleCard.tsx:91)", () => {
	it("is you when the hook resolved your own name", () => {
		expect(toDecisionCardProps(decision({ createdBy: "Chase" }), {}, context()).createdBy).toEqual({
			name: "Chase",
			person: "a",
		});
	});

	it("is the other seat otherwise", () => {
		expect(toDecisionCardProps(decision({ createdBy: "Sam" }), {}, context()).createdBy).toEqual({
			name: "Sam",
			person: "b",
		});
	});

	// useDecisionsData.ts:59-61 writes the literal "Partner" when nobody is
	// linked; it must still read as the other seat, not as you.
	it('keeps the literal "Partner" the hook writes when nobody is linked', () => {
		expect(
			toDecisionCardProps(
				decision({ createdBy: "Partner" }),
				{},
				context({ partnerId: null, partnerName: null }),
			).createdBy,
		).toEqual({ name: "Partner", person: "b" });
	});
});

describe("decidedBy — index.tsx:318", () => {
	it("passes the resolved name through", () => {
		expect(
			toDecisionCardProps(decision({ status: "completed", decidedBy: "Sam" }), {}, context())
				.decidedBy,
		).toBe("Sam");
	});

	it("is null while nothing is decided", () => {
		expect(toDecisionCardProps(decision(), {}, context()).decidedBy).toBeNull();
	});
});

/**
 * The ledger is keyed by DISPLAY NAME (useDecisionsData.ts:110-111), which is
 * what lets the card say "they voted" without saying what they picked.
 */
describe("who voted this round — poll mode", () => {
	const poll = (over: Partial<UIDecision> = {}) => decision({ type: "poll", ...over });

	const cases: [string, RoundVotes, boolean, boolean][] = [
		["nobody", {}, false, false],
		["only you", { Chase: "o1" }, true, false],
		["only your partner", { Sam: "o2" }, false, true],
		["both of you", { Chase: "o1", Sam: "o2" }, true, true],
	];

	it.each(cases)("%s", (_label, votes, you, partner) => {
		const props = toDecisionCardProps(poll(), votes, context());

		expect(props.youVotedThisRound).toBe(you);
		expect(props.partnerVotedThisRound).toBe(partner);
	});

	// CollapsibleCard.tsx:250-257 passed `partnerName={partnerName || "Partner"}`
	// and read the ledger with it; useDecisionsData.ts:110 files the vote under
	// exactly that name.
	it('reads an unlinked partner\'s vote under the literal "Partner"', () => {
		const props = toDecisionCardProps(
			poll(),
			{ Partner: "o2" },
			context({ partnerId: null, partnerName: null }),
		);

		expect(props.partnerVotedThisRound).toBe(true);
		expect(props.youVotedThisRound).toBe(false);
	});

	// A vote recorded against the option id, not `undefined` — the old check was
	// `!== undefined`, so an empty-string option id still counts as a vote.
	it("counts any recorded value, not a truthy one", () => {
		expect(toDecisionCardProps(poll(), { Chase: "" }, context()).youVotedThisRound).toBe(true);
	});
});

/**
 * Vote mode has no per-round ledger. DecisionDecideButton.tsx:61-63 reads a
 * *selected option* as your vote, which the card's model does for itself, and
 * nothing in this data says the partner has voted — the model infers that from
 * `status: "voted"` without your selection.
 */
describe("who voted this round — vote mode", () => {
	it("is false for both, even when a stale ledger is handed in", () => {
		const props = toDecisionCardProps(
			decision({ type: "vote" }),
			{ Chase: "o1", Sam: "o2" },
			context(),
		);

		expect(props.youVotedThisRound).toBe(false);
		expect(props.partnerVotedThisRound).toBe(false);
	});

	it("is false on a pending card with your own selection in flight", () => {
		const props = toDecisionCardProps(
			decision({
				options: [
					{ id: "o1", title: "Tacos", selected: true },
					{ id: "o2", title: "Ramen", selected: false },
				],
			}),
			{},
			context(),
		);

		expect(props.youVotedThisRound).toBe(false);
		expect(props.partnerVotedThisRound).toBe(false);
	});
});

/**
 * The way back. `syncDecisionOptions` (database.ts:941-1000) treats a real id
 * as an UPDATE, a `temp-` id as an INSERT and a missing id as a DELETE — and a
 * deleted option takes its votes with it. So option identity is the thing
 * under test here.
 */
describe("toInlineEditPayload — the draft, as the management hook wants it", () => {
	const original = () =>
		decision({
			deadline: "2026-09-25",
			options: [
				{ id: "o1", title: "Tacos", selected: true },
				{ id: "o2", title: "Ramen", selected: false },
			],
		});

	function draft(over: Partial<Parameters<typeof toInlineEditPayload>[1]> = {}) {
		return {
			title: "Where are we eating?",
			description: "Somewhere we have not been.",
			deadline: new Date("2026-09-25"),
			options: ["Tacos", "Ramen"],
			...over,
		};
	}

	it("renames the fields the hook renamed (description → details)", () => {
		const payload = toInlineEditPayload(original(), draft({ description: "New plan" }));

		expect(payload.title).toBe("Where are we eating?");
		expect(payload.details).toBe("New plan");
	});

	it("keeps every id when nothing about the options changed", () => {
		expect(toInlineEditPayload(original(), draft()).options).toEqual([
			{ id: "o1", title: "Tacos", selected: true },
			{ id: "o2", title: "Ramen", selected: false },
		]);
	});

	// An UPDATE of that row, not a delete-and-insert: the option keeps its votes.
	it("keeps the id of a row whose title was edited", () => {
		expect(
			toInlineEditPayload(original(), draft({ options: ["Tacos", "Ramen or udon"] })).options,
		).toEqual([
			{ id: "o1", title: "Tacos", selected: true },
			{ id: "o2", title: "Ramen or udon", selected: false },
		]);
	});

	// The exact-match pass first, so the untouched row is not handed the
	// removed row's id by position.
	it("drops the id of a removed row and keeps the survivor's", () => {
		expect(toInlineEditPayload(original(), draft({ options: ["Ramen"] })).options).toEqual([
			{ id: "o2", title: "Ramen", selected: false },
		]);
	});

	/**
	 * The count guard on the positional pass. With the row count changed,
	 * position is not evidence of identity: reusing an id there would carry a
	 * database row — and any votes on it — onto an option nobody chose
	 * (`syncDecisionOptions`, database.ts:941-1000, UPDATEs a real id and only
	 * DELETEs one that does not come back).
	 */
	it("remove + add in one save: the new row is new, the removed rows are gone", () => {
		const three = decision({
			options: [
				{ id: "o1", title: "Tacos", selected: false },
				{ id: "o2", title: "Ramen", selected: false },
				{ id: "o3", title: "Curry", selected: false },
			],
		});

		// Ramen and Curry removed, Pizza added — three rows in, two out.
		const options = toInlineEditPayload(three, draft({ options: ["Tacos", "Pizza"] })).options;

		expect(options[0]).toEqual({ id: "o1", title: "Tacos", selected: false });
		expect(options[1].id).toMatch(/^temp-/);
		expect(options.map((option) => option.id)).not.toContain("o2");
		expect(options.map((option) => option.id)).not.toContain("o3");
	});

	it("remove + rename: the renamed row does not inherit the removed row's id", () => {
		const three = decision({
			options: [
				{ id: "o1", title: "Tacos", selected: false },
				{ id: "o2", title: "Ramen", selected: false },
				{ id: "o3", title: "Curry", selected: false },
			],
		});

		// "Tacos" removed, "Curry" renamed — three rows in, two out.
		const options = toInlineEditPayload(three, draft({ options: ["Ramen", "Katsu curry"] })).options;

		expect(options[0]).toEqual({ id: "o2", title: "Ramen", selected: false });
		expect(options[1].id).toMatch(/^temp-/);
		expect(options.map((option) => option.id)).not.toContain("o1");
		expect(options.map((option) => option.id)).not.toContain("o3");
	});

	/**
	 * The residual ambiguity, recorded on purpose: swapping one row's text for
	 * a different option, with the count unchanged, is indistinguishable from
	 * renaming that row — the draft carries titles, not ids — and this reads it
	 * as the rename, which is what keeps a real rename from deleting its own
	 * votes. Harmless while inline edit is gated to `status: "pending"` (the
	 * card's `canEdit`), where no votes exist yet.
	 */
	it("reads an equal-count substitution as a rename of that row", () => {
		expect(toInlineEditPayload(original(), draft({ options: ["Tacos", "Pizza"] })).options).toEqual([
			{ id: "o1", title: "Tacos", selected: true },
			{ id: "o2", title: "Pizza", selected: false },
		]);
	});

	it("gives a genuinely new row a temp- id, one per row", () => {
		const options = toInlineEditPayload(
			original(),
			draft({ options: ["Tacos", "Ramen", "Pizza", "Pho"] }),
		).options;

		expect(options.slice(0, 2)).toEqual([
			{ id: "o1", title: "Tacos", selected: true },
			{ id: "o2", title: "Ramen", selected: false },
		]);
		expect(options[2].id).toMatch(/^temp-/);
		expect(options[3].id).toMatch(/^temp-/);
		expect(options[2].id).not.toBe(options[3].id);
		expect(options.map((option) => option.title)).toEqual(["Tacos", "Ramen", "Pizza", "Pho"]);
	});

	it("starts from nothing when the decision had no options", () => {
		const options = toInlineEditPayload(
			decision({ options: [] }),
			draft({ options: ["Only one"] }),
		).options;

		expect(options).toHaveLength(1);
		expect(options[0].id).toMatch(/^temp-/);
		expect(options[0].selected).toBe(false);
	});

	describe("deadline", () => {
		// The card's picker hands back the `Date` it was given when nobody
		// touches it, so an untouched deadline must round-trip as the column's
		// own string rather than becoming a timestamp.
		it("keeps the column's spelling when the instant is unchanged", () => {
			expect(toInlineEditPayload(original(), draft()).deadline).toBe("2026-09-25");
		});

		it("is blank when the decision has no deadline", () => {
			expect(
				toInlineEditPayload(decision({ deadline: null }), draft({ deadline: null })).deadline,
			).toBe("");
		});

		it("falls back to ISO when the instant really is different", () => {
			expect(
				toInlineEditPayload(original(), draft({ deadline: new Date("2026-10-02T00:00:00Z") })).deadline,
			).toBe("2026-10-02T00:00:00.000Z");
		});
	});
});

/* -------------------------------------------------------------------------- */
/* what a decided decision offers next                                         */
/* -------------------------------------------------------------------------- */

/** Thursday 19 November 2026, mid-morning, local. */
const NOW = new Date(2026, 10, 19, 10, 0);

/** Decided: "o1" won. Created the week before `NOW`. */
function decided(over: Partial<UIDecision> = {}): UIDecision {
	return decision({
		status: "completed",
		final_decision: "o1",
		decided_by: YOU_ID,
		decidedBy: "Chase",
		created_at: "2026-11-12T18:00:00Z",
		options: [
			{ id: "o1", title: "Tacos", selected: true },
			{ id: "o2", title: "Ramen", selected: false },
		],
		...over,
	});
}

const YES_NO = [
	{ id: "o1", title: "Yes", selected: true },
	{ id: "o2", title: "No", selected: false },
];

describe("toFollowUp", () => {
	it("suggests nothing on an open decision", () => {
		expect(toFollowUp(decision({ title: "Jazz Night on Dec 5?" }), NOW)).toMatchObject({
			suggested: null,
			available: [],
		});
	});

	it("reads a date out of the title and suggests the calendar", () => {
		const followUp = toFollowUp(decided({ title: "Jazz Night on Dec 5?", options: YES_NO }), NOW);

		expect(followUp).toMatchObject({
			suggested: "calendar",
			signal: "parsed_date",
			when: { date: "2026-12-05", time: null, source: "parsed", foundIn: "title" },
			datePast: false,
		});
	});

	it("prefers the stored event date, and carries its time", () => {
		const followUp = toFollowUp(
			decided({ title: "Jazz Night on Dec 5?", eventOn: "2026-12-12", eventTime: "19:30" }),
			NOW,
		);

		expect(followUp).toMatchObject({
			suggested: "calendar",
			signal: "event_date",
			when: { date: "2026-12-12", time: "19:30", source: "stored" },
		});
	});

	it("reads the description off `details`", () => {
		const followUp = toFollowUp(
			decided({ title: "Jazz Night?", details: "It is on Dec 5.", description: null }),
			NOW,
		);

		expect(followUp.when).toMatchObject({ date: "2026-12-05", foundIn: "description" });
	});

	// The data hook marks the user's own vote *and* the winner `selected`, so
	// the winner is `final_decision` first.
	it("takes the winner from final_decision, not from whichever row is selected", () => {
		const followUp = toFollowUp(
			decided({
				title: "Dinner on Dec 5?",
				final_decision: "o2",
				options: [
					{ id: "o1", title: "Yes", selected: true },
					{ id: "o2", title: "No", selected: false },
				],
			}),
			NOW,
		);

		expect(followUp).toMatchObject({ negativeWon: true, suggested: null, signal: "parsed_date" });
	});

	it("falls back to the selected option when final_decision is missing", () => {
		const followUp = toFollowUp(
			decided({
				title: "Which therapist?",
				final_decision: null,
				options: [
					{ id: "o1", title: "Alexa: https://example.com/alexa", selected: true },
					{ id: "o2", title: "Someone else", selected: false },
				],
			}),
			NOW,
		);

		expect(followUp).toMatchObject({ suggested: "open_link", link: "https://example.com/alexa" });
	});

	it("yes on a yes/no with nothing else → decide the next thing", () => {
		expect(toFollowUp(decided({ title: "Get a dog?", options: YES_NO }), NOW)).toMatchObject({
			suggested: "decide_next",
			available: ["calendar", "decide_next"],
		});
	});

	it("holds the suggestion back once the date has passed, and still offers the calendar", () => {
		const followUp = toFollowUp(decided({ title: "Dinner", eventOn: "2026-11-02" }), NOW);

		expect(followUp).toMatchObject({ suggested: null, datePast: true, available: ["calendar"] });
	});

	it("survives a decision with no options array", () => {
		expect(
			toFollowUp(decided({ options: undefined as unknown as UIDecision["options"] }), NOW),
		).toMatchObject({ suggested: null, available: ["calendar"] });
	});
});

describe("toDecisionCardProps — followUp is opt-in", () => {
	it("hands the card no followUp when no clock is passed", () => {
		const props = toDecisionCardProps(decided({ title: "Jazz Night on Dec 5?" }), {}, context());

		expect("followUp" in props).toBe(false);
		expect("now" in props).toBe(false);
	});

	it("computes it, and passes the clock along, when one is", () => {
		const d = decided({ title: "Jazz Night on Dec 5?" });
		const props = toDecisionCardProps(d, {}, context(), NOW);

		expect(props.followUp).toEqual(toFollowUp(d, NOW));
		expect(props.followUp?.suggested).toBe("calendar");
		expect(props.now).toBe(NOW);
	});

	it("never carries the screen's props: calendar and the callbacks", () => {
		const props = toDecisionCardProps(decided(), {}, context(), NOW);

		for (const key of [
			"calendar",
			"onFollowUp",
			"onCalendarAnswer",
			"onCalendarOpen",
			"onCalendarRemove",
		]) {
			expect(key in props).toBe(false);
		}
	});
});

describe("calendarPrefillFor", () => {
	const prefill = (d: UIDecision) => calendarPrefillFor(d, toFollowUp(d, NOW));

	it("a named winner is the event; the date and time come from the follow-up", () => {
		const d = decided({ title: "Where on Dec 5?", eventOn: "2026-12-05", eventTime: "19:30" });

		expect(prefill(d)).toEqual({
			eventTitle: "Tacos",
			date: "2026-12-05",
			time: "19:30",
			snapshot: eventSnapshot({ title: "Tacos", date: "2026-12-05", time: "19:30" }),
		});
	});

	it("a yes: the decision's title with the question and its date taken off", () => {
		const d = decided({ title: "Want to join me at Jazz Night on Dec 5?", options: YES_NO });

		expect(prefill(d)).toMatchObject({ eventTitle: "Jazz Night", date: "2026-12-05", time: null });
	});

	it("a stored date still trims the date the title spells out", () => {
		const d = decided({
			title: "Want to join me at Jazz Night on Dec 5?",
			options: YES_NO,
			eventOn: "2026-12-05",
		});

		expect(prefill(d).eventTitle).toBe("Jazz Night");
	});

	it("a date found in the description leaves the title alone", () => {
		const d = decided({ title: "Jazz Night?", details: "It is on Dec 5.", options: YES_NO });

		expect(prefill(d)).toMatchObject({ eventTitle: "Jazz Night", date: "2026-12-05" });
	});

	it("no date: date is null, and the snapshot is taken with an empty one", () => {
		const d = decided({ title: "Where are we eating?" });

		expect(prefill(d)).toEqual({
			eventTitle: "Tacos",
			date: null,
			time: null,
			snapshot: eventSnapshot({ title: "Tacos", date: "", time: null }),
		});
	});

	it("the snapshot moves with the title and the date, and with nothing else", () => {
		const base = prefill(decided({ eventOn: "2026-12-05" })).snapshot;

		expect(prefill(decided({ eventOn: "2026-12-05", details: "Changed." })).snapshot).toBe(base);
		expect(prefill(decided({ eventOn: "2026-12-06" })).snapshot).not.toBe(base);
		expect(prefill(decided({ eventOn: "2026-12-05", eventTime: "19:30" })).snapshot).not.toBe(base);
		expect(
			prefill(
				decided({
					eventOn: "2026-12-05",
					options: [
						{ id: "o1", title: "Pizza", selected: true },
						{ id: "o2", title: "Ramen", selected: false },
					],
				}),
			).snapshot,
		).not.toBe(base);
	});

	it("is the same for both partners, whoever's `selected` the options carry", () => {
		const mine = decided({ eventOn: "2026-12-05", final_decision: "o2" });
		const theirs = decided({
			eventOn: "2026-12-05",
			final_decision: "o2",
			options: [
				{ id: "o1", title: "Tacos", selected: false },
				{ id: "o2", title: "Ramen", selected: true },
			],
		});

		expect(prefill(mine)).toEqual(prefill(theirs));
		expect(prefill(mine).eventTitle).toBe("Ramen");
	});
});
