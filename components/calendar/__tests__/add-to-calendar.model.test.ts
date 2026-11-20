import {
	bodyHeading,
	buildEvent,
	COPY,
	destinationsFor,
	eventSummary,
	formatDay,
	formatTime,
	icsFileName,
	initialBody,
	initialFocus,
	initialForm,
	localDay,
	methodFor,
	nextBody,
	noteFor,
	partnerHoldsOff,
	prefillOf,
	prefillSnapshot,
	primaryAction,
	stackFooter,
	usableDestination,
	validate,
	whenCaption,
	type CalendarBody,
	type CalendarForm,
} from "@/components/calendar/add-to-calendar.model";
import { eventSnapshot } from "@/lib/calendar-link";
import type { FollowUp, FollowUpWhen } from "@/lib/follow-up";

/**
 * The drawer's decisions, row by row, against the design spec's tables
 * (next-actions.md §2: prefill, confidence captions, unhappy paths).
 */

const TODAY = "2026-11-19";
const TITLE = "Want to join me at the Nutcracker on Dec 12?";

const when = (over: Partial<FollowUpWhen> = {}): FollowUpWhen => ({
	date: "2026-12-12",
	time: null,
	matchedText: "Dec 12",
	relative: false,
	source: "parsed",
	foundIn: "title",
	...over,
});

const followUp = (over: Partial<FollowUp> = {}): FollowUp => ({
	suggested: "calendar",
	signal: "parsed_date",
	when: when(),
	datePast: false,
	link: null,
	isYesNo: true,
	negativeWon: false,
	available: ["calendar"],
	...over,
});

const NO_DATE = followUp({ suggested: null, signal: "none", when: null });
const PAST = followUp({
	suggested: null,
	when: when({ date: "2026-11-02", matchedText: "Nov 2" }),
	datePast: true,
});

const form = (over: Partial<CalendarForm> = {}): CalendarForm => ({
	title: "Nutcracker",
	date: "2026-12-12",
	allDay: true,
	time: null,
	durationMinutes: 60,
	location: "",
	notes: "",
	destination: "google",
	destinationOpen: false,
	...over,
});

describe("formatDay", () => {
	it.each([
		["2026-12-04", "short", "Fri, Dec 4"],
		["2026-12-12", "long", "Sat, Dec 12, 2026"],
		["2026-12-12", "full", "Saturday, December 12, 2026"],
		["2027-01-01", "short", "Fri, Jan 1"],
		["2028-02-29", "short", "Tue, Feb 29"],
		["2026-02-30", "short", ""],
		["", "short", ""],
		["soon", "full", ""],
	] as const)("%j %s → %j", (date, style, expected) => {
		expect(formatDay(date, style)).toBe(expected);
	});
});

describe("formatTime", () => {
	it.each([
		["19:30", "7:30 pm"],
		["07:05", "7:05 am"],
		["00:00", "12:00 am"],
		["12:00", "12:00 pm"],
		[null, ""],
		["25:00", ""],
	] as const)("%j → %j", (time, expected) => {
		expect(formatTime(time)).toBe(expected);
	});
});

describe("localDay", () => {
	it("is the phone's own day, zero-padded", () => {
		expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
	});
});

describe("eventSummary", () => {
	it.each([
		["all day", form(), "Nutcracker · Sat, Dec 12"],
		["timed", form({ allDay: false, time: "19:30" }), "Nutcracker · Sat, Dec 12 · 7:30 pm"],
		["a time held but all day on", form({ time: "19:30" }), "Nutcracker · Sat, Dec 12"],
		["no date yet", form({ date: "" }), "Nutcracker"],
	] as const)("%s", (_name, input, expected) => {
		expect(eventSummary(input)).toBe(expected);
	});
});

describe("prefillOf", () => {
	it("takes the title off a yes/no question and the day from the follow-up", () => {
		expect(prefillOf({ decisionTitle: TITLE, winningOption: "Yes", followUp: followUp() })).toEqual({
			title: "Nutcracker",
			date: "2026-12-12",
			time: null,
		});
	});

	it("uses the winning option when it names something", () => {
		expect(
			prefillOf({ decisionTitle: "Dinner Friday?", winningOption: "Tacos", followUp: NO_DATE }),
		).toEqual({ title: "Tacos", date: null, time: null });
	});

	it("keeps a found time", () => {
		const input = {
			decisionTitle: TITLE,
			winningOption: "Yes",
			followUp: followUp({ when: when({ time: "19:30" }) }),
		};
		expect(prefillOf(input).time).toBe("19:30");
	});

	it("still reports a past date: it is the decision's, not the form's", () => {
		expect(prefillOf({ decisionTitle: TITLE, winningOption: "Yes", followUp: PAST }).date).toBe(
			"2026-11-02",
		);
	});
});

