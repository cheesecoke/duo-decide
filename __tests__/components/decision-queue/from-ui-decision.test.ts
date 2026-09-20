/**
 * The mapper's whole job is parity with the card the redesign replaces, so
 * every table here is written against the old code's own rule, cited on the
 * row. If one of these changes, a behaviour changed with it.
 *
 * Pure data in, pure data out — nothing renders.
 */

import {
	toDecisionCardProps,
	toInlineEditPayload,
	type RoundVotes,
} from "@/components/decision-queue/decision-card/from-ui-decision";
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
		// The card has no date picker, so an untouched deadline must round-trip
		// as the column's own string rather than becoming a timestamp.
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
