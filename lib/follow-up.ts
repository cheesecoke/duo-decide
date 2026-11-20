/**
 * follow-up — what, if anything, a decided decision should offer next.
 *
 * A decided card shows **one** button, or none:
 *
 *   a date           → Add to calendar
 *   a link in the winning option → Open link
 *   "yes" on a yes/no → Decide the next thing
 *
 * No AI and no topic-guessing. Each action is triggered by a typed thing (a
 * date, a link) or a shape (two options, yes and no), never by a keyword:
 * "dinner" needs no calendar, "dinner on the 14th" does, and the date says so
 * without the word "dinner".
 *
 * ## The ladder
 *
 * Most reliable first; the first that fires takes the slot.
 *
 * 1. `event_date`  — a date stored on the decision (`eventOn`), confirmed by a
 *    person when they created it.
 * 2. `parsed_date` — a date read from the title, description or winning
 *    option (lib/suggest-when.ts), counted from the day the decision was
 *    created.
 * 3. `url`         — a link in the winning option (lib/linkify.ts).
 * 4. `yes_shape`   — exactly two options, one a yes and one a no, and the yes
 *    won. There is no yes/no type in the schema; the shape is the type.
 *
 * ## When nothing is suggested
 *
 * - The decision is not completed.
 * - **A "no" won** ("No", "Nope", "Pass", "Not this time" …), whatever else
 *   is on the card. A date on something you decided not to do is not an
 *   event.
 * - **The date has passed.** The slot stays empty rather than falling through
 *   to the next rung: the card is about that date, and offering "Open link"
 *   for last month's concert reads as a mistake.
 *
 * `available` is what the ⋮ menu can offer regardless. A completed decision
 * always has `calendar` there, so a miss by the ladder costs one extra tap
 * and a wrong suggestion costs nothing.
 *
 * ## `signal` when nothing is suggested
 *
 * `signal` is the best signal that was *detected*, even when the suggestion
 * was held back (a "no" won, the date passed). That is what the measurement
 * needs: "picked from the menu with signal `none`" is the miss rate, and a
 * menu pick on a card whose date had passed is not a miss.
 *
 * Pure: `now` comes in as an argument. Table-tested in
 * __tests__/lib/follow-up.test.ts.
 */

import { linksIn } from "@/lib/linkify";
import { suggestWhen, type WhenSource } from "@/lib/suggest-when";

export type FollowUpAction = "calendar" | "open_link" | "decide_next";

export type FollowUpSignal = "event_date" | "parsed_date" | "url" | "yes_shape" | "none";

export type FollowUpWhen = {
	/** `YYYY-MM-DD`. */
	date: string;
	/** `HH:mm`, or `null` for all day. */
	time: string | null;
	/** The words a parsed date was read from (`Dec 12`). Empty for a stored date. */
	matchedText: string;
	/** True when a parsed day was worked out ("Friday"), not written ("Dec 12"). */
	relative: boolean;
	/** `stored` = the decision's own event date; `parsed` = read from its text. */
	source: "stored" | "parsed";
	/** Which text a parsed date was found in. `null` for a stored date. */
	foundIn: WhenSource | null;
};

export type FollowUpInput = {
	title: string;
	description?: string | null;
	options: { title: string; isWinner: boolean }[];
	/** When the decision was created: relative dates ("Friday") count from here. */
	createdAt: string | Date | null | undefined;
	/** The stored event date, `YYYY-MM-DD` (UIDecision.eventOn). */
	eventOn?: string | null;
	/** The stored event time, `HH:mm` (UIDecision.eventTime). */
	eventTime?: string | null;
	status: "pending" | "voted" | "completed";
	now: Date;
};

export type FollowUp = {
	/** The one action for the card's footer slot, or `null` for no button. */
	suggested: FollowUpAction | null;
	/** What was detected (see "`signal` when nothing is suggested"). */
	signal: FollowUpSignal;
	/** The date found, past or future, or `null`. Prefills the calendar drawer. */
	when: FollowUpWhen | null;
	/** True when `when` is a day before today. */
	datePast: boolean;
	/** The first link in the winning option, ready to open, or `null`. */
	link: string | null;
	/** Exactly two options, one a yes and one a no. */
	isYesNo: boolean;
	/** The winning option is a "no". */
	negativeWon: boolean;
	/** Everything the ⋮ menu may offer, in ladder order. Empty until completed. */
	available: FollowUpAction[];
};

/* -------------------------------------------------------------------------- */
/* yes and no                                                                   */
/* -------------------------------------------------------------------------- */

const YES = new Set([
	"yes",
	"yep",
	"yeah",
	"yea",
	"yup",
	"ya",
	"y",
	"sure",
	"ok",
	"okay",
	"absolutely",
	"definitely",
	"of course",
	"for sure",
	"yes please",
	"hell yes",
	"heck yes",
	"im in",
	"i am in",
	"count me in",
	"lets do it",
	"lets go",
	"do it",
	"sounds good",
	"sounds great",
]);

