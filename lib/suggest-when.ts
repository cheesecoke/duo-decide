/**
 * suggest-when — read a date (and, when it is certain, a time) out of what a
 * person typed for a decision.
 *
 * "Want to join me at the Nutcracker on Dec 12?" → 2026-12-12, all day.
 * "Dinner Friday at 7:30pm" → the Friday after the decision was created, 19:30.
 * "Movie night" → nothing.
 *
 * The result is only ever a *suggestion*: a prefill someone confirms, on the
 * create form's chip or in the Add-to-calendar drawer. So this file chooses
 * precision over recall. A missed date costs one tap in a date field; a wrong
 * one puts the wrong day on a shared calendar.
 *
 * The parsing itself is chrono-node's English parser. This file is the rules
 * around it.
 *
 * ## What is accepted
 *
 * - A match must name a **day**: a day of the month ("Dec 12", "11/22",
 *   "2026-12-12") or a weekday or day word ("Friday", "tomorrow", "tonight").
 * - **A time alone is not a date** ("Dinner at 7", "at 7pm" → nothing).
 *   chrono would guess today or tomorrow; a guess is not something to prefill.
 * - **A month alone is not a date** ("Maybe sushi in May", "March").
 * - Looking back is not a plan: "yesterday", "last Friday", "3 days ago".
 * - "now" is not a date.
 * - Texts are read title → description → winning option, and the first
 *   accepted match wins.
 * - Links are skipped: "https://site.com/2026/12/04/tickets" is not a date.
 *
 * ## Known false positives, guarded
 *
 * - **"may"** the verb: "we may 5 times go" is not May 5. A "may" that follows
 *   a subject ("we may", "I may", "it may") is skipped.
 * - **sun / sat / wed / mon** on their own are words first ("sun or shade",
 *   "sat down"). They count with anything next to them ("this Sat", "Sat at
 *   7", "Sat 12/5"), not alone. Fri, Tue, Thu and the full names always count.
 * - **"24/7"** is not July 24.
 * - **"Friday the 13th"**: chrono reads the weekday and drops the day of the
 *   month. Two answers, so no answer.
 *
 * And one false negative, recovered: **"Jazz Night on Dec 5"**. chrono takes
 * "Night" for a time of day and loses the date next to it; the text is read
 * a second time without that word (`withoutFirstWord`).
 *
 * ## Dates and times
 *
 * - `ref` is the decision's **created** date, not today: "Friday" means the
 *   Friday after it was written. `forwardDate` is on, so an explicit date with
 *   no year lands on its next occurrence ("Nov 2" written on Nov 18 is next
 *   year's; "Jan 5" written in December is three weeks away).
 * - `relative` is true when the day was worked out from `ref` ("Friday",
 *   "tomorrow") rather than written down ("Dec 12"). The drawer words its
 *   caption differently for the two.
 * - **A time is never invented.** `time` is set only when the text gives an
 *   hour chrono is certain of *and* which half of the day it is: "7:30pm",
 *   "19:30", "noon". "Friday at 7" is a date with no time. "tonight" and
 *   "Saturday night" are days, not 22:00 and 20:00.
 * - The date is read off chrono's own year/month/day, in the phone's zone,
 *   never through `toISOString` (UTC would move an evening to tomorrow).
 *
 * ## Loading chrono
 *
 * chrono is `require`d on first use, inside a `try`, and only its English
 * locale: other locales' regexes are known to break on Hermes
 * (https://github.com/wanasit/chrono/issues/527). If it fails to load, or
 * throws while parsing, `suggestWhen` returns `null` and the app carries on
 * with an empty date field. Nothing here may throw into the UI.
 *
 * The path is spelled out (`dist/cjs/locales/en`) rather than the package's
 * `chrono-node/en` export because metro.config.js turns package exports off
 * (`unstable_enablePackageExports: false`, for supabase-js). jest, which does
 * read exports, is pointed at the same file by `moduleNameMapper`.
 *
 * Pure apart from that one `require`; table-tested in
 * __tests__/lib/suggest-when.test.ts.
 */

export type WhenSource = "title" | "description" | "option";

export type SuggestedWhen = {
	/** `YYYY-MM-DD`. */
	date: string;
	/** `HH:mm` (24-hour), or `null` when the text gives no certain time. */
	time: string | null;
	/** The words the date was read from, exactly as written: `Dec 12`. */
	matchedText: string;
	/** Which text it was found in. */
	source: WhenSource;
	/** True when the day was worked out from `ref` ("Friday"), not written ("Dec 12"). */
	relative: boolean;
};

export type WhenTexts = {
	title: string;
	description?: string | null;
	winningOption?: string | null;
};

/* -------------------------------------------------------------------------- */
/* chrono, loaded late                                                          */
/* -------------------------------------------------------------------------- */

type Component = "year" | "month" | "day" | "weekday" | "hour" | "minute" | "meridiem";

/** The slice of chrono's `ParsedResult` this file reads. */
type ChronoResult = {
	index: number;
	text: string;
	start: {
		get(component: Component): number | null;
		isCertain(component: Component): boolean;
	};
};

type Chrono = {
	parse(text: string, ref: Date, options: { forwardDate: boolean }): ChronoResult[];
};

/** `undefined` = not tried yet, `null` = tried and failed (not retried). */
let chrono: Chrono | null | undefined;

function loadChrono(): Chrono | null {
	if (chrono !== undefined) return chrono;
	try {
		// Lazy and guarded on purpose (see "Loading chrono" above).
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const loaded = require("chrono-node/dist/cjs/locales/en/index.js");
		chrono = typeof loaded?.parse === "function" ? (loaded as Chrono) : null;
	} catch {
		chrono = null;
	}
	return chrono;
}

