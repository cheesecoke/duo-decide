/**
 * calendar-link — turn one event into the two things that can leave the app:
 * a Google Calendar "new event" link, and the text of an `.ics` file.
 *
 * Duo does not write to anyone's calendar. It opens Google's own prefilled
 * form (or hands over a file), and the person picks the calendar and saves
 * there. Everything about those two formats lives in this file, because the
 * Google link is not an official API: its parameters are documented by the
 * community, not by Google
 * (https://github.com/InteractionDesignFoundation/add-event-to-calendar-docs/blob/master/services/google.md).
 * If the format moves, this is the one place to change.
 *
 * Pure, no React Native; table-tested in __tests__/lib/calendar-link.test.ts.
 *
 * ## Dates and times
 *
 * An event is a calendar day (`YYYY-MM-DD`) and maybe a wall-clock time
 * (`HH:mm`). Neither is ever turned into a local `Date`: `new Date(y, m, d)`
 * and `toISOString` depend on the phone's zone and would move "Sat, Dec 12" a
 * day for half the world. The arithmetic here (the day after, a start plus a
 * duration, across midnight, a month end or New Year) is done on `Date.UTC`
 * as a plain day counter, which has no zone and no daylight saving.
 *
 * - **Timed**: start and end as local wall-clock time with no `Z`
 *   (`20261212T193000`). Google reads them in `ctz` when the zone is known,
 *   and in the calendar's own zone when it is not.
 * - **All day** (`time: null`): the end date is **exclusive**, in both
 *   formats. Dec 12 all day is `20261212/20261213`. `durationMinutes` is not
 *   used.
 *
 * ## The .ics text
 *
 * RFC 5545: CRLF line endings, TEXT values escaped, lines folded at 75
 * octets. Times are written **floating** (no `Z`, no `TZID`): a `TZID` is
 * only valid next to a `VTIMEZONE` block describing that zone's rules, which
 * would mean shipping a time-zone database. Floating means "7:30 pm wherever
 * the calendar is", which is what someone adding dinner to their own phone
 * means. The zone, when known, rides along as `X-WR-TIMEZONE`, a hint most
 * calendars honour.
 *
 * No `URL` here, for the reason in lib/linkify.ts: React Native's polyfill is
 * incomplete. The link is built with `encodeURIComponent`.
 */

export type CalendarEvent = {
	title: string;
	/** The day, `YYYY-MM-DD`. */
	date: string;
	/** Wall-clock start, `HH:mm` (24-hour). `null` = all day. */
	time: string | null;
	/** Length of a timed event. Ignored for an all-day one. */
	durationMinutes: number;
	location?: string | null;
	notes?: string | null;
	/** IANA zone of `time` ("America/Denver"). Left out = the calendar's own. */
	tz?: string | null;
};

/** Used when `durationMinutes` is missing or not a positive number. */
export const DEFAULT_DURATION_MINUTES = 60;

const GOOGLE_BASE = "https://calendar.google.com/calendar/render";

const pad = (value: number, width = 2): string => String(value).padStart(width, "0");

/* -------------------------------------------------------------------------- */
/* days and times as plain numbers                                              */
/* -------------------------------------------------------------------------- */

type Day = { year: number; month: number; day: number };

/** `YYYY-MM-DD` → its parts, or `null` if it is not a real day (Feb 30). */
function parseDay(value: string): Day | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
	if (!match) return null;
	const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
	const check = new Date(Date.UTC(year, month - 1, day));
	const real =
		check.getUTCFullYear() === year &&
		check.getUTCMonth() === month - 1 &&
		check.getUTCDate() === day;
	return real ? { year, month, day } : null;
}

/** `HH:mm` (or Postgres's `HH:mm:ss`) → minutes since midnight, or `null`. */
function parseTime(value: string | null | undefined): number | null {
	const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value ?? "");
	if (!match) return null;
	const [hours, minutes] = [Number(match[1]), Number(match[2])];
	return hours > 23 || minutes > 59 ? null : hours * 60 + minutes;
}

