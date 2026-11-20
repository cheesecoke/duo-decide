import {
	COPY,
	canDecide,
	formatEventDay,
	hasYouVoted,
	isCreator,
	menuActions,
	optionsDisabled,
	partnerOf,
	resolveBadge,
	resolveCardState,
	resolveCta,
	resolveFooter,
	resolveMeta,
	resolveRoundTone,
	voterMark,
	type DecisionCardOption,
	type DecisionCardState,
	type Person,
} from "@/components/decision-queue/decision-card/decision-card.model";
import type { CalendarAddView } from "@/lib/calendar-add-view";
import type { FollowUp, FollowUpAction } from "@/lib/follow-up";

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
		// Row 1 was the dead "Decided by {name}" pill. A decided card has no
		// decide button now: who decided is `resolveMeta`'s and the slot is
		// `resolveFooter`'s (both tabled below).
		["1 · completed has no decide button", state({ status: "completed", decidedBy: "Sam" }), null],
		[
			"1 · …whoever decided it",
			state({ status: "completed", decidedBy: null, options: PICKED }),
			null,
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
		["deadlineLabel", COPY.deadlineLabel, "Decide by"],
		["createdBy", COPY.createdBy("Sam"), "Created by Sam"],
		["decidedBy", COPY.decidedBy("Chase"), "Decided by Chase"],
		["round", COPY.round(2), "Round 2"],
		["voter · voted", COPY.voter("Sam", "voted"), "Sam: voted"],
		["voter · blocked", COPY.voter("Sam", "blocked"), "Sam: sitting out"],
		["voter · idle", COPY.voter("Sam", "idle"), "Sam: waiting"],
		["voter · selected says no more than idle", COPY.voter("Chase", "selected"), "Chase: waiting"],
	] as const)("%s is verbatim", (_name, actual, expected) => {
		expect(actual).toBe(expected);
	});
});

/* -------------------------------------------------------------------------- */
/* the decided card: who decided, and what it offers next                      */
/* -------------------------------------------------------------------------- */

/** Thursday 19 November 2026, local. Only its year is read. */
const NOW = new Date(2026, 10, 19, 9, 0);

const WHEN: NonNullable<FollowUp["when"]> = {
	date: "2026-12-12",
	time: null,
	matchedText: "Dec 12",
	relative: false,
	source: "parsed",
	foundIn: "title",
};

function followUp(over: Partial<FollowUp> = {}): FollowUp {
	return {
		suggested: null,
		signal: "none",
		when: null,
		datePast: false,
		link: null,
		isYesNo: false,
		negativeWon: false,
		available: ["calendar"],
		...over,
	};
}

const DATED = followUp({ suggested: "calendar", signal: "parsed_date", when: WHEN });
const LINKED = followUp({
	suggested: "open_link",
	signal: "url",
	link: "https://example.com",
	available: ["calendar", "open_link"],
});
const YES = followUp({
	suggested: "decide_next",
	signal: "yes_shape",
	isYesNo: true,
	available: ["calendar", "decide_next"],
});
/** A "no" won on a dated yes/no: the date was seen, nothing is suggested. */
const NO_WON = followUp({ signal: "parsed_date", when: WHEN, isYesNo: true, negativeWon: true });
const PAST = followUp({
	signal: "parsed_date",
	when: { ...WHEN, date: "2026-11-02" },
	datePast: true,
});

const AT = "2026-11-19T15:00:00Z";
const CAL = {
	none: { kind: "none", changed: false },
	mineOpened: { kind: "mine-opened", openedAt: AT, method: "google_link", changed: false },
	partnerOpening: {
		kind: "partner-opening",
		openedAt: AT,
		staleAt: Date.parse(AT) + 600_000,
		method: "google_link",
		changed: false,
	},
	partnerStarted: { kind: "partner-started", openedAt: AT, method: "google_link", changed: false },
	mineAdded: {
		kind: "mine-added",
		addedAt: AT,
		method: "google_link",
		confirmed: true,
		changed: false,
	},
	partnerAdded: {
		kind: "partner-added",
		addedAt: AT,
		method: "google_link",
		confirmed: true,
		changed: false,
	},
	bothAdded: {
		kind: "both-added",
		addedAt: AT,
		partnerAddedAt: AT,
		method: "google_link",
		partnerMethod: "ics",
		confirmed: true,
		changed: false,
	},
} satisfies Record<string, CalendarAddView>;

const changed = <V extends CalendarAddView>(view: V): V => ({ ...view, changed: true });

type DecidedOver = Partial<DecisionCardState> & {
	followUp?: FollowUp | null;
	calendar?: CalendarAddView;
};

const decided = (over: DecidedOver = {}) =>
	state({ status: "completed", decidedBy: "Chase", options: PICKED, ...over });

