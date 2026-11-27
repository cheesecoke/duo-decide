/**
 * lib/calendar-adds.ts: what each call sends to Supabase and how it reads the
 * mockAnswer. The RLS behind it is supabase/tests/decision-calendar.test.mjs.
 */

type Answer = { data: unknown; error: { code?: string; message?: string } | null };

/** Every mockBuilder call, in order: `["from", "decision_calendar_adds"], ["upsert", {...}, {...}]`. */
let mockCalls: unknown[][] = [];
let mockAnswer: Answer = { data: null, error: null };
let onPostgresChange: (payload: Record<string, unknown>) => void = () => {};
let onChannelStatus: (status: string) => void = () => {};

const mockBuilder: Record<string, unknown> = {};
for (const method of ["select", "eq", "neq", "order", "upsert", "update"]) {
	mockBuilder[method] = (...args: unknown[]) => {
		mockCalls.push([method, ...args]);
		return mockBuilder;
	};
}
mockBuilder.single = () => Promise.resolve(mockAnswer);
mockBuilder.maybeSingle = () => Promise.resolve(mockAnswer);
// Awaiting the mockBuilder itself, as `fetchCalendarAdds` does after `.order()`.
mockBuilder.then = (resolve: (value: Answer) => unknown) =>
	Promise.resolve(mockAnswer).then(resolve);

const mockChannel = {
	on: (_type: string, filter: unknown, handler: typeof onPostgresChange) => {
		mockCalls.push(["on", filter]);
		onPostgresChange = handler;
		return mockChannel;
	},
	subscribe: (handler: typeof onChannelStatus) => {
		onChannelStatus = handler;
		return mockChannel;
	},
};