/** `day` moved by whole days and minutes, as `YYYYMMDD` and `HHmm`. */
function shift(day: Day, days: number, minutes = 0): { ymd: string; hm: string } {
	const moved = new Date(Date.UTC(day.year, day.month - 1, day.day + days, 0, minutes));
	return {
		ymd: `${pad(moved.getUTCFullYear(), 4)}${pad(moved.getUTCMonth() + 1)}${pad(moved.getUTCDate())}`,
		hm: `${pad(moved.getUTCHours())}${pad(moved.getUTCMinutes())}`,
	};
}

type Span =
	| { allDay: true; start: string; end: string }
	| { allDay: false; start: string; end: string };

/**
 * The event's start and end in the compact form both formats share:
 * `YYYYMMDD` for all day (end exclusive), `YYYYMMDDTHHmmSS` for timed.
 * `null` when the date is not a real day.
 */
function spanOf(event: CalendarEvent): Span | null {
	const day = parseDay(event.date);
	if (!day) return null;

	const startMinutes = parseTime(event.time);
	if (startMinutes === null) {
		return { allDay: true, start: shift(day, 0).ymd, end: shift(day, 1).ymd };
	}

	const duration =
		Number.isFinite(event.durationMinutes) && event.durationMinutes > 0
			? Math.round(event.durationMinutes)
			: DEFAULT_DURATION_MINUTES;
	const start = shift(day, 0, startMinutes);
	const end = shift(day, 0, startMinutes + duration);
	return {
		allDay: false,
		start: `${start.ymd}T${start.hm}00`,
		end: `${end.ymd}T${end.hm}00`,
	};
}

const clean = (value: string | null | undefined): string => (value ?? "").trim();

/* -------------------------------------------------------------------------- */
/* Google Calendar                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Google Calendar's prefilled new-event form for `event`.
 *
 * `text` and `dates` are always there; `details`, `location` and `ctz` only
 * when there is something to put in them (`ctz` only for a timed event: an
 * all-day one has no zone). `null` when the date is not a real day, so the
 * caller never opens a link Google will reject.
 */
export function googleCalendarUrl(event: CalendarEvent): string | null {
	const span = spanOf(event);
	if (!span) return null;

	const params: [string, string][] = [
		["action", "TEMPLATE"],
		["text", clean(event.title)],
		["dates", `${span.start}/${span.end}`],
	];
	if (clean(event.notes)) params.push(["details", clean(event.notes)]);
	if (clean(event.location)) params.push(["location", clean(event.location)]);
	if (!span.allDay && clean(event.tz)) params.push(["ctz", clean(event.tz)]);

	// `dates` keeps its slash: Google wants `start/end`, and every writer of
	// this format sends it bare.
	const query = params
		.map(([key, value]) =>
			key === "dates" ? `${key}=${value}` : `${key}=${encodeURIComponent(value)}`,
		)
		.join("&");
	return `${GOOGLE_BASE}?${query}`;
}

/* -------------------------------------------------------------------------- */
/* .ics                                                                         */
/* -------------------------------------------------------------------------- */

/**
 * The same UID for the same decision, every time. A calendar that already
 * has the event then updates it instead of adding a second one.
 */
export const calendarUid = (decisionId: string): string => `decision-${decisionId}@duo-decide.com`;

/** RFC 5545 §3.3.11: backslash, semicolon, comma and newline are escaped. */
function escapeText(value: string): string {
	return value
		.replace(/\\/g, "\\\\")
		.replace(/\r\n|\r|\n/g, "\\n")
		.replace(/;/g, "\\;")
		.replace(/,/g, "\\,");
}

/** How many bytes a code point takes in UTF-8. */
function utf8Length(codePoint: number): number {
	if (codePoint < 0x80) return 1;
	if (codePoint < 0x800) return 2;
	if (codePoint < 0x10000) return 3;
	return 4;
}

/**
 * RFC 5545 §3.1: no line longer than 75 octets; a longer one continues on
 * the next line after a single space. Counted in UTF-8 bytes, and never cut
 * inside a character.
 */
function fold(line: string): string[] {
	const lines: string[] = [];
	let current = "";
	let bytes = 0;
	for (const char of line) {
		const size = utf8Length(char.codePointAt(0) ?? 0);
		if (bytes + size > 75) {
			lines.push(current);
			// The leading space counts toward the next line's 75.
			current = " ";
			bytes = 1;
		}
		current += char;
		bytes += size;
	}
	lines.push(current);
	return lines;
}