describe("resolveMeta — the header line", () => {
	it.each([
		["an open card has no decider: the header prints the deadline", state(), null],
		["voted is still open", state({ status: "voted" }), null],
		["decided by you", decided({ decidedBy: "Chase" }), "Decided by Chase"],
		["decided by your partner", decided({ decidedBy: "Sam" }), "Decided by Sam"],
		["no decider recorded falls back to Partner", decided({ decidedBy: null }), "Decided by Partner"],
	] as const)("%s", (_name, input, expected) => {
		expect(resolveMeta(input)).toEqual({ createdBy: "Created by Sam", decidedBy: expected });
	});
});

describe("formatEventDay", () => {
	it.each([
		["this year: no year", "2026-12-12", { short: "Sat, Dec 12", long: "Saturday, December 12" }],
		[
			"a single-digit day is not padded",
			"2026-12-04",
			{ short: "Fri, Dec 4", long: "Friday, December 4" },
		],
		[
			"next year: the year is added",
			"2027-01-08",
			{ short: "Fri, Jan 8, 2027", long: "Friday, January 8, 2027" },
		],
		[
			"last year too",
			"2025-12-12",
			{ short: "Fri, Dec 12, 2025", long: "Friday, December 12, 2025" },
		],
		// A calendar day is local: read as UTC this would be Dec 31 in Denver.
		[
			"new year's day stays in its own year",
			"2027-01-01",
			{ short: "Fri, Jan 1, 2027", long: "Friday, January 1, 2027" },
		],
		["a leap day", "2028-02-29", { short: "Tue, Feb 29, 2028", long: "Tuesday, February 29, 2028" }],
	] as const)("%s", (_name, day, expected) => {
		expect(formatEventDay(day, NOW)).toEqual(expected);
	});

	it.each([
		["a day that does not exist", "2026-02-31"],
		["month 13", "2026-13-01"],
		["a timestamp", "2026-12-12T00:00:00Z"],
		["empty", ""],
		["null", null],
		["undefined", undefined],
	])("answers null for %s", (_name, day) => {
		expect(formatEventDay(day, NOW)).toBeNull();
	});
});

