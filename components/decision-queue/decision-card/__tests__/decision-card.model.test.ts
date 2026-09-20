import {
	COPY,
	canDecide,
	hasYouVoted,
	isCreator,
	optionsDisabled,
	partnerOf,
	resolveBadge,
	resolveCardState,
	resolveCta,
	resolveRoundTone,
	voterMark,
	type DecisionCardOption,
	type DecisionCardState,
	type Person,
} from "@/components/decision-queue/decision-card/decision-card.model";

/**
 * The FEATURE-INVENTORY §1.10a state matrix, row by row.
 *
 * Every table below is written against the inventory's own tables — the
 * 7-case CTA ladder, the 6 badges, the disabled rules, the privacy rule — so
 * a row failing here means the card has drifted from the documented app, not
 * that a helper was refactored.
 */

const YOU: Person = { name: "Chase", person: "a" };
const PARTNER: Person = { name: "Sam", person: "b" };

function option(id: string, selected = false): DecisionCardOption {
	return { id, title: `Option ${id}`, selected };
}

/** Two unselected options, you are NOT the creator, nothing has happened. */
function state(over: Partial<DecisionCardState> = {}): DecisionCardState {
	return {
		mode: "vote",
		status: "pending",
		currentRound: 1,
		options: [option("o1"), option("o2")],
		createdBy: PARTNER,
		you: YOU,
		partner: PARTNER,
		decidedBy: null,
		youVotedThisRound: false,
		partnerVotedThisRound: false,
		submitting: false,
		...over,
	};
}

const PICKED = [option("o1", true), option("o2")];

describe("isCreator / partnerOf", () => {
	it("compares names, the way the app does today", () => {
		expect(isCreator(state({ createdBy: YOU }))).toBe(true);
		expect(isCreator(state({ createdBy: PARTNER }))).toBe(false);
	});

	it("falls back to the literal Partner when nobody is linked", () => {
		expect(partnerOf(state({ partner: null }))).toEqual({ name: "Partner", person: "b" });
		expect(partnerOf(state())).toEqual(PARTNER);
	});
});

describe("hasYouVoted", () => {
	it.each([
		["vote mode reads a selected option as your vote", state({ options: PICKED }), true],
		["vote mode with nothing picked", state(), false],
		["vote mode ignores the poll ledger", state({ youVotedThisRound: true }), false],
		["poll mode reads the round ledger", state({ mode: "poll", youVotedThisRound: true }), true],
		["poll mode ignores a selection", state({ mode: "poll", options: PICKED }), false],
	] as const)("%s", (_name, input, expected) => {
		expect(hasYouVoted(input)).toBe(expected);
	});
});

describe("canDecide — CollapsibleCard.tsx:101-107", () => {
	it.each([
		["a picked option, two options, not the creator", state({ options: PICKED }), true],
		["nothing picked", state(), false],
		["only one option", state({ options: [option("o1", true)] }), false],
		["no options at all", state({ options: [] }), false],
		["vote mode, you are the creator", state({ options: PICKED, createdBy: YOU }), false],
		["vote mode, already completed", state({ options: PICKED, status: "completed" }), false],
		["vote mode, status voted is still live", state({ options: PICKED, status: "voted" }), true],
		[
			"poll mode, the creator may vote in round 1",
			state({ mode: "poll", options: PICKED, createdBy: YOU }),
			true,
		],
		[
			"poll mode, you already voted this round",
			state({ mode: "poll", options: PICKED, youVotedThisRound: true }),
			false,
		],
	] as const)("%s", (_name, input, expected) => {
		expect(canDecide(input)).toBe(expected);
	});
});

