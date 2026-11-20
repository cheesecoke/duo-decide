/**
 * The event date on a decision (migration 027) in lib/database.ts: the row ↔
 * app mapping, and creating / editing against a database that does not have
 * the columns yet.
 */

type Failure = { code?: string; message: string };

/** Rows sent to `decisions`, in order. */
let mockWrites: { op: "insert" | "update"; row: Record<string, unknown> }[] = [];
/** Errors for the first, second … write to `decisions`; `null` = it works. */
let mockFailures: (Failure | null)[] = [];

const MOCK_SAVED = { id: "d1", title: "Nutcracker", description: null, deadline: null };

jest.mock("@/config/supabase", () => {
	const decisions = () => {
		const chain: Record<string, unknown> = {};
		let write: Failure | null | undefined;
		const start = (op: "insert" | "update") => (row: Record<string, unknown>) => {
			mockWrites.push({ op, row });
			write = mockFailures.shift() ?? null;
			return chain;
		};
		chain.insert = start("insert");
		chain.update = start("update");
		chain.select = () => chain;
		chain.eq = () => chain;
		chain.single = () =>
			Promise.resolve(write ? { data: null, error: write } : { data: MOCK_SAVED, error: null });
		return chain;
	};
	const options = () => {
		const chain: Record<string, unknown> = {};
		chain.select = () => chain;
		chain.eq = () => Promise.resolve({ data: [], error: null });
		return chain;
	};
	return {
		supabase: { from: (table: string) => (table === "decisions" ? decisions() : options()) },
	};
});

/* eslint-disable @typescript-eslint/no-require-imports */
const {
	createDecision,
	eventColumnsOf,
	eventWhenOf,
	isMissingEventColumn,
	updateDecision,
} = require("@/lib/database");
/* eslint-enable @typescript-eslint/no-require-imports */

const NO_COLUMN: Failure = {
	code: "PGRST204",
	message: "Could not find the 'event_on' column of 'decisions' in the schema cache",
};

const NEW_DECISION = {
	couple_id: "couple-1",
	creator_id: "user-1",
	partner_id: "user-2",
	title: "Nutcracker",
	type: "vote" as const,
};

beforeEach(() => {
	mockWrites = [];
	mockFailures = [];
});

describe("eventWhenOf", () => {
	it.each<[string, Record<string, unknown> | null | undefined, unknown]>([
		[
			"a day, a time as Postgres returns it, and a zone",
			{ event_on: "2026-12-12", event_time: "19:30:00", event_tz: "America/Denver" },
			{ eventOn: "2026-12-12", eventTime: "19:30", eventTz: "America/Denver" },
		],
		[
			"all day",
			{ event_on: "2026-12-12", event_time: null, event_tz: null },
			{ eventOn: "2026-12-12", eventTime: null, eventTz: null },
		],
		[
			"a database without the columns",
			{ title: "Nutcracker" },
			{ eventOn: null, eventTime: null, eventTz: null },
		],
		[
			"a time with no day means nothing",
			{ event_on: null, event_time: "19:30:00", event_tz: "America/Denver" },
			{ eventOn: null, eventTime: null, eventTz: null },
		],
		[
			"a day that is not a day",
			{ event_on: "soon", event_time: "19:30:00" },
			{ eventOn: null, eventTime: null, eventTz: null },
		],
		["no row", null, { eventOn: null, eventTime: null, eventTz: null }],
		["undefined", undefined, { eventOn: null, eventTime: null, eventTz: null }],
	])("%s", (_name, row, expected) => {
		expect(eventWhenOf(row)).toEqual(expected);
	});
});

describe("eventColumnsOf", () => {
	it.each<[string, Record<string, unknown>, Record<string, unknown>]>([
		["nothing given, nothing written", {}, {}],
		["a form with other fields only", { title: "x", dueDate: "" }, {}],
		[
			"all three",
			{ eventOn: "2026-12-12", eventTime: "19:30", eventTz: "America/Denver" },
			{ event_on: "2026-12-12", event_time: "19:30", event_tz: "America/Denver" },
		],
		["a day alone leaves the time alone", { eventOn: "2026-12-12" }, { event_on: "2026-12-12" }],
		[
			"all day clears the time",
			{ eventOn: "2026-12-12", eventTime: null },
			{ event_on: "2026-12-12", event_time: null },
		],
		[
			"clearing the day clears all three",
			{ eventOn: null },
			{ event_on: null, event_time: null, event_tz: null },
		],
		[
			"an empty day is no day",
			{ eventOn: "", eventTime: "19:30" },
			{ event_on: null, event_time: null, event_tz: null },
		],
	])("%s", (_name, when, expected) => {
		expect(eventColumnsOf(when)).toEqual(expected);
	});
});

describe("isMissingEventColumn", () => {
	it("knows PostgREST's and Postgres's not-there errors, for these columns only", () => {
		expect(isMissingEventColumn(NO_COLUMN)).toBe(true);
		expect(
			isMissingEventColumn({ code: "42703", message: 'column "event_time" does not exist' }),
		).toBe(true);
		expect(
			isMissingEventColumn({ code: "42703", message: "column decisions.archived_at does not exist" }),
		).toBe(false);
		expect(isMissingEventColumn({ message: "permission denied" })).toBe(false);
	});
});

describe("before migration 027 is applied", () => {
	it("creates the decision without its event date rather than not at all", async () => {
		mockFailures = [NO_COLUMN];

		const result = await createDecision(
			{ ...NEW_DECISION, event_on: "2026-12-12", event_time: "19:30", event_tz: "America/Denver" },
			[],
		);

		expect(result.error).toBeNull();
		expect(mockWrites.map((write) => write.row)).toEqual([
			{ ...NEW_DECISION, event_on: "2026-12-12", event_time: "19:30", event_tz: "America/Denver" },
			NEW_DECISION,
		]);
	});

	it("saves the rest of an edit", async () => {
		mockFailures = [NO_COLUMN];

		const result = await updateDecision("d1", { title: "The Nutcracker", event_on: "2026-12-12" });

		expect(result.error).toBeNull();
		expect(mockWrites).toEqual([
			{ op: "update", row: { title: "The Nutcracker", event_on: "2026-12-12" } },
			{ op: "update", row: { title: "The Nutcracker" } },
		]);
	});

	it("does not retry an error about something else, or a write with no event date in it", async () => {
		mockFailures = [{ message: "permission denied" }];
		expect((await createDecision({ ...NEW_DECISION, event_on: "2026-12-12" }, [])).error).toBe(
			"permission denied",
		);

		mockFailures = [NO_COLUMN];
		expect((await updateDecision("d1", { title: "x" })).error).toBe(NO_COLUMN.message);

		expect(mockWrites).toHaveLength(2);
	});
});

describe("once it is", () => {
	it("writes the event date in one go", async () => {
		await createDecision({ ...NEW_DECISION, event_on: "2026-12-12" }, []);
		await updateDecision("d1", { event_on: null, event_time: null, event_tz: null });

		expect(mockWrites).toEqual([
			{ op: "insert", row: { ...NEW_DECISION, event_on: "2026-12-12" } },
			{ op: "update", row: { event_on: null, event_time: null, event_tz: null } },
		]);
	});
});