/** A moment as iCalendar's UTC date-time, `20261118T190000Z`. */
function utcStamp(moment: Date): string {
	return (
		`${pad(moment.getUTCFullYear(), 4)}${pad(moment.getUTCMonth() + 1)}${pad(moment.getUTCDate())}` +
		`T${pad(moment.getUTCHours())}${pad(moment.getUTCMinutes())}${pad(moment.getUTCSeconds())}Z`
	);
}

/**
 * `event` as the text of an `.ics` file: one VCALENDAR holding one VEVENT.
 *
 * @param uid   Stable per decision: pass `calendarUid(decision.id)`.
 * @param stamp DTSTAMP, "when this file was made". Now, unless a test pins it.
 * @returns `null` when the date is not a real day.
 */
export function icsText(
	event: CalendarEvent,
	uid: string,
	stamp: Date = new Date(),
): string | null {
	const span = spanOf(event);
	if (!span) return null;

	const lines = [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//Duo Decide//Add to calendar//EN",
		"CALSCALE:GREGORIAN",
	];
	if (!span.allDay && clean(event.tz)) lines.push(`X-WR-TIMEZONE:${escapeText(clean(event.tz))}`);

	lines.push("BEGIN:VEVENT", `UID:${escapeText(uid)}`, `DTSTAMP:${utcStamp(stamp)}`);
	if (span.allDay) {
		lines.push(`DTSTART;VALUE=DATE:${span.start}`, `DTEND;VALUE=DATE:${span.end}`);
	} else {
		lines.push(`DTSTART:${span.start}`, `DTEND:${span.end}`);
	}
	lines.push(`SUMMARY:${escapeText(clean(event.title))}`);
	if (clean(event.location)) lines.push(`LOCATION:${escapeText(clean(event.location))}`);
	if (clean(event.notes)) lines.push(`DESCRIPTION:${escapeText(clean(event.notes))}`);
	lines.push("END:VEVENT", "END:VCALENDAR");

	return lines.flatMap(fold).join("\r\n") + "\r\n";
}

/* -------------------------------------------------------------------------- */
/* "changed since"                                                              */
/* -------------------------------------------------------------------------- */

/** What a snapshot is taken of: what, when and where. Not the note or the length. */
export type SnapshotEvent = Pick<CalendarEvent, "title" | "date" | "time"> & {
	location?: string | null;
};

/**
 * A short, stable fingerprint of an event's what / when / where, stored in
 * `decision_calendar_adds.snapshot`. The card compares it with the snapshot
 * of the decision as it stands now; if they differ, "the details changed
 * since this was added".
 *
 * **Take it of the decision's own prefill, not of what was typed in the
 * drawer.** The card can only recompute the prefill, so a snapshot of an
 * edited title would read as "changed" for ever.
 *
 * Case, surrounding space and runs of spaces do not count as a change. The
 * `v1:` prefix is the recipe's version: change the recipe, change the prefix,
 * and old rows simply stop matching instead of matching wrongly.
 *
 * Not a secret and not collision-proof (32-bit FNV-1a): it only has to tell
 * "the same event" from "an edited one".
 */
export function eventSnapshot(event: SnapshotEvent): string {
	const tidy = (value: string | null | undefined) => clean(value).toLowerCase().replace(/\s+/g, " ");
	const time = parseTime(event.time);
	const canonical = [
		tidy(event.title),
		clean(event.date),
		time === null ? "" : `${pad(Math.floor(time / 60))}:${pad(time % 60)}`,
		tidy(event.location),
	].join("\u001f");

	let hash = 0x811c9dc5;
	for (let i = 0; i < canonical.length; i++) {
		hash ^= canonical.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return `v1:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

/* -------------------------------------------------------------------------- */
/* the phone's zone                                                             */
/* -------------------------------------------------------------------------- */

/** The device's IANA zone ("America/Denver"), or `null` where `Intl` cannot say. */
export function deviceTimeZone(): string | null {
	try {
		const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		return typeof zone === "string" && zone.includes("/") ? zone : null;
	} catch {
		return null;
	}
}