jest.mock("@/config/supabase", () => ({
	supabase: {
		from: (table: string) => {
			mockCalls.push(["from", table]);
			return mockBuilder;
		},
		channel: (name: string) => {
			mockCalls.push(["channel", name]);
			return mockChannel;
		},
	},
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const {
	CALENDAR_NOT_READY,
	OPENED_STALE_MS,
	calendarAddView,
	fetchCalendarAdds,
	isMissingCalendarTable,
	markAdded,
	markOpened,
	markRemoved,
	subscribeToCalendarAdds,
} = require("@/lib/calendar-adds");
/* eslint-enable @typescript-eslint/no-require-imports */

const TARGET = { decisionId: "d1", coupleId: "couple-1", userId: "user-1" };
const DETAILS = { method: "google_link", snapshot: "v1:aaaaaaaa" };
const ROW = { id: "a1", decision_id: "d1", added_by: "user-1", state: "opened" };

beforeEach(() => {
	mockCalls = [];
	mockAnswer = { data: null, error: null };
});

describe("fetchCalendarAdds", () => {
	it("reads the couple's rows, leaving out the taken-back ones", async () => {
		mockAnswer = { data: [ROW], error: null };

		expect(await fetchCalendarAdds("couple-1")).toEqual({ data: [ROW], error: null });
		expect(mockCalls).toEqual([
			["from", "decision_calendar_adds"],
			["select", "*"],
			["eq", "couple_id", "couple-1"],
			["neq", "state", "removed"],
			["order", "created_at", { ascending: true }],
		]);
	});

	it("is an empty list when there are none", async () => {
		expect(await fetchCalendarAdds("couple-1")).toEqual({ data: [], error: null });
	});

	it("says something readable when the table is not there yet", async () => {
		mockAnswer = {
			data: null,
			error: {
				code: "PGRST205",
				message: "Could not find the table 'public.decision_calendar_adds' in the schema cache",
			},
		};

		expect(await fetchCalendarAdds("couple-1")).toEqual({ data: null, error: CALENDAR_NOT_READY });
	});

	it("passes any other error on", async () => {
		mockAnswer = { data: null, error: { message: "permission denied" } };

		expect(await fetchCalendarAdds("couple-1")).toEqual({ data: null, error: "permission denied" });
	});
});

describe("markOpened", () => {
	it("upserts my row as opened and unconfirmed, on (decision, person)", async () => {
		mockAnswer = { data: ROW, error: null };

		expect(await markOpened(TARGET, DETAILS)).toEqual({ data: ROW, error: null });
		expect(mockCalls).toEqual([
			["from", "decision_calendar_adds"],
			[
				"upsert",
				{
					decision_id: "d1",
					couple_id: "couple-1",
					added_by: "user-1",
					method: "google_link",
					state: "opened",
					confirmed: false,
					external_event_id: null,
					snapshot: "v1:aaaaaaaa",
				},
				{ onConflict: "decision_id,added_by" },
			],
			["select"],
		]);
	});

	it("reports a failed write", async () => {
		mockAnswer = { data: null, error: { message: "new row violates row-level security policy" } };

		expect(await markOpened(TARGET, DETAILS)).toEqual({
			data: null,
			error: "new row violates row-level security policy",
		});
	});
});

describe("markAdded", () => {
	const sent = () => (mockCalls.find(([method]) => method === "upsert") as unknown[])[1];

	it("is confirmed unless told otherwise", async () => {
		await markAdded(TARGET, DETAILS);

		expect(sent()).toMatchObject({ state: "added", confirmed: true, external_event_id: null });
	});

	it("can record an add nobody vouched for, and the calendar's own id", async () => {
		await markAdded(TARGET, {
			...DETAILS,
			method: "system",
			confirmed: false,
			externalEventId: "E1",
		});

		expect(sent()).toMatchObject({
			state: "added",
			method: "system",
			confirmed: false,
			external_event_id: "E1",
		});
	});
});

describe("markRemoved", () => {
	it("is a soft delete of my own row", async () => {
		mockAnswer = { data: { ...ROW, state: "removed" }, error: null };

		expect(await markRemoved({ decisionId: "d1", userId: "user-1" })).toEqual({
			data: { ...ROW, state: "removed" },
			error: null,
		});
		expect(mockCalls).toEqual([
			["from", "decision_calendar_adds"],
			["update", { state: "removed", confirmed: false }],
			["eq", "decision_id", "d1"],
			["eq", "added_by", "user-1"],
			["select"],
		]);
	});

	it("is not an error when there was nothing to take back", async () => {
		expect(await markRemoved({ decisionId: "d1", userId: "user-1" })).toEqual({
			data: null,
			error: null,
		});
	});
});

describe("subscribeToCalendarAdds", () => {
	it("listens to the couple's rows and hands each one over whole", () => {
		const onChange = jest.fn();
		const onStatus = jest.fn();
		subscribeToCalendarAdds("couple-1", onChange, onStatus);

		expect(mockCalls).toEqual([
			["channel", "decision_calendar_adds_couple-1"],
			[
				"on",
				{
					event: "*",
					schema: "public",
					table: "decision_calendar_adds",
					filter: "couple_id=eq.couple-1",
				},
			],
		]);

		onPostgresChange({ eventType: "INSERT", new: ROW, old: {} });
		onPostgresChange({ eventType: "UPDATE", new: { ...ROW, state: "removed" }, old: ROW });
		onPostgresChange({ eventType: "DELETE", new: {}, old: ROW });
		// Nothing to hand over.
		onPostgresChange({ eventType: "UPDATE", new: {}, old: {} });

		expect(onChange.mock.calls).toEqual([
			[ROW, "INSERT"],
			[{ ...ROW, state: "removed" }, "UPDATE"],
			[ROW, "DELETE"],
		]);

		onChannelStatus("SUBSCRIBED");
		expect(onStatus).toHaveBeenCalledWith("SUBSCRIBED");
	});
});

describe("isMissingCalendarTable", () => {
	it("knows the table's not-there errors", () => {
		expect(isMissingCalendarTable({ code: "42P01" })).toBe(true);
		expect(
			isMissingCalendarTable({ message: 'relation "public.decision_calendar_adds" does not exist' }),
		).toBe(true);
		expect(isMissingCalendarTable({ message: "permission denied" })).toBe(false);
	});
});

it("re-exports the view helper", () => {
	expect(OPENED_STALE_MS).toBe(10 * 60 * 1000);
	expect(calendarAddView(null, null, new Date()).kind).toBe("none");
});