describe("prefillSnapshot", () => {
	it("is eventSnapshot of the prefill", () => {
		const input = {
			decisionTitle: TITLE,
			winningOption: "Yes",
			followUp: followUp({ when: when({ time: "19:30" }) }),
		};
		expect(prefillSnapshot(input)).toBe(
			eventSnapshot({ title: "Nutcracker", date: "2026-12-12", time: "19:30" }),
		);
	});

	it("does not throw with no date", () => {
		expect(
			prefillSnapshot({ decisionTitle: "Dinner?", winningOption: "Tacos", followUp: NO_DATE }),
		).toMatch(/^v1:/);
	});
});

describe("noteFor", () => {
	it("says where it came from, the question and the pick", () => {
		expect(noteFor(TITLE, "Yes")).toBe(`Decided together in Duo.\n\n${TITLE}\nWe picked: Yes`);
	});

	it("leaves out a missing pick", () => {
		expect(noteFor(TITLE, null)).toBe(`Decided together in Duo.\n\n${TITLE}`);
	});

	it("is just the lead with nothing to add", () => {
		expect(noteFor("  ", "")).toBe("Decided together in Duo.");
	});
});

describe("destinations", () => {
	it("offers a calendar file on web and an askable 'other' on a phone", () => {
		expect(destinationsFor("web")).toEqual(["google", "ics"]);
		expect(destinationsFor("native")).toEqual(["google", "other"]);
	});

	it.each([
		["ics", "web", "ics"],
		["ics", "native", "google"],
		["google", "web", "google"],
		["other", "native", "google"],
		["outlook", "web", "google"],
		[null, "web", "google"],
		[undefined, "native", "google"],
	] as const)("a remembered %j on %s → %s", (stored, platform, expected) => {
		expect(usableDestination(stored, platform)).toBe(expected);
	});

	it("records how it was handed off", () => {
		expect(methodFor("google")).toBe("google_link");
		expect(methodFor("ics")).toBe("ics");
	});
});

describe("initialForm", () => {
	const open = (
		follow: FollowUp,
		lastDestination: string | null = null,
		platform: "web" | "native" = "native",
	) =>
		initialForm({
			decisionTitle: TITLE,
			winningOption: "Yes",
			followUp: follow,
			lastDestination,
			platform,
		});

	it("prefills an explicit date as an all-day event", () => {
		expect(open(followUp())).toEqual({
			title: "Nutcracker",
			date: "2026-12-12",
			allDay: true,
			time: null,
			durationMinutes: 60,
			location: "",
			notes: `Decided together in Duo.\n\n${TITLE}\nWe picked: Yes`,
			destination: "google",
			destinationOpen: true,
		});
	});

	it("turns All day off only when a time was found", () => {
		const timed = open(followUp({ when: when({ time: "19:30" }) }));
		expect(timed.allDay).toBe(false);
		expect(timed.time).toBe("19:30");
	});

	it("has no date when none was found", () => {
		const empty = open(NO_DATE);
		expect(empty.date).toBe("");
		expect(empty.allDay).toBe(true);
	});

	it("does not prefill a date that has passed, or its time", () => {
		const past = open(followUp({ ...PAST, when: when({ date: "2026-11-02", time: "19:30" }) }));
		expect(past.date).toBe("");
		expect(past.time).toBeNull();
		expect(past.allDay).toBe(true);
	});

	it("opens the destination choices on first use only", () => {
		expect(open(followUp(), null).destinationOpen).toBe(true);
		expect(open(followUp(), "google").destinationOpen).toBe(false);
	});

	it("uses the remembered destination where it still can be used", () => {
		expect(open(followUp(), "ics", "web").destination).toBe("ics");
		expect(open(followUp(), "ics", "native").destination).toBe("google");
	});
});

describe("initialFocus", () => {
	it.each([
		["a date is there", form(), null],
		["no date", form({ date: "" }), "date"],
		["no title", form({ title: "  " }), "title"],
		["neither: the title comes first", form({ title: "", date: "" }), "title"],
	] as const)("%s", (_name, input, expected) => {
		expect(initialFocus(input)).toBe(expected);
	});
});

