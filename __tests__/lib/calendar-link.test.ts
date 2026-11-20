import {
	calendarUid,
	eventSnapshot,
	googleCalendarUrl,
	icsText,
	type CalendarEvent,
	type SnapshotEvent,
} from "@/lib/calendar-link";

const event = (over: Partial<CalendarEvent> = {}): CalendarEvent => ({
	title: "Nutcracker",
	date: "2026-12-12",
	time: null,
	durationMinutes: 60,
	...over,
});

/** The link's query, decoded, as a plain object. */
function query(url: string | null): Record<string, string> {
	expect(url).not.toBeNull();
	const [base, search] = (url as string).split("?");
	expect(base).toBe("https://calendar.google.com/calendar/render");
	return Object.fromEntries(
		search.split("&").map((pair) => {
			const [key, value] = pair.split("=");
			return [key, decodeURIComponent(value)];
		}),
	);
}

const STAMP = new Date(Date.UTC(2026, 10, 18, 19, 5, 9));

describe("googleCalendarUrl", () => {
	it("is the prefilled new-event form", () => {
		expect(googleCalendarUrl(event())).toBe(
			"https://calendar.google.com/calendar/render?action=TEMPLATE&text=Nutcracker&dates=20261212/20261213",
		);
	});

	describe("the dates", () => {
		it.each<[string, Partial<CalendarEvent>, string]>([
			["all day ends on the next day, exclusive", {}, "20261212/20261213"],
			["all day at a month end", { date: "2026-11-30" }, "20261130/20261201"],
			["all day on New Year's Eve", { date: "2026-12-31" }, "20261231/20270101"],
			["all day on a leap day", { date: "2028-02-29" }, "20280229/20280301"],
			["all day before a leap day", { date: "2028-02-28" }, "20280228/20280229"],
			["all day, Feb 28 in a common year", { date: "2027-02-28" }, "20270228/20270301"],
			["all day ignores the duration", { durationMinutes: 180 }, "20261212/20261213"],
			["timed, local, no Z", { time: "19:30" }, "20261212T193000/20261212T203000"],
			["three hours", { time: "19:30", durationMinutes: 180 }, "20261212T193000/20261212T223000"],
			["across midnight", { time: "23:30", durationMinutes: 60 }, "20261212T233000/20261213T003000"],
			[
				"across a month end",
				{ date: "2026-11-30", time: "22:00", durationMinutes: 180 },
				"20261130T220000/20261201T010000",
			],
			[
				"across New Year",
				{ date: "2026-12-31", time: "23:00", durationMinutes: 120 },
				"20261231T230000/20270101T010000",
			],
			["midnight is a time, not all day", { time: "00:00" }, "20261212T000000/20261212T010000"],
			["a time as Postgres returns it", { time: "19:30:00" }, "20261212T193000/20261212T203000"],
			[
				"a missing duration is an hour",
				{ time: "09:00", durationMinutes: 0 },
				"20261212T090000/20261212T100000",
			],
			[
				"so is one that is not a number",
				{ time: "09:00", durationMinutes: NaN },
				"20261212T090000/20261212T100000",
			],
			["a time that is not a time is all day", { time: "7ish" }, "20261212/20261213"],
		])("%s", (_name, over, dates) => {
			expect(query(googleCalendarUrl(event(over))).dates).toBe(dates);
		});

		it("does not depend on the phone's time zone", () => {
			const before = process.env.TZ;
			try {
				for (const zone of ["Pacific/Kiritimati", "Pacific/Pago_Pago", "America/Denver"]) {
					process.env.TZ = zone;
					expect(query(googleCalendarUrl(event())).dates).toBe("20261212/20261213");
					expect(query(googleCalendarUrl(event({ time: "23:30" }))).dates).toBe(
						"20261212T233000/20261213T003000",
					);
				}
			} finally {
				process.env.TZ = before;
			}
		});
	});

	it("sends the zone with a timed event, and never with an all-day one", () => {
		expect(query(googleCalendarUrl(event({ time: "19:30", tz: "America/Denver" }))).ctz).toBe(
			"America/Denver",
		);
		expect(googleCalendarUrl(event({ time: "19:30", tz: "America/Denver" }))).toContain(
			"ctz=America%2FDenver",
		);
		expect(query(googleCalendarUrl(event({ tz: "America/Denver" })))).not.toHaveProperty("ctz");
		expect(query(googleCalendarUrl(event({ time: "19:30", tz: null })))).not.toHaveProperty("ctz");
	});

	it("encodes what a person typed", () => {
		const url = googleCalendarUrl(
			event({
				title: "Sam's B.B.Q. & beer? #1 / 100% 🎄",
				location: "12 Pearl St, Boulder",
				notes: "Decided together in Duo.\nBring: cash & a coat",
			}),
		);
		expect(url).not.toMatch(/[ #\n]|&beer/);
		expect(query(url)).toEqual({
			action: "TEMPLATE",
			text: "Sam's B.B.Q. & beer? #1 / 100% 🎄",
			dates: "20261212/20261213",
			details: "Decided together in Duo.\nBring: cash & a coat",
			location: "12 Pearl St, Boulder",
		});
	});

	it("leaves out what is empty", () => {
		expect(
			Object.keys(query(googleCalendarUrl(event({ location: "  ", notes: "", tz: "" })))),
		).toEqual(["action", "text", "dates"]);
	});

	it.each(["", "2026-13-01", "2026-02-30", "12/12/2026", "2026-12-12T19:30"])(
		"is null for a date that is not a real day: %s",
		(date) => {
			expect(googleCalendarUrl(event({ date }))).toBeNull();
			expect(icsText(event({ date }), "uid", STAMP)).toBeNull();
		},
	);
});

describe("icsText", () => {
	const UID = calendarUid("d1");

	it("is one all-day event, CRLF throughout", () => {
		expect(icsText(event(), UID, STAMP)).toBe(
			[
				"BEGIN:VCALENDAR",
				"VERSION:2.0",
				"PRODID:-//Duo Decide//Add to calendar//EN",
				"CALSCALE:GREGORIAN",
				"BEGIN:VEVENT",
				"UID:decision-d1@duo-decide.com",
				"DTSTAMP:20261118T190509Z",
				"DTSTART;VALUE=DATE:20261212",
				"DTEND;VALUE=DATE:20261213",
				"SUMMARY:Nutcracker",
				"END:VEVENT",
				"END:VCALENDAR",
				"",
			].join("\r\n"),
		);
	});

	it("writes a timed event as floating local time, with the zone as a hint", () => {
		const text = icsText(
			event({ time: "23:30", durationMinutes: 60, tz: "America/Denver", location: "Home" }),
			UID,
			STAMP,
		) as string;
		const lines = text.split("\r\n");
		expect(lines).toContain("DTSTART:20261212T233000");
		expect(lines).toContain("DTEND:20261213T003000");
		expect(lines).toContain("X-WR-TIMEZONE:America/Denver");
		expect(lines).toContain("LOCATION:Home");
		expect(text).not.toMatch(/TZID|DTSTART:\d+T\d+Z/);
	});

	it("has no bare line feed anywhere", () => {
		const text = icsText(event({ notes: "one\ntwo\r\nthree\rfour" }), UID, STAMP) as string;
		expect(text.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
		expect(text).toContain("DESCRIPTION:one\\ntwo\\nthree\\nfour\r\n");
	});

	it("escapes the characters the format gives a meaning to", () => {
		const text = icsText(
			event({ title: "Dinner; drinks, dancing \\ more", location: "A, B; C" }),
			UID,
			STAMP,
		) as string;
		expect(text).toContain("SUMMARY:Dinner\\; drinks\\, dancing \\\\ more\r\n");
		expect(text).toContain("LOCATION:A\\, B\\; C\r\n");
	});

	it("folds a long line at 75 octets, and unfolds back to what was written", () => {
		const notes = "Decided together in Duo. ".repeat(12).trim();
		const text = icsText(event({ notes }), UID, STAMP) as string;
		const lines = text.split("\r\n");
		for (const line of lines) expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
		expect(lines.filter((line) => line.startsWith(" ")).length).toBeGreaterThan(2);
		expect(text.replace(/\r\n /g, "")).toContain(`DESCRIPTION:${notes}\r\n`);
	});

	it("never folds inside a character", () => {
		const title = "🎄é日".repeat(30);
		const text = icsText(event({ title }), UID, STAMP) as string;
		for (const line of text.split("\r\n")) {
			expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
			// A cut surrogate pair or multi-byte sequence would not survive this.
			expect(Buffer.from(line, "utf8").toString("utf8")).toBe(line);
			expect(line).not.toMatch(/[\uD800-\uDBFF]$|^ ?[\uDC00-\uDFFF]/);
		}
		expect(text.replace(/\r\n /g, "")).toContain(`SUMMARY:${title}\r\n`);
	});

	it("keeps the same UID for the same decision", () => {
		expect(calendarUid("d1")).toBe(calendarUid("d1"));
		expect(calendarUid("d1")).not.toBe(calendarUid("d2"));
		const first = icsText(event(), UID, STAMP) as string;
		const edited = icsText(event({ title: "The Nutcracker", time: "19:30" }), UID, STAMP) as string;
		const uid = (text: string) => /UID:(.*)\r\n/.exec(text)?.[1];
		expect(uid(edited)).toBe(uid(first));
	});

	it("stamps it with now unless told otherwise", () => {
		expect(icsText(event(), UID)).toMatch(/DTSTAMP:\d{8}T\d{6}Z\r\n/);
	});
});

describe("eventSnapshot", () => {
	const base = {
		title: "Nutcracker",
		date: "2026-12-12",
		time: "19:30",
		location: "Ellie Caulkins",
	};

	it("is short, versioned and the same every time", () => {
		expect(eventSnapshot(base)).toMatch(/^v1:[0-9a-f]{8}$/);
		expect(eventSnapshot(base)).toBe(eventSnapshot({ ...base }));
	});

	it.each<[string, Partial<SnapshotEvent>]>([
		["the title", { title: "Swan Lake" }],
		["the day", { date: "2026-12-13" }],
		["the time", { time: "20:00" }],
		["timed to all day", { time: null }],
		["the place", { location: "Home" }],
		["no place", { location: null }],
	])("changes with %s", (_name, over) => {
		expect(eventSnapshot({ ...base, ...over })).not.toBe(eventSnapshot(base));
	});

	it.each<[string, Record<string, unknown>]>([
		["case", { title: "NUTCRACKER" }],
		["surrounding and repeated spaces", { title: "  Nutcracker ", location: "Ellie   Caulkins" }],
		["seconds on the time", { time: "19:30:00" }],
		["the note, the length and the zone", { notes: "x", durationMinutes: 180, tz: "Asia/Tokyo" }],
	])("does not change with %s", (_name, over) => {
		expect(eventSnapshot({ ...base, ...over })).toBe(eventSnapshot(base));
	});

	it("treats a missing place and an empty one alike", () => {
		const { location: _location, ...noPlace } = base;
		expect(eventSnapshot(noPlace)).toBe(eventSnapshot({ ...base, location: "" }));
	});

	it("does not confuse a field's end with the next one's start", () => {
		expect(eventSnapshot({ title: "a", date: "2026-12-12", time: null, location: "b" })).not.toBe(
			eventSnapshot({ title: "a b", date: "2026-12-12", time: null }),
		);
	});
});