describe("resolveFooter — one thing, or nothing", () => {
	const NONE = { kind: "none" };
	const HINT = "Opens the calendar sheet";

	it.each([
		[
			"an open card, even with a follow-up handed in",
			state({ followUp: DATED } as DecidedOver),
			NONE,
		],
		["decided, no followUp prop", decided(), NONE],
		["decided, followUp null (the welcome card)", decided({ followUp: null }), NONE],
		["decided, nothing detected", decided({ followUp: followUp() }), NONE],
		["a no won", decided({ followUp: NO_WON }), NONE],
		["the date has passed", decided({ followUp: PAST }), NONE],
		[
			"a date",
			decided({ followUp: DATED }),
			{
				kind: "action",
				pill: {
					action: "calendar",
					label: "Add to calendar · Sat, Dec 12",
					accessibilityLabel: "Add to calendar, Saturday, December 12",
					accessibilityHint: HINT,
				},
			},
		],
		[
			"a date next year carries its year",
			decided({ followUp: { ...DATED, when: { ...WHEN, date: "2027-01-08" } } }),
			{
				kind: "action",
				pill: {
					action: "calendar",
					label: "Add to calendar · Fri, Jan 8, 2027",
					accessibilityLabel: "Add to calendar, Friday, January 8, 2027",
					accessibilityHint: HINT,
				},
			},
		],
		[
			"a link in the winner",
			decided({ followUp: LINKED }),
			{
				kind: "action",
				pill: {
					action: "open_link",
					label: "Open link",
					accessibilityLabel: "Open link",
					accessibilityHint: "Opens the link in the winning option",
				},
			},
		],
		[
			"yes on a yes/no",
			decided({ followUp: YES }),
			{
				kind: "action",
				pill: {
					action: "decide_next",
					label: "Decide the next thing",
					accessibilityLabel: "Decide the next thing",
					accessibilityHint: "Starts a new decision",
				},
			},
		],
		[
			"I handed off and have not answered",
			decided({ followUp: DATED, calendar: CAL.mineOpened }),
			{
				kind: "question",
				marks: [{ seat: "a", done: false }],
				label: "Did it save?",
				yes: { label: "Yes", accessibilityLabel: "Yes, it saved" },
				notYet: { label: "Not yet", accessibilityLabel: "Not yet, it did not save" },
			},
		],
		[
			"the partner is mid-add",
			decided({ followUp: DATED, calendar: CAL.partnerOpening }),
			{
				kind: "status",
				marks: [{ seat: "b", done: false }],
				label: "Sam is adding this now",
				accessibilityLabel: "Sam is adding this now",
				accessibilityHint: HINT,
			},
		],
		[
			"the partner's hand-off went stale: the button is back",
			decided({ followUp: DATED, calendar: CAL.partnerStarted }),
			resolveFooter(decided({ followUp: DATED }), NOW),
		],
		[
			"I added it",
			decided({ followUp: DATED, calendar: CAL.mineAdded }),
			{
				kind: "status",
				marks: [{ seat: "a", done: true }],
				label: "You added it to the calendar · Sat, Dec 12",
				accessibilityLabel: "You added it to the calendar, Saturday, December 12",
				accessibilityHint: HINT,
			},
		],
		[
			"the partner added it: a line, and no pill",
			decided({ followUp: DATED, calendar: CAL.partnerAdded }),
			{
				kind: "status",
				marks: [{ seat: "b", done: true }],
				label: "Sam added it to the calendar · Sat, Dec 12",
				accessibilityLabel: "Sam added it to the calendar, Saturday, December 12",
				accessibilityHint: HINT,
			},
		],
		[
			"both added it",
			decided({ followUp: DATED, calendar: CAL.bothAdded }),
			{
				kind: "status",
				marks: [
					{ seat: "a", done: true },
					{ seat: "b", done: true },
				],
				label: "You both added it to the calendar · Sat, Dec 12",
				accessibilityLabel: "You both added it to the calendar, Saturday, December 12",
				accessibilityHint: HINT,
			},
		],
		[
			"a partner row with nobody linked (a deleted account) says Partner",
			decided({ followUp: DATED, calendar: CAL.partnerAdded, partner: null }),
			{
				kind: "status",
				marks: [{ seat: "b", done: true }],
				label: "Partner added it to the calendar · Sat, Dec 12",
				accessibilityLabel: "Partner added it to the calendar, Saturday, December 12",
				accessibilityHint: HINT,
			},
		],
		[
			"added with no date on the decision: the line has no date",
			decided({ followUp: followUp(), calendar: CAL.mineAdded }),
			{
				kind: "status",
				marks: [{ seat: "a", done: true }],
				label: "You added it to the calendar",
				accessibilityLabel: "You added it to the calendar",
				accessibilityHint: HINT,
			},
		],
		[
			"the calendar speaks even with followUp null",
			decided({ followUp: null, calendar: CAL.mineAdded }),
			{
				kind: "status",
				marks: [{ seat: "a", done: true }],
				label: "You added it to the calendar",
				accessibilityLabel: "You added it to the calendar",
				accessibilityHint: HINT,
			},
		],
		[
			"the calendar takes the slot over a suggested link",
			decided({ followUp: LINKED, calendar: CAL.partnerOpening }),
			{
				kind: "status",
				marks: [{ seat: "b", done: false }],
				label: "Sam is adding this now",
				accessibilityLabel: "Sam is adding this now",
				accessibilityHint: HINT,
			},
		],
		[
			"changed since I added it",
			decided({ followUp: DATED, calendar: changed(CAL.mineAdded) }),
			{
				kind: "changed",
				marks: [{ seat: "a", done: true }],
				caption: "Changed since it was added",
				pill: {
					action: "calendar",
					label: "Add again · Sat, Dec 12",
					accessibilityLabel: "Add again, Saturday, December 12",
					accessibilityHint: HINT,
				},
			},
		],
		[
			"changed since the partner added it",
			decided({ followUp: DATED, calendar: changed(CAL.partnerAdded) }),
			{
				kind: "changed",
				marks: [{ seat: "b", done: true }],
				caption: "Changed since it was added",
				pill: {
					action: "calendar",
					label: "Add again · Sat, Dec 12",
					accessibilityLabel: "Add again, Saturday, December 12",
					accessibilityHint: HINT,
				},
			},
		],
		[
			"changed, and the date is gone",
			decided({ followUp: followUp(), calendar: changed(CAL.bothAdded) }),
			{
				kind: "changed",
				marks: [
					{ seat: "a", done: true },
					{ seat: "b", done: true },
				],
				caption: "Changed since it was added",
				pill: {
					action: "calendar",
					label: "Add again",
					accessibilityLabel: "Add again",
					accessibilityHint: HINT,
				},
			},
		],
	] as const)("%s", (_name, input, expected) => {
		expect(resolveFooter(input, NOW)).toEqual(expected);
	});

	it("marks each person in their own seat when the viewer is drawn as B", () => {
		const fromB = decided({
			you: PARTNER,
			partner: YOU,
			createdBy: YOU,
			followUp: DATED,
			calendar: CAL.bothAdded,
		});
		expect(resolveFooter(fromB, NOW)).toMatchObject({
			marks: [
				{ seat: "b", done: true },
				{ seat: "a", done: true },
			],
		});
	});

	it("never suggests the black tone: a pill carries no tone at all", () => {
		const footer = resolveFooter(decided({ followUp: DATED }), NOW);
		expect(footer.kind === "action" && Object.keys(footer.pill)).toEqual([
			"action",
			"label",
			"accessibilityLabel",
			"accessibilityHint",
		]);
	});
});

