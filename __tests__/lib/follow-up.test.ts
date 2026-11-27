import {
	eventTitleFor,
	isNoWord,
	isYesWord,
	resolveFollowUp,
	type FollowUp,
	type FollowUpInput,
} from "@/lib/follow-up";

/** Wed, Nov 18, 2026: the decision is created, and (unless a test says otherwise) read. */
const CREATED = new Date(2026, 10, 18, 9, 0, 0);
const NOW = new Date(2026, 10, 18, 20, 0, 0);

const opts = (...titles: string[]) =>
	titles.map((title) => ({
		title: title.replace(/^\*/, ""),
		isWinner: title.startsWith("*"),
	}));

/** A completed decision; the winning option is the one written with a `*`. */
const decided = (over: Partial<FollowUpInput> = {}): FollowUpInput => ({
	title: "Movie night",
	description: "",
	options: opts("*Dune", "Arrival"),
	createdAt: CREATED,
	status: "completed",
	now: NOW,
	...over,
});

type Row = [
	name: string,
	input: Partial<FollowUpInput>,
	expected: Pick<FollowUp, "suggested" | "signal" | "available">,
];

describe("resolveFollowUp", () => {
	describe("the ladder", () => {
		it.each<Row>([
			[
				"nothing detected: no button, calendar still in the menu",
				{},
				{ suggested: null, signal: "none", available: ["calendar"] },
			],
			[
				"a stored event date",
				{ eventOn: "2026-12-12" },
				{ suggested: "calendar", signal: "event_date", available: ["calendar"] },
			],
			[
				"a date in the title",
				{ title: "Want to join me at the Nutcracker on Dec 12?", options: opts("*Yes", "No") },
				{
					suggested: "calendar",
					signal: "parsed_date",
					available: ["calendar", "decide_next"],
				},
			],
			[
				"a date in the description",
				{ description: "Thinking this Saturday" },
				{ suggested: "calendar", signal: "parsed_date", available: ["calendar"] },
			],
			[
				"a date in the winning option",
				{ title: "When should we go?", options: opts("Dec 5", "*Dec 12") },
				{ suggested: "calendar", signal: "parsed_date", available: ["calendar"] },
			],
			[
				"a link in the winning option",
				{
					title: "Which therapist?",
					options: opts("*Alexa Sharf: https://www.psychologytoday.com/us/therapists/1234567", "Sam"),
				},
				{ suggested: "open_link", signal: "url", available: ["calendar", "open_link"] },
			],
			[
				"a link in a losing option is not a signal",
				{ options: opts("*Dune", "Arrival https://example.com/arrival") },
				{ suggested: null, signal: "none", available: ["calendar"] },
			],
			[
				"yes wins a yes/no",
				{ title: "Should we get a dog?", options: opts("*Yes", "No") },
				{
					suggested: "decide_next",
					signal: "yes_shape",
					available: ["calendar", "decide_next"],
				},
			],
			[
				"a date beats a link",
				{
					title: "Concert Dec 12",
					options: opts("*https://tix.example.com/show", "Skip it"),
				},
				{ suggested: "calendar", signal: "parsed_date", available: ["calendar", "open_link"] },
			],
			[
				"a link beats a yes",
				{
					title: "Book this one?",
					options: opts("*Yes", "No").map((o, i) =>
						i === 0 ? { ...o, title: "www.airbnb.com/rooms/42" } : o,
					),
				},
				{ suggested: "open_link", signal: "url", available: ["calendar", "open_link"] },
			],
			[
				"a stored date beats a parsed one",
				{ title: "Dinner Dec 12", eventOn: "2026-12-13" },
				{ suggested: "calendar", signal: "event_date", available: ["calendar"] },
			],
		])("%s", (_name, input, expected) => {
			expect(resolveFollowUp(decided(input))).toMatchObject(expected);
		});
	});

	describe("when a no wins", () => {
		it.each<[string, string]>([
			["No", "No"],
			["Nope", "Nope"],
			["Pass", "Pass"],
			["Not this time", "Not this time"],
			["shouted, with punctuation", "NO!!"],
			["with an apostrophe", "Let's not"],
		])("suggests nothing: %s", (_name, no) => {
			const result = resolveFollowUp(
				decided({
					title: "Want to join me at the Nutcracker on Dec 12?",
					options: opts("Yes", `*${no}`),
				}),
			);
			expect(result).toMatchObject({
				suggested: null,
				negativeWon: true,
				// The date was still seen: a menu pick here is not a miss.
				signal: "parsed_date",
				available: ["calendar"],
			});
			expect(result.when).toMatchObject({ date: "2026-12-12" });
		});

		it("suggests nothing even outside a yes/no shape", () => {
			expect(
				resolveFollowUp(
					decided({ title: "Dinner Dec 12", options: opts("Tacos", "Thai", "*Neither") }),
				),
			).toMatchObject({ suggested: null, negativeWon: true, isYesNo: false });
		});

		it("has no 'decide the next thing' in the menu", () => {
			expect(
				resolveFollowUp(decided({ title: "Should we get a dog?", options: opts("Yes", "*No") })),
			).toEqual({
				suggested: null,
				signal: "none",
				when: null,
				datePast: false,
				link: null,
				isYesNo: true,
				negativeWon: true,
				available: ["calendar"],
			});
		});
	});

	describe("when the date has passed", () => {
		it("suggests nothing, and does not fall through to the link", () => {
			expect(
				resolveFollowUp(
					decided({
						eventOn: "2026-11-17",
						options: opts("*https://tix.example.com/show", "Skip"),
					}),
				),
			).toMatchObject({
				suggested: null,
				signal: "event_date",
				datePast: true,
				link: "https://tix.example.com/show",
				available: ["calendar", "open_link"],
			});
		});

		it("today is not past, whatever the time", () => {
			expect(resolveFollowUp(decided({ eventOn: "2026-11-18", eventTime: "08:00" }))).toMatchObject({
				suggested: "calendar",
				datePast: false,
			});
		});

		it("a parsed date goes stale as the days pass", () => {
			const friday = decided({ title: "Dinner Friday" });
			expect(resolveFollowUp(friday)).toMatchObject({ suggested: "calendar", datePast: false });
			expect(resolveFollowUp({ ...friday, now: new Date(2026, 10, 20, 23, 59) })).toMatchObject({
				suggested: "calendar",
			});
			expect(resolveFollowUp({ ...friday, now: new Date(2026, 10, 21, 0, 1) })).toMatchObject({
				suggested: null,
				signal: "parsed_date",
				datePast: true,
			});
		});
	});

	describe("when", () => {
		it("carries a stored date and its time", () => {
			expect(resolveFollowUp(decided({ eventOn: "2026-12-12", eventTime: "19:30" })).when).toEqual({
				date: "2026-12-12",
				time: "19:30",
				matchedText: "",
				relative: false,
				source: "stored",
				foundIn: null,
			});
		});

		it("takes a time as Postgres returns it, and drops one that is not a time", () => {
			expect(
				resolveFollowUp(decided({ eventOn: "2026-12-12", eventTime: "19:30:00" })).when?.time,
			).toBe("19:30");
			expect(
				resolveFollowUp(decided({ eventOn: "2026-12-12", eventTime: "evening" })).when?.time,
			).toBeNull();
		});

		it("ignores a stored date that is not a day, and parses instead", () => {
			expect(resolveFollowUp(decided({ title: "Dinner Dec 12", eventOn: "soon" })).when).toMatchObject(
				{ date: "2026-12-12", source: "parsed" },
			);
		});

		it("says where a parsed date came from and how it was written", () => {
			expect(resolveFollowUp(decided({ title: "Dinner Friday at 7:30pm" })).when).toEqual({
				date: "2026-11-20",
				time: "19:30",
				matchedText: "Friday at 7:30pm",
				relative: true,
				source: "parsed",
				foundIn: "title",
			});
		});

		it("counts a relative day from when the decision was created, not from now", () => {
			// Created Wed Nov 18; read two weeks later. "Friday" is still Nov 20.
			const result = resolveFollowUp(
				decided({
					title: "Dinner Friday",
					createdAt: "2026-11-18T16:00:00Z",
					now: new Date(2026, 11, 2),
				}),
			);
			expect(result.when?.date).toBe("2026-11-20");
			expect(result).toMatchObject({ suggested: null, datePast: true });
		});

		it("falls back to now when the created date is missing or broken", () => {
			for (const createdAt of [null, undefined, "", "not a date"]) {
				expect(resolveFollowUp(decided({ title: "Dinner tomorrow", createdAt })).when?.date).toBe(
					"2026-11-19",
				);
			}
		});
	});

	describe("the link", () => {
		it("is the first link in the winner, ready to open", () => {
			expect(
				resolveFollowUp(decided({ options: opts("*See www.yelp.com/biz/foo, or https://b.com", "x") }))
					.link,
			).toBe("https://www.yelp.com/biz/foo");
		});
	});

	describe("the yes/no shape", () => {
		it.each<[string, string[], boolean]>([
			["Yes / No", ["Yes", "No"], true],
			["either order", ["No", "Yes"], true],
			["case and punctuation", ["YES!", "nope."], true],
			["casual", ["I'm in", "Pass"], true],
			["with emoji", ["Yes 🎉", "No 😢"], true],
			["three options", ["Yes", "No", "Maybe"], false],
			["two yeses", ["Yes", "Yep"], false],
			["yes and something else", ["Yes", "Tacos"], false],
			["a sentence that starts with yes", ["Yes but later", "No"], false],
			["one option", ["Yes"], false],
			["none", [], false],
		])("%s", (_name, titles, expected) => {
			expect(resolveFollowUp(decided({ options: opts(...titles) })).isYesNo).toBe(expected);
		});

		it("needs the shape, not just a winning yes", () => {
			expect(resolveFollowUp(decided({ options: opts("*Yes", "Tacos", "Thai") }))).toMatchObject({
				suggested: null,
				signal: "none",
				available: ["calendar"],
			});
		});

		it("knows its words", () => {
			expect(isYesWord("Yep!")).toBe(true);
			expect(isYesWord("Yesterday")).toBe(false);
			expect(isNoWord("Not this time")).toBe(true);
			expect(isNoWord("Noodles")).toBe(false);
			expect(isNoWord(null)).toBe(false);
		});
	});

	describe("before it is decided", () => {
		it.each(["pending", "voted"] as const)("offers nothing while %s", (status) => {
			expect(
				resolveFollowUp(
					decided({ status, title: "Nutcracker on Dec 12?", options: opts("Yes", "No") }),
				),
			).toEqual({
				suggested: null,
				signal: "none",
				when: null,
				datePast: false,
				link: null,
				isYesNo: true,
				negativeWon: false,
				available: [],
			});
		});
	});

	it("offers nothing, rather than throwing, on input it cannot read", () => {
		expect(resolveFollowUp(null as unknown as FollowUpInput).suggested).toBeNull();
		expect(
			resolveFollowUp(decided({ options: null as unknown as FollowUpInput["options"] })),
		).toMatchObject({ suggested: null, available: ["calendar"] });
		expect(
			resolveFollowUp(decided({ title: "Dinner tomorrow", now: new Date(NaN) })).suggested,
		).not.toBeUndefined();
	});
});

