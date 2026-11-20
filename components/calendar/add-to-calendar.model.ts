/**
 * add-to-calendar.model — everything the Add to calendar drawer decides,
 * as pure functions, and every word it says.
 *
 * The drawer is one sheet with four bodies:
 *
 *   review  → the form: what, when, where, a note, and where it is going
 *   confirm → "Did it save?", asked once when the person comes back
 *   added   → it is on the calendar (with a way to take that back)
 *   already → the partner added it first
 *
 * Duo cannot see anyone's calendar. It opens Google's own prefilled form (or
 * hands over a file), and then has to *ask* whether the event was saved. That
 * is the whole reason for the `confirm` body.
 *
 * Nothing here touches React, Supabase, `Linking` or the clock: the platform,
 * today's date and the device's zone all come in as arguments.
 * `add-to-calendar-sheet.tsx` draws what this returns and
 * `add-to-calendar-drawer.tsx` does the side effects. Table-tested in
 * __tests__/add-to-calendar.model.test.ts.
 *
 * ## Phase 1 destinations
 *
 * - **Google Calendar**, everywhere: a prefilled link.
 * - **Calendar file** (`.ics`), on web only: a download.
 * - On a phone, **Another calendar** is offered so it can be asked for. It is
 *   not a destination: picking it shows the "not supported yet" notice.
 */

import type { CalendarAddView } from "@/lib/calendar-add-view";
import { DEFAULT_DURATION_MINUTES, eventSnapshot, type CalendarEvent } from "@/lib/calendar-link";
import { eventTitleFor, type FollowUp } from "@/lib/follow-up";
import type { CalendarAddMethod } from "@/types/database";

/* -------------------------------------------------------------------------- */
/* types                                                                        */
/* -------------------------------------------------------------------------- */

export type CalendarBody = "review" | "confirm" | "added" | "already";

/** `other` is the "Another calendar" choice on a phone: askable, not usable. */
export type Destination = "google" | "ics" | "other";

/** Where the drawer is running. `Platform.OS === "web"` or not. */
export type CalendarPlatform = "web" | "native";

export type CalendarForm = {
	title: string;
	/** `YYYY-MM-DD`, or `""` while no date is picked. */
	date: string;
	allDay: boolean;
	/** `HH:mm`, or `null` while the time field holds nothing usable. */
	time: string | null;
	durationMinutes: number;
	location: string;
	notes: string;
	destination: Destination;
	/** The destination radiogroup is open (first use, or after Change). */
	destinationOpen: boolean;
};

export type CalendarField = "title" | "date" | "time" | "destination";

/* -------------------------------------------------------------------------- */
/* copy                                                                         */
/* -------------------------------------------------------------------------- */

const METHOD_NAME: Record<CalendarAddMethod, string> = {
	google_link: "Google Calendar",
	google_api: "Google Calendar",
	ics: "their calendar",
	system: "their calendar",
};

const FOUND_IN = {
	title: "the title",
	description: "the description",
	option: "the pick",
} as const;