describe("resolveCta — the inventory's 7 cases, in order", () => {
	it.each([
		[
			"1 · completed",
			state({ status: "completed", decidedBy: "Sam" }),
			{ kind: "decided", label: "Decided by Sam", disabled: true, tone: "together" },
		],
		[
			"1 · completed with no decidedBy falls back to Partner",
			state({ status: "completed", decidedBy: null }),
			{ kind: "decided", label: "Decided by Partner", disabled: true, tone: "together" },
		],
		[
			"2 · vote, status voted, your pick is in",
			state({ status: "voted", options: PICKED }),
			{ kind: "waiting-partner", label: "Waiting for partner", disabled: true, tone: "a" },
		],
		[
			"2 · …and person B's hue when you are B",
			state({ status: "voted", options: PICKED, you: PARTNER, partner: YOU, createdBy: YOU }),
			{ kind: "waiting-partner", label: "Waiting for partner", disabled: true, tone: "b" },
		],
		[
			"2 · poll round 2 wears person B",
			state({ mode: "poll", currentRound: 2, status: "voted", youVotedThisRound: true }),
			{ kind: "waiting-partner", label: "Waiting for partner", disabled: true, tone: "b" },
		],
		[
			"2 · beats 3 — a voted poll round says waiting, not submitted",
			state({ mode: "poll", status: "voted", youVotedThisRound: true }),
			{ kind: "waiting-partner", label: "Waiting for partner", disabled: true, tone: "a" },
		],
		[
			"3 · poll, your vote for this round is in",
			state({ mode: "poll", youVotedThisRound: true }),
			{ kind: "vote-submitted", label: "Vote Submitted", disabled: true, tone: "a" },
		],
		[
			"3 · beats 4 — a creator who voted in round 3 is submitted, not blocked",
			state({ mode: "poll", currentRound: 3, createdBy: YOU, youVotedThisRound: true }),
			{ kind: "vote-submitted", label: "Vote Submitted", disabled: true, tone: "together" },
		],
		[
			"4 · poll round 3, you made this decision",
			state({ mode: "poll", currentRound: 3, createdBy: YOU }),
			{ kind: "creator-blocked", label: "Creator Blocked", disabled: true, tone: "together" },
		],
		[
			"5 · vote mode, you made this decision",
			state({ createdBy: YOU }),
			{ kind: "creator-wait", label: "Wait for partner to vote", disabled: true, tone: "muted" },
		],
		[
			"5 · beats 6 — a creator with a pick still waits",
			state({ createdBy: YOU, options: PICKED }),
			{ kind: "creator-wait", label: "Wait for partner to vote", disabled: true, tone: "muted" },
		],
		[
			"6 · vote mode, ready",
			state({ options: PICKED }),
			{ kind: "active", label: "Decide", disabled: false, tone: "cta" },
		],
		[
			"6 · poll mode, ready",
			state({ mode: "poll", options: PICKED }),
			{ kind: "active", label: "Submit Vote", disabled: false, tone: "cta" },
		],
		[
			"6 · mid-flight",
			state({ options: PICKED, submitting: true }),
			{ kind: "active", label: "Submitting…", disabled: true, tone: "cta" },
		],
		[
			"7 · one option",
			state({ options: [option("o1", true)] }),
			{ kind: "need-options", label: "Need 2+ options", disabled: true, tone: "muted" },
		],
		[
			"7 · no options",
			state({ options: [] }),
			{ kind: "need-options", label: "Need 2+ options", disabled: true, tone: "muted" },
		],
		[
			"7 · two options, nothing picked",
			state(),
			{ kind: "select-option", label: "Select option", disabled: true, tone: "muted" },
		],
	] as const)("%s", (_name, input, expected) => {
		expect(resolveCta(input)).toEqual(expected);
	});
});