describe("whenCaption", () => {
	it.each([
		[
			"a written date, from the title",
			followUp(),
			form(),
			{ text: "Picked up from “Dec 12” in the title.", tone: "info" },
		],
		[
			"a written date, from the description",
			followUp({ when: when({ foundIn: "description" }) }),
			form(),
			{ text: "Picked up from “Dec 12” in the description.", tone: "info" },
		],
		[
			"a written date, from the winning option",
			followUp({ when: when({ foundIn: "option" }) }),
			form(),
			{ text: "Picked up from “Dec 12” in the pick.", tone: "info" },
		],
		[
			"a worked-out date asks to be checked",
			followUp({ when: when({ date: "2026-12-04", matchedText: "Friday", relative: true }) }),
			form({ date: "2026-12-04" }),
			{ text: "We read “Friday” as Fri, Dec 4. Check that's right.", tone: "info" },
		],
		[
			"a stored date needs none",
			followUp({ when: when({ source: "stored", matchedText: "", foundIn: null }) }),
			form(),
			null,
		],
		["no date found", NO_DATE, form({ date: "" }), null],
		["the person changed the date", followUp(), form({ date: "2026-12-13" }), null],
		[
			"a past date, in the words it was written in",
			PAST,
			form({ date: "" }),
			{ text: "“Nov 2” has already passed. Pick the new date.", tone: "problem" },
		],
		[
			"a past stored date has no words, so the day is used",
			followUp({
				when: when({ date: "2026-11-02", source: "stored", matchedText: "", foundIn: null }),
				datePast: true,
			}),
			form({ date: "" }),
			{ text: "“Mon, Nov 2” has already passed. Pick the new date.", tone: "problem" },
		],
		["a past date, once a new one is picked", PAST, form(), null],
		[
			"a past date in the form itself",
			NO_DATE,
			form({ date: "2026-11-18" }),
			{ text: "“Wed, Nov 18” has already passed. Pick the new date.", tone: "problem" },
		],
	] as const)("%s", (_name, follow, input, expected) => {
		expect(whenCaption(follow, input, TODAY)).toEqual(expected);
	});
});

describe("validate", () => {
	it.each([
		["a complete all-day event", form(), { ok: true }],
		["a complete timed event", form({ allDay: false, time: "19:30" }), { ok: true }],
		["today is not past", form({ date: TODAY }), { ok: true }],
		["no title", form({ title: " " }), { ok: false, field: "title", message: null }],
		["no date", form({ date: "" }), { ok: false, field: "date", message: null }],
		["not a real day", form({ date: "2026-02-30" }), { ok: false, field: "date", message: null }],
		[
			"a past date",
			form({ date: "2026-11-18" }),
			{ ok: false, field: "date", message: "“Wed, Nov 18” has already passed. Pick the new date." },
		],
		[
			"timed with no time",
			form({ allDay: false }),
			{ ok: false, field: "time", message: "Try a time like 7:30." },
		],
		["all day ignores a missing time", form({ allDay: true, time: null }), { ok: true }],
		[
			"a calendar we cannot add to",
			form({ destination: "other" }),
			{ ok: false, field: "destination", message: COPY.unsupported },
		],
		[
			"the title is checked first",
			form({ title: "", date: "" }),
			{ ok: false, field: "title", message: null },
		],
	] as const)("%s", (_name, input, expected) => {
		expect(validate(input, TODAY)).toEqual(expected);
	});
});

describe("primaryAction", () => {
	it.each([
		["Google", form(), false, { label: "Open in Google Calendar", disabled: false }],
		[
			"a calendar file",
			form({ destination: "ics" }),
			false,
			{ label: "Get calendar file", disabled: false },
		],
		["no date", form({ date: "" }), false, { label: "Pick a date first", disabled: true }],
		[
			"a past date",
			form({ date: "2026-11-18" }),
			false,
			{ label: "Pick a date first", disabled: true },
		],
		["no title", form({ title: "" }), false, { label: "Name it first", disabled: true }],
		[
			"an unsupported calendar",
			form({ destination: "other" }),
			false,
			{ label: "Not supported yet", disabled: true },
		],
		[
			"busy, or the partner is mid-add",
			form(),
			true,
			{ label: "Open in Google Calendar", disabled: true },
		],
		// The press is what shows the time field's error.
		[
			"timed with no time stays pressable",
			form({ allDay: false }),
			false,
			{ label: "Open in Google Calendar", disabled: false },
		],
	] as const)("%s", (_name, input, blocked, expected) => {
		expect(primaryAction(input, TODAY, blocked)).toEqual(expected);
	});
});

describe("buildEvent", () => {
	it("is all day when the switch is on, whatever time is held", () => {
		expect(buildEvent(form({ time: "19:30" }), "America/Denver")).toEqual({
			title: "Nutcracker",
			date: "2026-12-12",
			time: null,
			durationMinutes: 60,
			location: null,
			notes: null,
			tz: "America/Denver",
		});
	});

	it("carries the time, length, place and note of a timed event, trimmed", () => {
		expect(
			buildEvent(
				form({
					title: "  Nutcracker ",
					allDay: false,
					time: "19:30",
					durationMinutes: 120,
					location: " Ellie Caulkins ",
					notes: " Decided together in Duo. ",
				}),
			),
		).toEqual({
			title: "Nutcracker",
			date: "2026-12-12",
			time: "19:30",
			durationMinutes: 120,
			location: "Ellie Caulkins",
			notes: "Decided together in Duo.",
			tz: null,
		});
	});
});