/** Every string the drawer shows or says. */
export const COPY = {
	/** The sheet's own title, for `showDrawer`. */
	drawerTitle: "Add to calendar",

	what: "What",
	whatPlaceholder: "Name the event",
	when: "When",
	whenPlaceholder: "Pick a date",
	/** The date button's accessible name: the label plus the whole date. */
	whenLabel: (fullDate: string | null) => (fullDate ? `When, ${fullDate}` : "When, no date picked"),
	allDay: "All day",
	starts: "Starts",
	howLong: "How long",
	duration: (minutes: number) => `${minutes / 60} hr`,
	durationLabel: (minutes: number) => (minutes === 60 ? "1 hour" : `${minutes / 60} hours`),
	where: "Where",
	wherePlaceholder: "Add a place",
	note: "Note",
	notePlaceholder: "Add a note",
	noteLead: "Decided together in Duo.",
	notePick: (pick: string) => `We picked: ${pick}`,

	addingTo: "Adding to",
	change: "Change",
	changeLabel: "Change calendar",
	destination: {
		google: { name: "Google Calendar", hint: "You'll pick your shared calendar there." },
		ics: {
			name: "Calendar file",
			hint: "A file that opens in Apple Calendar, Outlook and most others.",
		},
		other: { name: "Another calendar", hint: "Apple Calendar, Outlook and others." },
	},

	notNow: "Not now",
	primary: {
		google: "Open in Google Calendar",
		ics: "Get calendar file",
		noDate: "Pick a date first",
		noTitle: "Name it first",
		unsupported: "Not supported yet",
	},

	/** Confidence, as one caption under the date. */
	pickedUp: (text: string, foundIn: keyof typeof FOUND_IN) =>
		`Picked up from “${text}” in ${FOUND_IN[foundIn]}.`,
	readAs: (text: string, day: string) => `We read “${text}” as ${day}. Check that's right.`,

	pastDate: (label: string) => `“${label}” has already passed. Pick the new date.`,
	badTime: "Try a time like 7:30.",

	partnerOpening: (partner: string, method: CalendarAddMethod = "google_link") =>
		`${partner} just opened this in ${METHOD_NAME[method] === "their calendar" ? "a calendar" : METHOD_NAME[method]}. Hold off so it doesn't land twice.`,
	addAnyway: "Add anyway",

	unsupported:
		"We can't add straight to other calendars yet. Want direct adding? Tell us and we'll count your vote.",
	askForIt: "Ask for it",
	useGoogle: "Use Google Calendar",

	openFailed: {
		google: "We couldn't open Google Calendar.",
		ics: "We couldn't make the calendar file.",
	},
	offline: "No connection right now, so nothing was added. Try again when you're back online.",
	/** A "Yes, added" / "Mark as not added" that did not reach the server. */
	notSaved: "No connection right now, so that wasn't saved. Try again when you're back online.",
	tryAgain: "Try again",

	changed: "The details changed since this was added.",
	addAgain: "Add again",

	confirm: {
		heading: "Did it save?",
		body: (partner: string) =>
			`We can't see your calendar, so tell us and ${partner} will know it's handled.`,
		notYet: "Not yet",
		yes: "Yes, added",
	},
	added: {
		heading: "On the calendar",
		body: (partner: string) => `${partner} can see it's handled.`,
		markNotAdded: "Mark as not added",
		done: "Done",
	},
	already: {
		heading: "Already on the calendar",
		body: (partner: string, method: CalendarAddMethod) =>
			`${partner} added this to ${METHOD_NAME[method]}.`,
		shared: "If you two share that calendar, you're set.",
		addMine: "Add to mine too",
		gotIt: "Got it",
	},
} as const;

/* -------------------------------------------------------------------------- */
/* days and times, as words                                                     */
/* -------------------------------------------------------------------------- */

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

const pad = (value: number): string => String(value).padStart(2, "0");