const NO = new Set([
	"no",
	"nope",
	"nah",
	"n",
	"pass",
	"hard pass",
	"no thanks",
	"no thank you",
	"not this time",
	"not now",
	"not really",
	"not today",
	"lets not",
	"skip",
	"skip it",
	"neither",
	"none",
	"none of these",
	"im out",
	"i am out",
	"count me out",
	"maybe later",
	"another time",
	"rain check",
]);

/** "Yes!" / "  NOPE. " / "Let's do it" → `yes` / `nope` / `lets do it`. Emoji and punctuation go. */
const normalize = (text: string | null | undefined): string =>
	(text ?? "")
		.toLowerCase()
		.replace(/['’`]/g, "")
		.replace(/[^a-z0-9]+/g, " ")
		.trim();

/** The option says yes ("Yes!", "Yep", "I'm in"). */
export const isYesWord = (text: string | null | undefined): boolean => YES.has(normalize(text));

/** The option says no ("No", "Nope", "Pass", "Not this time"). */
export const isNoWord = (text: string | null | undefined): boolean => NO.has(normalize(text));

/* -------------------------------------------------------------------------- */
/* days                                                                         */
/* -------------------------------------------------------------------------- */

const pad = (value: number): string => String(value).padStart(2, "0");

/** The phone's own calendar day. Local on purpose: UTC is tomorrow by evening. */
const localDay = (date: Date): string =>
	`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const validDate = (value: string | Date | null | undefined): Date | null => {
	if (value == null || value === "") return null;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** `19:30` or Postgres's `19:30:00` → `19:30`; anything else → `null`. */
const toTime = (value: string | null | undefined): string | null => {
	const match = /^([01]\d|2[0-3]):([0-5]\d)(?::\d{2})?$/.exec(value ?? "");
	return match ? `${match[1]}:${match[2]}` : null;
};

/* -------------------------------------------------------------------------- */
/* the resolver                                                                 */
/* -------------------------------------------------------------------------- */

const NOTHING: FollowUp = {
	suggested: null,
	signal: "none",
	when: null,
	datePast: false,
	link: null,
	isYesNo: false,
	negativeWon: false,
	available: [],
};

/** What a decision offers next. Never throws: on bad input it offers nothing. */
export function resolveFollowUp(input: FollowUpInput): FollowUp {
	try {
		const options = Array.isArray(input.options) ? input.options : [];
		const isYesNo =
			options.length === 2 &&
			((isYesWord(options[0].title) && isNoWord(options[1].title)) ||
				(isNoWord(options[0].title) && isYesWord(options[1].title)));

		if (input.status !== "completed") return { ...NOTHING, isYesNo };

		const winner = options.find((option) => option.isWinner) ?? null;
		const negativeWon = winner != null && isNoWord(winner.title);
		const yesWon = isYesNo && winner != null && isYesWord(winner.title);

		const now = validDate(input.now) ?? new Date();

		// Rungs 1 and 2: a stored date beats a parsed one.
		let when: FollowUpWhen | null = null;
		if (input.eventOn && DAY.test(input.eventOn)) {
			when = {
				date: input.eventOn,
				time: toTime(input.eventTime),
				matchedText: "",
				relative: false,
				source: "stored",
				foundIn: null,
			};
		} else {
			const parsed = suggestWhen(
				{ title: input.title, description: input.description, winningOption: winner?.title },
				validDate(input.createdAt) ?? now,
			);
			if (parsed) {
				when = {
					date: parsed.date,
					time: parsed.time,
					matchedText: parsed.matchedText,
					relative: parsed.relative,
					source: "parsed",
					foundIn: parsed.source,
				};
			}
		}
		const datePast = when != null && when.date < localDay(now);

		// Rung 3.
		const link = winner ? (linksIn(winner.title)[0]?.url ?? null) : null;

		const signal: FollowUpSignal = when
			? when.source === "stored"
				? "event_date"
				: "parsed_date"
			: link
				? "url"
				: yesWon
					? "yes_shape"
					: "none";

		let suggested: FollowUpAction | null = null;
		if (!negativeWon && !datePast) {
			if (when) suggested = "calendar";
			else if (link) suggested = "open_link";
			else if (yesWon) suggested = "decide_next";
		}

		const available: FollowUpAction[] = ["calendar"];
		if (link) available.push("open_link");
		if (yesWon) available.push("decide_next");

		return { suggested, signal, when, datePast, link, isYesNo, negativeWon, available };
	} catch {
		return NOTHING;
	}
}

/* -------------------------------------------------------------------------- */
/* the event's title                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The ways a decision title asks, longest first. Only what is safe to cut:
 * what is left after one of these is the thing itself.
 */
const FRAMING: RegExp[] = [
	/^(?:do|would|did|will) you (?:want|wanna|like|care) to /i,
	/^(?:do|would) you (?:want|wanna|like|fancy) /i,
	/^(?:want|wanna|care|like) to /i,
	/^(?:should|shall|can|could) we /i,
	/^(?:are|r) (?:you|we|u) (?:up|down|free|in|game|keen) (?:for|to) /i,
	/^(?:how|what) about /i,
	/^lets /i,
	/^let['’]s /i,
	/^up for /i,
];

/** After the ask, the verb that only says "be there": "join me at", "go to". */
const LEAD_IN: RegExp[] = [
	/^(?:join|meet) (?:me|us) (?:at|for|to|in|on) /i,
	/^(?:come|go) (?:with (?:me|us) )?(?:to|see|for) /i,
	/^(?:come|go) with (?:me|us) /i,
	/^(?:attend|see|watch|do|try|have|grab|get|go|visit|catch) /i,
];

const ARTICLE = /^(?:the|a|an) /i;

/** What is left when the ask was the whole title: "Want to go?" → "go". */
const STUB = /^(?:go|come|join|do|try|see|it|this|that|one|some|something|out)$/i;

/** The preposition a date hangs off at the end of a title: "… on Dec 12". */
const DATE_LINK = /[\s,(–—-]+(?:on|at|for|this|next|by|around|the)?\s*$/i;

/** Text of a title's own date, to cut off the end ("… on Dec 12"). */
function withoutTrailingDate(title: string, matchedText: string | null): string {
	if (!matchedText) return title;
	const at = title.lastIndexOf(matchedText);
	if (at <= 0) return title;
	// Only a date that ends the title. One in the middle is part of the name.
	if (title.slice(at + matchedText.length).replace(/[\s?!.)]+/g, "") !== "") return title;
	const head = title.slice(0, at).replace(DATE_LINK, "");
	return head.trim().length >= 2 ? head : title;
}

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

const withoutQuestionMark = (title: string): string => title.replace(/[\s?]+$/, "").trim();

/** The winning option as a title: no links, no dangling "Name: " colon. */
function optionAsTitle(option: string): string {
	const withoutLinks = linksIn(option).reduce((text, link) => text.replace(link.text, " "), option);
	return withoutLinks
		.replace(/\s+/g, " ")
		.replace(/[\s:;,\-–—|(]+$/, "")
		.trim();
}

/**
 * What to call the event.
 *
 * - **The winning option**, when it names something: "Tacos", "Alexa Sharf"
 *   (from "Alexa Sharf: https://…").
 * - When the winner is a yes/no word (or empty, or only a link), **the
 *   decision title with the question taken off**: "Want to join me at Jazz
 *   Night on Dec 5?" → "Jazz Night".
 *
 * Trimming is best effort and conservative. It only cuts an opening it
 * recognises ("Want to …", "Should we …", "join me at …") and a date at the
 * very end. If the title does not open that way, the answer is the title
 * minus its trailing "?" (and trailing date): a slightly long event name is
 * better than a mangled one.
 *
 * @param matchedText The title's date as written ("Dec 5"), if already known
 *   (`FollowUp.when.matchedText` when `foundIn` is `title`). Left out, the
 *   title is parsed for one.
 */
export function eventTitleFor(
	decisionTitle: string,
	winningOptionTitle: string | null | undefined,
	matchedText?: string | null,
): string {
	const title = (decisionTitle ?? "").replace(/\s+/g, " ").trim();
	const winner = optionAsTitle(winningOptionTitle ?? "");

	if (winner && !isYesWord(winner) && !isNoWord(winner)) return winner;

	const plain = withoutQuestionMark(title);
	const dateText =
		matchedText !== undefined
			? matchedText
			: (suggestWhen({ title }, new Date())?.matchedText ?? null);
	const undated = withoutQuestionMark(withoutTrailingDate(plain, dateText));

	// "dinner tonight" → "Dinner": what is left after a cut starts a title.
	const whole = undated && undated !== plain ? capitalize(undated) : undated || plain;

	const framing = FRAMING.find((pattern) => pattern.test(undated));
	if (!framing) return whole;

	let rest = undated.replace(framing, "");
	const leadIn = LEAD_IN.find((pattern) => pattern.test(rest));
	if (leadIn) rest = rest.replace(leadIn, "");
	rest = rest.replace(ARTICLE, "").trim();

	// Cut down to nothing, or to a stub ("Want to go?"): the question was the
	// whole title, so it stays whole.
	return rest.length >= 2 && !STUB.test(rest) ? capitalize(rest) : whole;
}