/* -------------------------------------------------------------------------- */
/* the rules                                                                    */
/* -------------------------------------------------------------------------- */

/** Longest text handed to the parser. A description can be a pasted page. */
const MAX_LENGTH = 400;

const LOOKS_BACK = /\b(?:yesterday|ago|last|previous|past)\b/i;

const NOW = /^(?:right\s+)?now$/i;

/** A weekday abbreviation that is a word in its own right. */
const WORD_WEEKDAY = /^(?:sun|sat|wed|mon)$/i;

/** "we may", "I may", "it may": the verb, not the month. */
const MAY_AFTER_SUBJECT =
	/\b(?:i|we|you|they|he|she|it|that|this|there|who|which|what|one|someone|somebody|everyone|people)\s+$/i;

/** A month by name, or a numeric date: the day was written, not worked out. */
const WRITTEN_DATE =
	/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b|\d{1,4}[/.-]\d{1,2}/i;

const NOON_OR_MIDNIGHT = /\b(?:noon|midday|midnight)\b/i;

/** "Friday the 13th": a day of the month chrono left behind. */
const TRAILING_DAY_OF_MONTH = /^\s*(?:the\s+)?\d{1,2}(?:st|nd|rd|th)\b/i;

/** Same shape as lib/linkify.ts's: a pasted URL is full of numbers that are not dates. */
const LINK = /(?:https?:\/\/|www\.)[^\s<>"]+/gi;

/** Blank out links, keeping every other character where it was. */
const withoutLinks = (text: string): string =>
	text.replace(LINK, (link) => " ".repeat(link.length));

const MAX_PASSES = 3;

/**
 * "Jazz Night on Dec 5": chrono reads "Night" as a time of day, glues it to
 * the date after it, and ends up with a match that names no day at all, so
 * `accept` refuses it and Dec 5 is lost. "Movie night", "date night" and
 * "game night" are how couples title things, so this is the common case, not
 * a corner.
 *
 * When a refused match has no day and more than one word, this returns the
 * text with the match's first word blanked out, to be parsed again: what is
 * left ("on Dec 5") is read on its own. `null` when there is nothing to retry.
 */
function withoutFirstWord(result: ChronoResult, text: string): string | null {
	if (result.start.isCertain("day") || result.start.isCertain("weekday")) return null;
	const word = /^\S+(?=\s+\S)/.exec(result.text)?.[0];
	if (!word) return null;
	return (
		text.slice(0, result.index) + " ".repeat(word.length) + text.slice(result.index + word.length)
	);
}

const pad = (value: number, width = 2): string => String(value).padStart(width, "0");

function accept(result: ChronoResult, text: string): Omit<SuggestedWhen, "source"> | null {
	const { start } = result;
	const matched = result.text.trim();

	// A day, or nothing: no bare times, no bare months.
	if (!start.isCertain("day") && !start.isCertain("weekday")) return null;

	if (NOW.test(matched) || LOOKS_BACK.test(matched)) return null;
	if (WORD_WEEKDAY.test(matched)) return null;
	if (matched === "24/7") return null;

	const before = text.slice(0, result.index);
	const after = text.slice(result.index + result.text.length);
	if (/^may\b/i.test(matched) && MAY_AFTER_SUBJECT.test(before)) return null;

	const written = WRITTEN_DATE.test(matched);
	if (!written && TRAILING_DAY_OF_MONTH.test(after)) return null;

	const year = start.get("year");
	const month = start.get("month");
	const day = start.get("day");
	if (year == null || month == null || day == null) return null;

	let time: string | null = null;
	const hour = start.get("hour");
	if (
		hour != null &&
		start.isCertain("hour") &&
		(start.isCertain("meridiem") || NOON_OR_MIDNIGHT.test(matched))
	) {
		time = `${pad(hour)}:${pad(start.get("minute") ?? 0)}`;
	}

	return {
		date: `${pad(year, 4)}-${pad(month)}-${pad(day)}`,
		time,
		matchedText: matched,
		relative: !written,
	};
}

/**
 * The first date found in a decision's texts, or `null`.
 *
 * @param ref The decision's created date; relative words resolve from it.
 */
export function suggestWhen(texts: WhenTexts, ref: Date): SuggestedWhen | null {
	try {
		if (!(ref instanceof Date) || Number.isNaN(ref.getTime())) return null;
		// chrono gives a date with no time an implied noon, and `forwardDate`
		// pushes anything before the reference on. Read from the *start* of the
		// created day, or "Dec 12" written on Dec 12 after lunch lands next year
		// and "Friday" written on a Friday afternoon lands a week late.
		const day = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());

		const parser = loadChrono();
		if (!parser) return null;

		const sources: [WhenSource, string | null | undefined][] = [
			["title", texts.title],
			["description", texts.description],
			["option", texts.winningOption],
		];

		for (const [source, raw] of sources) {
			if (typeof raw !== "string" || !raw.trim()) continue;

			let text = withoutLinks(raw.slice(0, MAX_LENGTH));

			// A second look, for "night" (see `withoutFirstWord`). Bounded: each
			// pass blanks a word, and a title has few of those.
			for (let pass = 0; pass < MAX_PASSES && text.trim(); pass++) {
				let retry: string | null = null;

				for (const result of parser.parse(text, day, { forwardDate: true })) {
					const found = accept(result, text);
					if (found) return { ...found, source };
					retry ??= withoutFirstWord(result, text);
				}

				if (retry === null) break;
				text = retry;
			}
		}
		return null;
	} catch {
		return null;
	}
}