/** The phone's own calendar day. Local on purpose: UTC is tomorrow by evening. */
export const localDay = (now: Date): string =>
	`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

/**
 * A `YYYY-MM-DD` day in words. Worked out on `Date.UTC` as a plain day
 * counter (never a local `Date`, never `toLocaleDateString`), so the answer
 * does not depend on the phone's zone or locale.
 *
 * - `short`: `Fri, Dec 4`
 * - `long`:  `Sat, Dec 12, 2026`
 * - `full`:  `Saturday, December 12, 2026` (for a screen reader)
 *
 * `""` when `date` is not a real day.
 */
export function formatDay(date: string, style: "short" | "long" | "full" = "short"): string {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date ?? "");
	if (!match) return "";
	const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
	const moment = new Date(Date.UTC(year, month - 1, day));
	if (moment.getUTCMonth() !== month - 1 || moment.getUTCDate() !== day) return "";

	const weekday = WEEKDAYS[moment.getUTCDay()];
	if (style === "full") return `${weekday}, ${MONTHS[month - 1]} ${day}, ${year}`;
	const brief = `${weekday.slice(0, 3)}, ${MONTHS[month - 1].slice(0, 3)} ${day}`;
	return style === "long" ? `${brief}, ${year}` : brief;
}

/** `19:30` → `7:30 pm`. `""` when `time` is not a time. */
export function formatTime(time: string | null | undefined): string {
	const match = /^(\d{1,2}):(\d{2})$/.exec(time ?? "");
	if (!match) return "";
	const [hour, minute] = [Number(match[1]), Number(match[2])];
	if (hour > 23 || minute > 59) return "";
	return `${hour % 12 === 0 ? 12 : hour % 12}:${pad(minute)} ${hour >= 12 ? "pm" : "am"}`;
}

/** `Nutcracker · Sat, Dec 12 · 7:30 pm`: the event in one line, for the later bodies. */
export function eventSummary(
	form: Pick<CalendarForm, "title" | "date" | "allDay" | "time">,
): string {
	return [form.title.trim(), formatDay(form.date), form.allDay ? "" : formatTime(form.time)]
		.filter(Boolean)
		.join(" · ");
}

/* -------------------------------------------------------------------------- */
/* the prefill                                                                  */
/* -------------------------------------------------------------------------- */

export type PrefillInput = {
	decisionTitle: string;
	winningOption?: string | null;
	followUp: FollowUp;
};

/**
 * What the decision itself says the event is: the title from `eventTitleFor`,
 * the day and time from `FollowUp.when`. This is the *decision's* event, past
 * date and all, before the person edits anything.
 */
export function prefillOf({ decisionTitle, winningOption, followUp }: PrefillInput): {
	title: string;
	date: string | null;
	time: string | null;
} {
	const when = followUp.when;
	// A parsed date tells `eventTitleFor` exactly what to cut off the title
	// (or that there is nothing to cut). With a stored date, or none, the
	// title may still carry one of its own, so it is left to look.
	const matchedText =
		when?.source === "parsed" ? (when.foundIn === "title" ? when.matchedText : null) : undefined;
	return {
		title: eventTitleFor(decisionTitle, winningOption, matchedText),
		date: when?.date ?? null,
		time: when?.time ?? null,
	};
}

/**
 * The `snapshot` to hand the drawer (and `markOpened` / `markAdded`):
 * `eventSnapshot` of the decision's own prefill, never of what was typed. The
 * card must compute "changed since" from the same function, so it is exported
 * for the caller rather than computed inside the drawer.
 */
export function prefillSnapshot(input: PrefillInput): string {
	const prefill = prefillOf(input);
	return eventSnapshot({ title: prefill.title, date: prefill.date ?? "", time: prefill.time });
}

/** Lengths offered for a timed event. */
export const DURATIONS = [60, 120, 180] as const;

/** The destinations offered here, in order. */
export function destinationsFor(platform: CalendarPlatform): Destination[] {
	return platform === "web" ? ["google", "ics"] : ["google", "other"];
}

/** A remembered destination, if it is still one that can be used here. Else Google. */
export function usableDestination(
	stored: string | null | undefined,
	platform: CalendarPlatform,
): Destination {
	return stored === "ics" && platform === "web" ? "ics" : "google";
}

/** How a destination is recorded in `decision_calendar_adds.method`. */
export function methodFor(destination: Destination): CalendarAddMethod {
	return destination === "ics" ? "ics" : "google_link";
}

/** The note: where this came from, the question, and the answer. */
export function noteFor(decisionTitle: string, winningOption?: string | null): string {
	const question = (decisionTitle ?? "").replace(/\s+/g, " ").trim();
	const pick = (winningOption ?? "").replace(/\s+/g, " ").trim();
	const detail = [question, pick ? COPY.notePick(pick) : ""].filter(Boolean).join("\n");
	return detail ? `${COPY.noteLead}\n\n${detail}` : COPY.noteLead;
}

export type InitialFormInput = PrefillInput & {
	/** What `getLastDestination` returned; `null` on first use. */
	lastDestination?: string | null;
	platform: CalendarPlatform;
};

/**
 * The form as it opens.
 *
 * - **Date**: the decision's, unless it has passed. A past date is not
 *   prefilled (it cannot be added), and the caption says why.
 * - **Time**: only one that was found. None found → All day. Never invented.
 * - **Destination**: the last one used on this device, and the row collapsed;
 *   on first use, Google with the choices open.
 */
export function initialForm(input: InitialFormInput): CalendarForm {
	const prefill = prefillOf(input);
	const usable = prefill.date !== null && !input.followUp.datePast;
	const time = usable ? prefill.time : null;
	return {
		title: prefill.title,
		date: usable ? (prefill.date ?? "") : "",
		allDay: time === null,
		time,
		durationMinutes: DEFAULT_DURATION_MINUTES,
		location: "",
		notes: noteFor(input.decisionTitle, input.winningOption),
		destination: usableDestination(input.lastDestination, input.platform),
		destinationOpen: input.lastDestination == null,
	};
}

/** The field to put focus on when the form opens, if any needs filling in first. */
export function initialFocus(form: CalendarForm): "title" | "date" | null {
	if (form.title.trim() === "") return "title";
	if (form.date === "") return "date";
	return null;
}

/* -------------------------------------------------------------------------- */
/* the caption under the date                                                   */
/* -------------------------------------------------------------------------- */

export type WhenCaption = {
	text: string;
	/** `problem`: the date cannot be used (it has passed). Announced as an alert. */
	tone: "info" | "problem";
};

/**
 * The one line under the date. Confidence is said in words, not in a colour:
 *
 * - a date written out → `Picked up from “Dec 12” in the title.`
 * - a date worked out  → `We read “Friday” as Fri, Dec 4. Check that's right.`
 * - a date that passed → `“Nov 2” has already passed. Pick the new date.`
 *
 * A stored date (confirmed by a person when the decision was made) needs no
 * caption. Neither does a date the person has since changed: the caption is
 * about the prefill, and stops applying once it is replaced.
 */