describe("icsFileName", () => {
	it.each([
		["Jazz Night!", "jazz-night.ics"],
		["  Dinner @ Mom's  ", "dinner-mom-s.ics"],
		["🎄", "event.ics"],
		["", "event.ics"],
	])("%j → %s", (title, expected) => {
		expect(icsFileName(title)).toBe(expected);
	});

	it("keeps a long title to a sane length", () => {
		expect(icsFileName("a ".repeat(80)).length).toBeLessThanOrEqual(44);
	});
});

describe("initialBody", () => {
	it.each([
		["none", undefined, "review"],
		["partner-started", undefined, "review"],
		["partner-opening", undefined, "review"],
		["mine-opened", undefined, "confirm"],
		["mine-added", undefined, "added"],
		["both-added", undefined, "added"],
		["partner-added", undefined, "already"],
		// The caller's word wins: "Add to my calendar too".
		["partner-added", "review", "review"],
		["none", "added", "added"],
		["mine-added", "already", "already"],
	] as const)("%s, asked for %j → %s", (kind, requested, expected) => {
		expect(initialBody(kind, requested)).toBe(expected);
	});

	it("holds the button back only while the partner is mid-add", () => {
		expect(partnerHoldsOff("partner-opening")).toBe(true);
		expect(partnerHoldsOff("partner-started")).toBe(false);
		expect(partnerHoldsOff("partner-added")).toBe(false);
		expect(partnerHoldsOff("none")).toBe(false);
	});
});

describe("nextBody", () => {
	it.each([
		["review", "returned", "confirm"],
		["confirm", "yes", "added"],
		["confirm", "notYet", "review"],
		["added", "markNotAdded", "review"],
		["added", "addAgain", "review"],
		["already", "addMine", "review"],
		// Events a body does not know leave it alone.
		["review", "yes", "review"],
		["confirm", "returned", "confirm"],
		["added", "returned", "added"],
		["already", "yes", "already"],
	] as const)("%s + %s → %s", (body, event, expected) => {
		expect(nextBody(body, event)).toBe(expected);
	});
});

describe("bodyHeading", () => {
	it.each([
		["review", null],
		["confirm", "Did it save?"],
		["added", "On the calendar"],
		["already", "Already on the calendar"],
	] as [CalendarBody, string | null][])("%s → %j", (body, expected) => {
		expect(bodyHeading(body)).toBe(expected);
	});
});

describe("COPY", () => {
	it("names the partner and the calendar", () => {
		expect(COPY.partnerOpening("Steph")).toBe(
			"Steph just opened this in Google Calendar. Hold off so it doesn't land twice.",
		);
		expect(COPY.partnerOpening("Steph", "ics")).toBe(
			"Steph just opened this in a calendar. Hold off so it doesn't land twice.",
		);
		expect(COPY.already.body("Steph", "google_link")).toBe("Steph added this to Google Calendar.");
		expect(COPY.already.body("Steph", "system")).toBe("Steph added this to their calendar.");
		expect(COPY.confirm.body("Steph")).toBe(
			"We can't see your calendar, so tell us and Steph will know it's handled.",
		);
	});

	it("gives the date button a name with or without a date", () => {
		expect(COPY.whenLabel("Saturday, December 12, 2026")).toBe("When, Saturday, December 12, 2026");
		expect(COPY.whenLabel(null)).toBe("When, no date picked");
	});

	it("spells durations for the eye and the ear", () => {
		expect([60, 120, 180].map(COPY.duration)).toEqual(["1 hr", "2 hr", "3 hr"]);
		expect([60, 120].map(COPY.durationLabel)).toEqual(["1 hour", "2 hours"]);
	});
});

describe("stackFooter", () => {
	const REVIEW = ["Not now", "Open in Google Calendar"] as const;

	it.each([
		["a phone at the default text size", REVIEW, 342, 1, false],
		["the same phone at Larger Text", REVIEW, 342, 1.3, true],
		["a narrow phone", REVIEW, 272, 1, true],
		["short labels fit even enlarged", ["Not yet", "Yes, added"] as const, 342, 1.3, false],
		["scale is capped where Button caps it", ["Not yet", "Yes, added"] as const, 342, 3, false],
		["a wide sheet never stacks", REVIEW, 702, 1.3, false],
	] as const)("%s", (_name, labels, width, scale, expected) => {
		expect(stackFooter(labels, width, scale)).toBe(expected);
	});
});