describe("resolveBadge — the inventory's 6 variants", () => {
	it.each([
		["completed", state({ status: "completed" }), { label: "Decided", tone: "together" }],
		[
			"poll, both of you voted",
			state({ mode: "poll", currentRound: 2, youVotedThisRound: true, partnerVotedThisRound: true }),
			{ label: "Round 2 Complete", tone: "together" },
		],
		[
			"poll, only you voted",
			state({ mode: "poll", youVotedThisRound: true }),
			{ label: "Waiting", tone: "a" },
		],
		[
			"poll, only you voted, seen from person B",
			state({ mode: "poll", you: PARTNER, createdBy: YOU, partner: YOU, youVotedThisRound: true }),
			{ label: "Waiting", tone: "b" },
		],
		[
			// The label is still "Round N" — the inventory's rule is about who
			// is in `pollVotes` — but the card is in the partner's hue, so the
			// badge is too.
			"poll, only the partner voted, is still just the round",
			state({ mode: "poll", currentRound: 3, partnerVotedThisRound: true }),
			{ label: "Round 3", tone: "b" },
		],
		["poll, nobody yet", state({ mode: "poll" }), { label: "Round 1", tone: "neutral" }],
		["vote, voted by you", state({ status: "voted", options: PICKED }), { label: "Vote", tone: "a" }],
		[
			"vote, voted by the partner, wears their hue",
			state({ status: "voted" }),
			{ label: "Vote", tone: "b" },
		],
		["vote, pending", state(), { label: "Pending", tone: "neutral" }],
	] as const)("%s", (_name, input, expected) => {
		expect(resolveBadge(input)).toEqual(expected);
	});
});

describe("resolveCardState — whose card this is", () => {
	it.each([
		["nobody has voted", state({ mode: "poll" }), "neutral"],
		["you voted this round", state({ mode: "poll", youVotedThisRound: true }), "a"],
		[
			"…and person B's hue when you are B",
			state({ mode: "poll", you: PARTNER, partner: YOU, youVotedThisRound: true }),
			"b",
		],
		["the partner voted this round", state({ mode: "poll", partnerVotedThisRound: true }), "b"],
		[
			"both of you voted",
			state({ mode: "poll", youVotedThisRound: true, partnerVotedThisRound: true }),
			"together",
		],
		["completed is always together", state({ mode: "poll", status: "completed" }), "together"],
		["a completed vote too", state({ status: "completed" }), "together"],
		["an untouched vote is neutral", state(), "neutral"],
		[
			"a vote you have selected but not submitted is still neutral",
			state({ options: PICKED }),
			"neutral",
		],
		["a vote you voted on wears your hue", state({ status: "voted", options: PICKED }), "a"],
		// The case the first cut got wrong: `status: "voted"` with no
		// selection of yours is the PARTNER's vote, not yours.
		["a vote only the partner voted on wears theirs", state({ status: "voted" }), "b"],
		[
			"…including when the partner is the unlinked stand-in",
			state({ status: "voted", partner: null }),
			"b",
		],
		["a vote the partner is flagged on wears theirs", state({ partnerVotedThisRound: true }), "b"],
	] as const)("%s", (_name, input, expected) => {
		expect(resolveCardState(input)).toBe(expected);
	});
});

describe("resolveRoundTone — which round this is (poll only)", () => {
	it.each([
		["poll round 1 is person A", "poll", 1, "pending", "a"],
		["poll round 2 is person B", "poll", 2, "pending", "b"],
		["poll round 3 belongs to both", "poll", 3, "pending", "together"],
		["a completed poll is together", "poll", 1, "completed", "together"],
		// A vote card has no rounds, so it has no thread at all — the card
		// falls back to the person state for the two places that used it.
		["an untouched vote has no thread", "vote", 1, "pending", "neutral"],
		["a voted vote has no thread either", "vote", 1, "voted", "neutral"],
		["nor does a completed one", "vote", 1, "completed", "neutral"],
	] as const)("%s", (_name, mode, round, status, expected) => {
		expect(resolveRoundTone(mode, round, status)).toBe(expected);
	});

	it("does not depend on who is looking", () => {
		// The round's hue reads the same on both phones — that is the point
		// of a thread rather than a person state.
		expect(resolveRoundTone("poll", 2, "pending")).toBe("b");
	});
});