export function whenCaption(
	followUp: Pick<FollowUp, "when" | "datePast">,
	form: Pick<CalendarForm, "date">,
	today: string,
): WhenCaption | null {
	if (form.date !== "" && form.date < today) {
		return { text: COPY.pastDate(formatDay(form.date)), tone: "problem" };
	}

	const when = followUp.when;
	if (!when) return null;

	if (followUp.datePast) {
		return form.date === ""
			? { text: COPY.pastDate(when.matchedText || formatDay(when.date)), tone: "problem" }
			: null;
	}

	if (form.date !== when.date || when.source !== "parsed" || !when.matchedText) return null;

	return {
		text: when.relative
			? COPY.readAs(when.matchedText, formatDay(when.date))
			: COPY.pickedUp(when.matchedText, when.foundIn ?? "title"),
		tone: "info",
	};
}

/* -------------------------------------------------------------------------- */
/* validation and the button                                                    */
/* -------------------------------------------------------------------------- */

export type Validation = { ok: true } | { ok: false; field: CalendarField; message: string | null };

/** The first thing wrong with the form, in the order the fields are drawn. */
export function validate(form: CalendarForm, today: string): Validation {
	if (form.title.trim() === "") return { ok: false, field: "title", message: null };
	if (form.date === "" || formatDay(form.date) === "") {
		return { ok: false, field: "date", message: null };
	}
	if (form.date < today) {
		return { ok: false, field: "date", message: COPY.pastDate(formatDay(form.date)) };
	}
	if (!form.allDay && formatTime(form.time) === "") {
		return { ok: false, field: "time", message: COPY.badTime };
	}
	if (form.destination === "other")
		return { ok: false, field: "destination", message: COPY.unsupported };
	return { ok: true };
}

export type PrimaryAction = { label: string; disabled: boolean };

/**
 * The primary button. Its label says what is missing when something is
 * (`Pick a date first`), so a disabled button is never a mystery.
 *
 * A missing or bad **time** does not disable it: the press is what turns the
 * time field's error on (`validate` → `field: "time"`), and "Try a time like
 * 7:30." is a better answer there than a third "… first" label.
 *
 * @param blocked The form is fine but pressing must wait: a hand-off is in
 *   flight, or the partner is mid-add and "Add anyway" has not been tapped.
 */
export function primaryAction(form: CalendarForm, today: string, blocked = false): PrimaryAction {
	if (form.title.trim() === "") return { label: COPY.primary.noTitle, disabled: true };
	if (form.date === "" || form.date < today) return { label: COPY.primary.noDate, disabled: true };
	if (form.destination === "other") return { label: COPY.primary.unsupported, disabled: true };
	return { label: COPY.primary[form.destination], disabled: blocked };
}

