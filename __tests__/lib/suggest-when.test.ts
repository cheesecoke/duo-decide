import { suggestWhen, type SuggestedWhen } from "@/lib/suggest-when";

/** Wed, Nov 18, 2026, midday on the phone: the day the decision was created. */
const CREATED = new Date(2026, 10, 18, 12, 0, 0);

type Expected = [date: string, time: string | null, matchedText: string, relative: boolean] | null;

const fromTitle = (title: string, ref: Date = CREATED) => suggestWhen({ title }, ref);

const flat = (found: SuggestedWhen | null): Expected =>
	found ? [found.date, found.time, found.matchedText, found.relative] : null;

describe("suggestWhen", () => {
	describe("a date that was written down", () => {
		it.each<[string, string, Expected]>([
			[
				"the decision that started this",
				"Want to join me at the Nutcracker on Dec 12?",
				["2026-12-12", null, "Dec 12", false],
			],
			["numeric, no year", "11/22", ["2026-11-22", null, "11/22", false]],
			["ISO", "Recital 2026-12-12", ["2026-12-12", null, "2026-12-12", false]],
			["day first", "Flight 12 Dec", ["2026-12-12", null, "12 Dec", false]],
			["an ordinal", "Party Dec 12th", ["2026-12-12", null, "Dec 12th", false]],
			["of-phrase", "Dinner the 14th of December", ["2026-12-14", null, "14th of December", false]],
			[
				"a weekday next to the date does not make it relative",
				"Dinner Fri 12/4 @ 6",
				["2026-12-04", null, "Fri 12/4", false],
			],
			[
				"a past explicit date resolves forward to its next occurrence",
				"Dinner on Nov 2",
				["2027-11-02", null, "Nov 2", false],
			],
			["May as a month", "May 5 picnic", ["2027-05-05", null, "May 5", false]],
			[
				"an explicit year is kept even when it has passed",
				"Wedding 6/14/2025",
				["2025-06-14", null, "6/14/2025", false],
			],
		])("%s: %s", (_name, title, expected) => {
			expect(flat(fromTitle(title))).toEqual(expected);
		});
	});

	describe("a day worked out from when the decision was created", () => {
		it.each<[string, string, Expected]>([
			["tomorrow", "tomorrow", ["2026-11-19", null, "tomorrow", true]],
			["today", "Sushi today?", ["2026-11-18", null, "today", true]],
			["a weekday", "A or B for dinner Thursday?", ["2026-11-19", null, "Thursday", true]],
			["next weekday", "Hike next Friday", ["2026-11-27", null, "next Friday", true]],
			["an unambiguous abbreviation", "Drinks Fri", ["2026-11-20", null, "Fri", true]],
			["a word-weekday with company", "Brunch this Sat", ["2026-11-21", null, "this Sat", true]],
			["tonight is a day, not 22:00", "dinner tonight", ["2026-11-18", null, "tonight", true]],
			["night is not 20:00", "Movie Saturday night", ["2026-11-21", null, "Saturday night", true]],
		])("%s: %s", (_name, title, expected) => {
			expect(flat(fromTitle(title))).toEqual(expected);
		});

		it.each<[string, string, Date, string]>([
			// chrono reads a bare date as noon; after lunch that used to be "already passed".
			["its own date, that afternoon", "Concert Dec 12", new Date(2026, 11, 12, 14, 0), "2026-12-12"],
			[
				"its own weekday, that afternoon",
				"Dinner Friday?",
				new Date(2026, 10, 20, 15, 30),
				"2026-11-20",
			],
			[
				"its own date, late that night",
				"Concert Dec 12",
				new Date(2026, 11, 12, 23, 59),
				"2026-12-12",
			],
			["today, in the evening", "Movie today", new Date(2026, 10, 18, 21, 0), "2026-11-18"],
		])("a decision written on the day itself: %s", (_name, title, created, date) => {
			expect(fromTitle(title, created)?.date).toBe(date);
		});

		it("counts from the created date, not from today", () => {
			// Written on Mon, Nov 30: "Friday" is Dec 4 whenever it is read.
			expect(flat(fromTitle("Dinner Friday", new Date(2026, 10, 30, 9)))).toEqual([
				"2026-12-04",
				null,
				"Friday",
				true,
			]);
		});
	});

	describe("the year rolls over", () => {
		it.each<[string, string, Date, Expected]>([
			[
				"January, written in December",
				"Trip Jan 5",
				new Date(2026, 11, 20, 12),
				["2027-01-05", null, "Jan 5", false],
			],
			[
				"tomorrow, on New Year's Eve",
				"Brunch tomorrow",
				new Date(2026, 11, 31, 23, 30),
				["2027-01-01", null, "tomorrow", true],
			],
			[
				"a weekday across the new year",
				"Skiing Saturday",
				new Date(2026, 11, 30, 12),
				["2027-01-02", null, "Saturday", true],
			],
			[
				"December, written in December, stays put",
				"Party Dec 31",
				new Date(2026, 11, 20, 12),
				["2026-12-31", null, "Dec 31", false],
			],
		])("%s", (_name, title, ref, expected) => {
			expect(flat(fromTitle(title, ref))).toEqual(expected);
		});
	});

	describe("a time is used only when it is certain", () => {
		it.each<[string, string, Expected]>([
			["am/pm", "Dinner Friday at 7:30pm", ["2026-11-20", "19:30", "Friday at 7:30pm", true]],
			["a spaced PM", "Friday at 7 PM", ["2026-11-20", "19:00", "Friday at 7 PM", true]],
			["24-hour", "19:30 Friday", ["2026-11-20", "19:30", "19:30 Friday", true]],
			["noon", "brunch at noon on Saturday", ["2026-11-21", "12:00", "noon on Saturday", true]],
			["with a written date", "Show Dec 31 11pm", ["2026-12-31", "23:00", "Dec 31 11pm", false]],
			[
				"an hour with no am or pm is not guessed",
				"Dec 12 at 7",
				["2026-12-12", null, "Dec 12 at 7", false],
			],
			["nor is a half hour", "Dinner Friday 7:30", ["2026-11-20", null, "Friday 7:30", true]],
			["morning is not 06:00", "Run Friday morning", ["2026-11-20", null, "Friday morning", true]],
		])("%s: %s", (_name, title, expected) => {
			expect(flat(fromTitle(title))).toEqual(expected);
		});
	});

	describe("a date next to the word night", () => {
		// chrono reads "night" as a time of day and loses the date beside it;
		// the text is read again without that word.
		it.each<[string, string, Expected]>([
			["a written date", "Jazz Night on Dec 5?", ["2026-12-05", null, "Dec 5", false]],
			["no preposition", "Movie night Dec 5", ["2026-12-05", null, "Dec 5", false]],
			["a weekday", "Date night on Friday", ["2026-11-20", null, "on Friday", true]],
			["tonight", "Game night tonight", ["2026-11-18", null, "tonight", true]],
			["with a time", "Night out Saturday at 8pm", ["2026-11-21", "20:00", "Saturday at 8pm", true]],
			["and still nothing when there is no date", "Late night snack", null],
			["however many nights", "night night night night night Dec 5", null],
		])("%s: %s", (_name, title, expected) => {
			expect(flat(fromTitle(title))).toEqual(expected);
		});
	});

	describe("nothing to suggest", () => {
		it.each<[string, string]>([
			["no date at all", "Movie night"],
			["may, the verb", "we may go hiking"],
			["may, the verb, in front of a number", "We may 5 times go"],
			["a time with no day", "Dinner at 7"],
			["a time with no day, pm", "Call at 7pm"],
			["a month with no day", "Maybe sushi in May"],
			["a month alone", "March"],
			["sun, the word", "sun or shade"],
			["sat, the word", "sat down"],
			["wed, the word, and a bare month", "Second wed in december"],
			["24/7", "24/7 gym"],
			["yesterday", "What we ate yesterday"],
			["last weekday", "Like last Friday"],
			["days ago", "Ordered 5 days ago"],
			["now", "Order now"],
			["a weekday that disagrees with a day of the month", "Friday the 13th"],
			["numbers that are not dates", "Pick 1 of 2"],
			["an ordinal that is not a date", "the 3rd option"],
			["a link full of numbers", "https://tix.example.com/2026/12/04/show?id=11/22"],
			["empty", ""],
			["spaces", "   "],
		])("%s: %s", (_name, title) => {
			expect(fromTitle(title)).toBeNull();
		});
	});

	describe("which text it came from", () => {
		it("reads the title first", () => {
			expect(
				suggestWhen(
					{ title: "Dinner Dec 12", description: "or Dec 13", winningOption: "Dec 14" },
					CREATED,
				),
			).toMatchObject({ date: "2026-12-12", source: "title" });
		});

		it("then the description", () => {
			expect(
				suggestWhen(
					{ title: "Movie night", description: "Thinking Saturday", winningOption: "Dec 14" },
					CREATED,
				),
			).toMatchObject({ date: "2026-11-21", source: "description", matchedText: "Saturday" });
		});

		it("then the winning option", () => {
			expect(
				suggestWhen(
					{ title: "When should we go?", description: null, winningOption: "Dec 14 at 6pm" },
					CREATED,
				),
			).toEqual({
				date: "2026-12-14",
				time: "18:00",
				matchedText: "Dec 14 at 6pm",
				source: "option",
				relative: false,
			});
		});

		it("skips a link and still reads the words next to it", () => {
			expect(
				suggestWhen(
					{ title: "Tickets", winningOption: "https://tix.example.com/2026/01/02 Sat Dec 12" },
					CREATED,
				),
			).toMatchObject({ date: "2026-12-12", source: "option", matchedText: "Sat Dec 12" });
		});

		it("moves on from a text whose only match was refused", () => {
			expect(
				suggestWhen({ title: "sun or shade", description: "Picnic on Dec 12" }, CREATED),
			).toMatchObject({ date: "2026-12-12", source: "description" });
		});
	});

	describe("never throws into the UI", () => {
		it("is null for a reference date that is not a date", () => {
			expect(fromTitle("Dinner Dec 12", new Date(NaN))).toBeNull();
			expect(suggestWhen({ title: "Dinner Dec 12" }, undefined as unknown as Date)).toBeNull();
		});

		it("is null for texts that are not text", () => {
			expect(suggestWhen({ title: null as unknown as string }, CREATED)).toBeNull();
			expect(suggestWhen(null as unknown as { title: string }, CREATED)).toBeNull();
		});

		it("is null when chrono fails to load", () => {
			jest.isolateModules(() => {
				jest.doMock("chrono-node/dist/cjs/locales/en/index.js", () => {
					throw new Error("Invalid regular expression: invalid group specifier name");
				});
				// eslint-disable-next-line @typescript-eslint/no-require-imports
				const isolated = require("@/lib/suggest-when");
				expect(isolated.suggestWhen({ title: "Dinner Dec 12" }, CREATED)).toBeNull();
				// And it does not try again on every card.
				expect(isolated.suggestWhen({ title: "Dinner Dec 13" }, CREATED)).toBeNull();
			});
			jest.dontMock("chrono-node/dist/cjs/locales/en/index.js");
		});

		it("is null when chrono throws while parsing", () => {
			jest.isolateModules(() => {
				jest.doMock("chrono-node/dist/cjs/locales/en/index.js", () => ({
					parse: () => {
						throw new Error("boom");
					},
				}));
				// eslint-disable-next-line @typescript-eslint/no-require-imports
				const isolated = require("@/lib/suggest-when");
				expect(isolated.suggestWhen({ title: "Dinner Dec 12" }, CREATED)).toBeNull();
			});
			jest.dontMock("chrono-node/dist/cjs/locales/en/index.js");
		});

		it("loads only chrono's English locale", () => {
			jest.isolateModules(() => {
				// eslint-disable-next-line @typescript-eslint/no-require-imports
				const isolated = require("@/lib/suggest-when");
				expect(isolated.suggestWhen({ title: "Dinner Dec 12" }, CREATED)).not.toBeNull();
				const locales = Object.keys(require.cache)
					.map((file) => /chrono-node\/dist\/cjs\/locales\/([a-z]+)\//.exec(file)?.[1])
					.filter(Boolean);
				expect([...new Set(locales)]).toEqual(["en"]);
			});
		});
	});
});