describe("optionsDisabled", () => {
	it.each([
		["vote · the creator cannot pick", state({ createdBy: YOU }), true],
		["vote · the partner can", state(), false],
		["vote · completed is frozen", state({ status: "completed" }), true],
		["poll · round 1 is open", state({ mode: "poll" }), false],
		["poll · your vote is already in", state({ mode: "poll", youVotedThisRound: true }), true],
		[
			"poll · round 3 locks out the creator",
			state({ mode: "poll", currentRound: 3, createdBy: YOU }),
			true,
		],
		["poll · round 3 is open to the partner", state({ mode: "poll", currentRound: 3 }), false],
		["poll · completed is frozen", state({ mode: "poll", status: "completed" }), true],
	] as const)("%s", (_name, input, expected) => {
		expect(optionsDisabled(input)).toBe(expected);
	});
});

describe("voterMark", () => {
	it.each([
		["you, nothing yet", state({ mode: "poll" }), "you", "idle"],
		["you, a pick in flight", state({ mode: "poll", options: PICKED }), "you", "selected"],
		["you, voted", state({ mode: "poll", youVotedThisRound: true }), "you", "voted"],
		[
			"you, the creator, in round 3",
			state({ mode: "poll", currentRound: 3, createdBy: YOU }),
			"you",
			"blocked",
		],
		["partner, nothing yet", state({ mode: "poll" }), "partner", "idle"],
		["partner, voted", state({ mode: "poll", partnerVotedThisRound: true }), "partner", "voted"],
		[
			"partner, the creator, in round 3",
			state({ mode: "poll", currentRound: 3, createdBy: PARTNER }),
			"partner",
			"blocked",
		],
		[
			"vote mode has no rounds, so nobody is ever blocked",
			state({ currentRound: 3, createdBy: YOU }),
			"you",
			"idle",
		],
		// The partner seat is matched against the creator BY NAME, not by
		// "whoever is not you": a decision can be shown to two people neither
		// of whom made it, and `!isCreator(you)` would mark the partner as the
		// blocked creator in round 3.
		[
			"round 3, a third party made this decision — the partner is not blocked",
			state({ mode: "poll", currentRound: 3, createdBy: { name: "Robin", person: "b" } }),
			"partner",
			"idle",
		],
		[
			"round 3 with nobody linked — the Partner stand-in is not the creator",
			state({
				mode: "poll",
				currentRound: 3,
				partner: null,
				createdBy: { name: "Robin", person: "b" },
			}),
			"partner",
			"idle",
		],
		[
			"round 3 with nobody linked and the stand-in IS the creator",
			state({
				mode: "poll",
				currentRound: 3,
				partner: null,
				createdBy: { name: "Partner", person: "b" },
			}),
			"partner",
			"blocked",
		],
	] as const)("%s", (_name, input, who, expected) => {
		expect(voterMark(input, who)).toBe(expected);
	});

	// FEATURE-INVENTORY §1.10a, CollapsibleCard.tsx:254 — the partner
	// indicator is always passed hasSelectedOption={false}.
	it("never leaks the partner's in-progress pick", () => {
		const picking = state({ mode: "poll", options: PICKED, partnerVotedThisRound: false });
		expect(voterMark(picking, "partner")).toBe("idle");
		expect(voterMark(picking, "partner")).not.toBe("selected");
	});
});

describe("COPY", () => {
	it.each([
		["emptyOptions", COPY.emptyOptions, "Please add options"],
		["validateVote", COPY.validateVote, "Add more than one option"],
		["validatePoll", COPY.validatePoll, "Add at least 2 options to avoid bias"],
		["noDeadline", COPY.noDeadline, "No deadline"],
		["createdBy", COPY.createdBy("Sam"), "Created by Sam"],
		["round", COPY.round(2), "Round 2"],
		["voter · voted", COPY.voter("Sam", "voted"), "Sam: voted"],
		["voter · blocked", COPY.voter("Sam", "blocked"), "Sam: sitting out"],
		["voter · idle", COPY.voter("Sam", "idle"), "Sam: waiting"],
		["voter · selected says no more than idle", COPY.voter("Chase", "selected"), "Chase: waiting"],
	] as const)("%s is verbatim", (_name, actual, expected) => {
		expect(actual).toBe(expected);
	});
});