/** The form as the event to hand off. Call only after `validate` says ok. */
export function buildEvent(form: CalendarForm, tz?: string | null): CalendarEvent {
	return {
		title: form.title.trim(),
		date: form.date,
		time: form.allDay ? null : form.time,
		durationMinutes: form.durationMinutes,
		location: form.location.trim() || null,
		notes: form.notes.trim() || null,
		tz: tz ?? null,
	};
}

/** `Jazz Night!` → `jazz-night.ics`. A name any file system takes. */
export function icsFileName(title: string): string {
	const slug = (title ?? "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 40)
		.replace(/-+$/, "");
	return `${slug || "event"}.ics`;
}

/* -------------------------------------------------------------------------- */
/* the bodies                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Which body the drawer opens on.
 *
 * `requested` is the caller saying which one it wants (the card's "Add to my
 * calendar too" asks for `review` though the partner has added it), and wins.
 * Otherwise the two partners' rows decide:
 *
 * | rows                      | body      |
 * | ------------------------- | --------- |
 * | I added it (or both did)  | `added`   |
 * | the partner added it      | `already` |
 * | I handed off, no answer   | `confirm` |
 * | anything else             | `review`  |
 *
 * A partner who is *mid-add* (`partner-opening`) still opens `review`: the
 * form is shown with the hold-off notice (`partnerHoldsOff`).
 */
export function initialBody(
	kind: CalendarAddView["kind"],
	requested?: "review" | "added" | "already" | null,
): CalendarBody {
	if (requested) return requested;
	switch (kind) {
		case "mine-added":
		case "both-added":
			return "added";
		case "partner-added":
			return "already";
		case "mine-opened":
			return "confirm";
		default:
			return "review";
	}
}

/** The partner handed off moments ago: hold the button back until "Add anyway". */
export const partnerHoldsOff = (kind: CalendarAddView["kind"]): boolean =>
	kind === "partner-opening";

export type BodyEvent =
	/** The person came back from the calendar (or the file was handed over). */
	| "returned"
	/** "Yes, added". */
	| "yes"
	/** "Not yet". */
	| "notYet"
	/** "Mark as not added". */
	| "markNotAdded"
	/** "Add again", after the details changed. */
	| "addAgain"
	/** "Add to mine too". */
	| "addMine";

const TRANSITIONS: Record<CalendarBody, Partial<Record<BodyEvent, CalendarBody>>> = {
	review: { returned: "confirm" },
	confirm: { yes: "added", notYet: "review" },
	added: { markNotAdded: "review", addAgain: "review" },
	already: { addMine: "review" },
};

/** The body after `event`. An event a body does not know leaves it where it is. */
export function nextBody(body: CalendarBody, event: BodyEvent): CalendarBody {
	return TRANSITIONS[body][event] ?? body;
}

/** The heading a body opens with, to draw and to announce. The form has none. */
export function bodyHeading(body: CalendarBody): string | null {
	return body === "review" ? null : COPY[body].heading;
}

/* -------------------------------------------------------------------------- */
/* the footer                                                                   */
/* -------------------------------------------------------------------------- */

/** 16 px semibold, averaged over the labels this drawer uses. */
const CHAR_WIDTH = 8.2;
const BUTTON_PADDING = 2 * 18;
const BUTTON_GAP = 10;
/** `Button` stops growing its label here (CONTROL_MAX_FONT_SCALE). */
const MAX_LABEL_SCALE = 1.3;

/**
 * Whether the two footer buttons should stack: true when their labels, at
 * this text size, would not fit side by side in `width`.
 *
 * An estimate from the character count, not a measurement. It errs toward
 * stacking, which costs a little height; guessing the other way cuts a label
 * off.
 */
export function stackFooter(
	labels: readonly [string, string],
	width: number,
	fontScale = 1,
): boolean {
	const scale = Math.min(Math.max(fontScale || 1, 1), MAX_LABEL_SCALE);
	const needed =
		labels.reduce((sum, label) => sum + label.length * CHAR_WIDTH * scale + BUTTON_PADDING, 0) +
		BUTTON_GAP;
	return needed > width;
}