describe("eventTitleFor", () => {
	it.each<[string, string, string | null, string]>([
		["the winning option", "What for dinner?", "Tacos", "Tacos"],
		[
			"the winner without its link",
			"Which therapist?",
			"Alexa Sharf: https://www.psychologytoday.com/us/therapists/1234567",
			"Alexa Sharf",
		],
		["the spec's example", "Want to join me at Jazz Night on Dec 5?", "Yes", "Jazz Night"],
		[
			"the decision that started this",
			"Want to join me at the Nutcracker on Dec 12?",
			"Yes",
			"Nutcracker",
		],
		["should we", "Should we go to the farmers market Saturday?", "Yep", "Farmers market"],
		["do you want to", "Do you want to see Wicked on 11/22?", "Yes!", "Wicked"],
		["how about", "How about sushi tomorrow?", "Sure", "Sushi"],
		["up for", "Are you up for a hike this Saturday?", "I'm in", "Hike"],
		["let's", "Let's try the new ramen place Friday", "Yes", "New ramen place"],
		["a date and a time at the end", "Want to grab dinner Friday at 7:30pm?", "Yes", "Dinner"],
		["no framing: the title minus its ?", "Nutcracker with my mom?", "Yes", "Nutcracker with my mom"],
		["no framing, a date at the end", "Dinner Friday at 7:30pm", "Yes", "Dinner"],
		["no framing, with on", "Jazz Night on Dec 5?", "Yes", "Jazz Night"],
		["what is left after a cut is capitalised", "dinner tonight", "Yes", "Dinner"],
		["nothing cut, nothing recased", "iPad or laptop?", "Yes", "iPad or laptop"],
		[
			"a date in the middle is part of the name",
			"Dec 12 Nutcracker with my mom?",
			"Yes",
			"Dec 12 Nutcracker with my mom",
		],
		["unsure: left alone", "Is the lake house a good idea?", "Yes", "Is the lake house a good idea"],
		["a no winner is not a title either", "Want to see Wicked?", "Nope", "Wicked"],
		[
			"a winner that is only a link",
			"Dinner at Sushi Zanmai?",
			"https://sushizanmai.com",
			"Dinner at Sushi Zanmai",
		],
		["no winner", "Should we book the cabin?", null, "Book the cabin"],
		["a title that is all question", "Want to go?", "Yes", "Want to go"],
		["a title that is only a date", "Tomorrow?", "Yes", "Tomorrow"],
		["extra spaces", "  Want to   join me at  Jazz Night ?", "Yes", "Jazz Night"],
		["empty", "", "Yes", ""],
	])("%s: %s", (_name, title, winner, expected) => {
		expect(eventTitleFor(title, winner)).toBe(expected);
	});

	it("uses the date text it is given instead of parsing again", () => {
		expect(eventTitleFor("Want to join me at Jazz Night on Dec 5?", "Yes", "Dec 5")).toBe(
			"Jazz Night",
		);
		// Told there is no date in the title, it cuts none.
		expect(eventTitleFor("Jazz Night on Dec 5?", "Yes", null)).toBe("Jazz Night on Dec 5");
	});
});