describe("menuActions — the ⋮ menu", () => {
	it.each([
		["pending, you created it", state({ createdBy: YOU }), ["delete"]],
		["voted, you created it", state({ createdBy: YOU, status: "voted" }), ["delete"]],
		["pending, your partner created it", state(), []],
		[
			"an open card ignores a follow-up",
			state({ createdBy: YOU, followUp: DATED, calendar: CAL.mineAdded } as DecidedOver),
			["delete"],
		],
	] as const)("open · %s", (_name, input, expected) => {
		expect(menuActions(input)).toEqual(expected);
	});

	it.each([
		["no followUp prop", decided(), ["archive"]],
		["followUp null (the welcome card)", decided({ followUp: null }), ["archive"]],
		[
			"nothing detected: Add to calendar is the fallback",
			decided({ followUp: followUp() }),
			["calendar", "archive"],
		],
		["a no won", decided({ followUp: NO_WON }), ["calendar", "archive"]],
		["the date has passed", decided({ followUp: PAST }), ["calendar", "archive"]],
		["the pill is Add to calendar", decided({ followUp: DATED }), ["archive"]],
		[
			"the pill is Add to calendar, and the winner has a link",
			decided({
				followUp: { ...DATED, link: "https://x.test", available: ["calendar", "open_link"] },
			}),
			["open_link", "archive"],
		],
		["the pill is Open link", decided({ followUp: LINKED }), ["calendar", "archive"]],
		["the pill is Decide the next thing", decided({ followUp: YES }), ["calendar", "archive"]],
		[
			"a no won on a card with a link",
			decided({
				followUp: { ...NO_WON, link: "https://x.test", available: ["calendar", "open_link"] },
			}),
			["calendar", "open_link", "archive"],
		],
		[
			"I am being asked Did it save?",
			decided({ followUp: DATED, calendar: CAL.mineOpened }),
			["archive"],
		],
		[
			"the partner is mid-add",
			decided({ followUp: DATED, calendar: CAL.partnerOpening }),
			["archive"],
		],
		[
			"the partner's hand-off went stale: the pill is back, so the menu drops it",
			decided({ followUp: DATED, calendar: CAL.partnerStarted }),
			["archive"],
		],
		[
			"I added it",
			decided({ followUp: DATED, calendar: CAL.mineAdded }),
			["calendar_remove", "archive"],
		],
		[
			"the partner added it",
			decided({ followUp: DATED, calendar: CAL.partnerAdded }),
			["calendar_add_mine", "archive"],
		],
		[
			"both added it",
			decided({ followUp: DATED, calendar: CAL.bothAdded }),
			["calendar_remove", "archive"],
		],
		[
			"changed since I added it: Add again is the pill",
			decided({ followUp: DATED, calendar: changed(CAL.mineAdded) }),
			["calendar_remove", "archive"],
		],
		[
			"changed since the partner added it: Add again is the pill",
			decided({ followUp: DATED, calendar: changed(CAL.partnerAdded) }),
			["archive"],
		],
		[
			"the calendar holds the slot, so a suggested link moves to the menu",
			decided({ followUp: LINKED, calendar: CAL.mineAdded }),
			["open_link", "calendar_remove", "archive"],
		],
		[
			"calendar rows with followUp null still get their own items",
			decided({ followUp: null, calendar: CAL.partnerAdded }),
			["calendar_add_mine", "archive"],
		],
	] as const)("decided · %s", (_name, input, expected) => {
		expect(menuActions(input)).toEqual(expected);
	});

	it("never lists what the footer pill already offers, and always ends in Archive", () => {
		const followUps: FollowUp[] = [followUp(), DATED, LINKED, YES, NO_WON, PAST];
		for (const given of followUps) {
			for (const calendar of [...Object.values(CAL), changed(CAL.mineAdded)]) {
				const input = decided({ followUp: given, calendar });
				const footer = resolveFooter(input, NOW);
				const inSlot: FollowUpAction | null =
					footer.kind === "action" || footer.kind === "changed" ? footer.pill.action : null;
				const actions = menuActions(input);

				expect(actions[actions.length - 1]).toBe("archive");
				if (inSlot) expect(actions).not.toContain(inSlot);
				expect(new Set(actions).size).toBe(actions.length);
			}
		}
	});

	it.each([
		["archive", "Archive"],
		["delete", "Delete decision"],
		["calendar", "Add to calendar"],
		["open_link", "Open link"],
		["decide_next", "Decide the next thing"],
		["calendar_remove", "Mark as not added"],
		["calendar_add_mine", "Add to my calendar too"],
	] as const)("labels %s as %s", (action, label) => {
		expect(COPY.menu[action]).toBe(label);
	});
});
