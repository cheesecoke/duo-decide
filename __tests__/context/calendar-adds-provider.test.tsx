import * as React from "react";
import { Text } from "react-native";
import { act, render, screen, waitFor } from "@testing-library/react-native";

import type { CalendarAdd } from "@/types/database";

/**
 * CalendarAddsProvider: mine / partner per decision, the first-load `loading`
 * contract it shares with the other providers, the three optimistic writes,
 * and realtime rows patched in.
 *
 * `lib/calendar-adds` is mocked at the module boundary;
 * `RealtimeStatusProvider` is the real one.
 */

const mockDb = {
	fetchCalendarAdds: jest.fn(),
	markOpened: jest.fn(),
	markAdded: jest.fn(),
	markRemoved: jest.fn(),
	subscribeToCalendarAdds: jest.fn(),
};

jest.mock("@/lib/calendar-adds", () => ({
	fetchCalendarAdds: (...args: unknown[]) => mockDb.fetchCalendarAdds(...args),
	markOpened: (...args: unknown[]) => mockDb.markOpened(...args),
	markAdded: (...args: unknown[]) => mockDb.markAdded(...args),
	markRemoved: (...args: unknown[]) => mockDb.markRemoved(...args),
	subscribeToCalendarAdds: (...args: unknown[]) => mockDb.subscribeToCalendarAdds(...args),
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const { CalendarAddsProvider, useCalendarAdds } = require("@/context/calendar-adds-provider");
const { RealtimeStatusProvider } = require("@/context/realtime-status-context");
/* eslint-enable @typescript-eslint/no-require-imports */

type Result<T> = { data: T | null; error: string | null };

function deferred<T>() {
	let settle: (value: T) => void = () => {};
	const promise = new Promise<T>((resolve) => {
		settle = resolve;
	});
	return { promise, settle };
}

const ME = "user-1";
const PARTNER = "user-2";

function add(over: Partial<CalendarAdd> = {}): CalendarAdd {
	return {
		id: "a1",
		decision_id: "d1",
		couple_id: "couple-1",
		added_by: PARTNER,
		method: "google_link",
		state: "added",
		confirmed: true,
		external_event_id: null,
		snapshot: "v1:aaaaaaaa",
		created_at: "2026-11-18T19:00:00.000Z",
		updated_at: "2026-11-18T19:00:00.000Z",
		...over,
	};
}

const DETAILS = { method: "google_link" as const, snapshot: "v1:aaaaaaaa" };
const TARGET = { decisionId: "d1", coupleId: "couple-1", userId: ME };

let api: ReturnType<typeof useCalendarAdds>;
let onRealtime: (row: CalendarAdd, eventType: "INSERT" | "UPDATE" | "DELETE") => void = () => {};
let onStatus: (status: string) => void = () => {};

/** `d1[mine=opened partner=added]`, one group per decision that has a row. */
function Probe() {
	api = useCalendarAdds();
	const decisions = Object.keys(api.byDecision).sort();
	return (
		<Text testID="probe">
			{api.loading ? "loading" : "ready"}|{api.error ?? "ok"}|
			{decisions
				.map((id) => {
					const { mine, partner } = api.addsFor(id);
					return `${id}[mine=${mine?.state ?? "-"} partner=${partner?.state ?? "-"}]`;
				})
				.join(",")}
		</Text>
	);
}

const probe = () => screen.getByTestId("probe").props.children.join("");

function renderProvider(coupleId: string | null = "couple-1", userId: string | null = ME) {
	return render(
		<RealtimeStatusProvider>
			<CalendarAddsProvider coupleId={coupleId} userId={userId}>
				<Probe />
			</CalendarAddsProvider>
		</RealtimeStatusProvider>,
	);
}

beforeEach(() => {
	jest.clearAllMocks();
	mockDb.fetchCalendarAdds.mockResolvedValue({ data: [], error: null });
	mockDb.subscribeToCalendarAdds.mockImplementation(
		(_couple: string, onChange: typeof onRealtime, statusCallback: typeof onStatus) => {
			onRealtime = onChange;
			onStatus = statusCallback;
			return { unsubscribe: jest.fn() };
		},
	);
});

describe("loading", () => {
	it("is true for the first fetch and never again", async () => {
		const first = deferred<Result<CalendarAdd[]>>();
		mockDb.fetchCalendarAdds.mockReturnValueOnce(first.promise);
		renderProvider();
		expect(probe()).toBe("loading|ok|");

		await act(async () => first.settle({ data: [add()], error: null }));
		expect(probe()).toBe("ready|ok|d1[mine=- partner=added]");

		// A reconnect refetches; held open, it must not raise `loading` again.
		const second = deferred<Result<CalendarAdd[]>>();
		mockDb.fetchCalendarAdds.mockReturnValueOnce(second.promise);
		act(() => onStatus("CLOSED"));
		act(() => onStatus("SUBSCRIBED"));
		expect(mockDb.fetchCalendarAdds).toHaveBeenCalledTimes(2);
		expect(probe()).toBe("ready|ok|d1[mine=- partner=added]");

		await act(async () =>
			second.settle({ data: [add(), add({ id: "a2", added_by: ME })], error: null }),
		);
		expect(probe()).toBe("ready|ok|d1[mine=added partner=added]");
	});

	it("has nothing to wait for without a couple", () => {
		renderProvider(null);

		expect(probe()).toBe("ready|ok|");
		expect(mockDb.fetchCalendarAdds).not.toHaveBeenCalled();
		expect(mockDb.subscribeToCalendarAdds).not.toHaveBeenCalled();
	});

	it("reads as nobody having added anything when the table is not there yet", async () => {
		mockDb.fetchCalendarAdds.mockResolvedValue({ data: null, error: "not ready" });
		renderProvider();

		await waitFor(() => expect(probe()).toBe("ready|not ready|"));
		expect(api.addsFor("d1")).toEqual({ mine: null, partner: null });
	});
});

describe("mine and partner", () => {
	it("sorts each decision's rows into the two seats", async () => {
		mockDb.fetchCalendarAdds.mockResolvedValue({
			data: [
				add({ id: "a1", decision_id: "d1", added_by: PARTNER, state: "added" }),
				add({ id: "a2", decision_id: "d1", added_by: ME, state: "opened" }),
				add({ id: "a3", decision_id: "d2", added_by: ME, state: "added" }),
			],
			error: null,
		});
		renderProvider();

		await waitFor(() =>
			expect(probe()).toBe("ready|ok|d1[mine=opened partner=added],d2[mine=added partner=-]"),
		);
		expect(api.addsFor("d1").mine.id).toBe("a2");
		expect(api.addsFor("d1").partner.id).toBe("a1");
		expect(mockDb.fetchCalendarAdds).toHaveBeenCalledWith("couple-1");
	});

	it("gives the same empty pair for every decision with no rows", async () => {
		renderProvider();
		await waitFor(() => expect(probe()).toBe("ready|ok|"));

		expect(api.addsFor("nope")).toEqual({ mine: null, partner: null });
		expect(api.addsFor("nope")).toBe(api.addsFor("other"));
	});

	it("treats a taken-back row as no row, and a former partner's as the partner's", async () => {
		mockDb.fetchCalendarAdds.mockResolvedValue({
			data: [
				add({ id: "a1", decision_id: "d1", added_by: ME, state: "removed" }),
				add({ id: "a2", decision_id: "d2", added_by: null, state: "added" }),
			],
			error: null,
		});
		renderProvider();

		await waitFor(() => expect(probe()).toBe("ready|ok|d2[mine=- partner=added]"));
	});
});

describe("handing off", () => {
	it("shows 'opened' at once, before the write lands, then swaps in the saved row", async () => {
		const writing = deferred<Result<CalendarAdd>>();
		mockDb.markOpened.mockReturnValue(writing.promise);
		renderProvider();
		await waitFor(() => expect(probe()).toBe("ready|ok|"));

		let done: Promise<boolean> = Promise.resolve(false);
		act(() => {
			done = api.markOpened("d1", DETAILS);
		});
		expect(probe()).toBe("ready|ok|d1[mine=opened partner=-]");
		expect(api.addsFor("d1").mine).toMatchObject({
			id: "pending-d1",
			confirmed: false,
			snapshot: "v1:aaaaaaaa",
		});
		expect(mockDb.markOpened).toHaveBeenCalledWith(TARGET, DETAILS);

		let ok = false;
		await act(async () => {
			writing.settle({ data: add({ id: "a9", added_by: ME, state: "opened" }), error: null });
			ok = await done;
		});
		expect(ok).toBe(true);
		expect(probe()).toBe("ready|ok|d1[mine=opened partner=-]");
		expect(api.addsFor("d1").mine.id).toBe("a9");
	});

	it("takes it off again when the write fails, and says why", async () => {
		mockDb.markOpened.mockResolvedValue({ data: null, error: "offline" });
		renderProvider();
		await waitFor(() => expect(probe()).toBe("ready|ok|"));

		let ok = true;
		await act(async () => {
			ok = await api.markOpened("d1", DETAILS);
		});

		expect(ok).toBe(false);
		expect(probe()).toBe("ready|offline|");
	});

	it("leaves the partner's row alone", async () => {
		mockDb.fetchCalendarAdds.mockResolvedValue({ data: [add()], error: null });
		mockDb.markOpened.mockResolvedValue({
			data: add({ id: "a9", added_by: ME, state: "opened" }),
			error: null,
		});
		renderProvider();
		await waitFor(() => expect(probe()).toContain("partner=added"));

		await act(async () => {
			await api.markOpened("d1", DETAILS);
		});

		expect(probe()).toBe("ready|ok|d1[mine=opened partner=added]");
	});

	it("writes nothing without a couple or a signed-in user", async () => {
		renderProvider("couple-1", null);
		await waitFor(() => expect(probe()).toBe("ready|ok|"));

		let ok = true;
		await act(async () => {
			ok = await api.markOpened("d1", DETAILS);
		});

		expect(ok).toBe(false);
		expect(mockDb.markOpened).not.toHaveBeenCalled();
	});
});

describe("adding", () => {
	it("moves my 'opened' to 'added' at once, confirmed unless told otherwise", async () => {
		const opened = add({ id: "a2", added_by: ME, state: "opened", confirmed: false });
		mockDb.fetchCalendarAdds.mockResolvedValue({ data: [opened], error: null });
		const writing = deferred<Result<CalendarAdd>>();
		mockDb.markAdded.mockReturnValue(writing.promise);
		renderProvider();
		await waitFor(() => expect(probe()).toBe("ready|ok|d1[mine=opened partner=-]"));

		let done: Promise<boolean> = Promise.resolve(false);
		act(() => {
			done = api.markAdded("d1", DETAILS);
		});
		expect(probe()).toBe("ready|ok|d1[mine=added partner=-]");
		expect(api.addsFor("d1").mine).toMatchObject({
			confirmed: true,
			// The row is the same row: it keeps the day it was first made.
			created_at: opened.created_at,
		});

		await act(async () => {
			writing.settle({ data: { ...opened, state: "added", confirmed: true }, error: null });
			await done;
		});
		expect(probe()).toBe("ready|ok|d1[mine=added partner=-]");
		expect(api.addsFor("d1").mine.id).toBe("a2");
	});

	it("passes on an unconfirmed add and the calendar's own id", async () => {
		mockDb.markAdded.mockResolvedValue({ data: add({ added_by: ME }), error: null });
		renderProvider();
		await waitFor(() => expect(probe()).toBe("ready|ok|"));

		const details = {
			method: "system" as const,
			snapshot: "v1:x",
			confirmed: false,
			externalEventId: "E1",
		};
		await act(async () => {
			await api.markAdded("d1", details);
		});

		expect(mockDb.markAdded).toHaveBeenCalledWith(TARGET, details);
	});

	it("goes back to 'opened' when the write fails", async () => {
		mockDb.fetchCalendarAdds.mockResolvedValue({
			data: [add({ id: "a2", added_by: ME, state: "opened", confirmed: false })],
			error: null,
		});
		mockDb.markAdded.mockResolvedValue({ data: null, error: "nope" });
		renderProvider();
		await waitFor(() => expect(probe()).toContain("mine=opened"));

		await act(async () => {
			await api.markAdded("d1", DETAILS);
		});

		expect(probe()).toBe("ready|nope|d1[mine=opened partner=-]");
		expect(api.addsFor("d1").mine.id).toBe("a2");
	});
});

describe("taking it back", () => {
	it("removes my row at once and leaves the partner's", async () => {
		mockDb.fetchCalendarAdds.mockResolvedValue({
			data: [add(), add({ id: "a2", added_by: ME })],
			error: null,
		});
		const writing = deferred<Result<CalendarAdd | null>>();
		mockDb.markRemoved.mockReturnValue(writing.promise);
		renderProvider();
		await waitFor(() => expect(probe()).toBe("ready|ok|d1[mine=added partner=added]"));

		let done: Promise<boolean> = Promise.resolve(false);
		act(() => {
			done = api.markRemoved("d1");
		});
		expect(probe()).toBe("ready|ok|d1[mine=- partner=added]");
		expect(mockDb.markRemoved).toHaveBeenCalledWith({ decisionId: "d1", userId: ME });

		let ok = false;
		await act(async () => {
			writing.settle({ data: add({ id: "a2", added_by: ME, state: "removed" }), error: null });
			ok = await done;
		});
		expect(ok).toBe(true);
		expect(probe()).toBe("ready|ok|d1[mine=- partner=added]");
	});

	it("reads the truth back if the write fails", async () => {
		mockDb.fetchCalendarAdds.mockResolvedValue({
			data: [add({ id: "a2", added_by: ME })],
			error: null,
		});
		mockDb.markRemoved.mockResolvedValue({ data: null, error: "nope" });
		renderProvider();
		await waitFor(() => expect(probe()).toContain("mine=added"));

		let ok = true;
		await act(async () => {
			ok = await api.markRemoved("d1");
		});

		expect(ok).toBe(false);
		expect(probe()).toBe("ready|nope|d1[mine=added partner=-]");
	});
});

describe("realtime", () => {
	it("patches the partner's hand-off in without a refetch", async () => {
		renderProvider();
		await waitFor(() => expect(probe()).toBe("ready|ok|"));
		expect(mockDb.subscribeToCalendarAdds).toHaveBeenCalledWith(
			"couple-1",
			expect.any(Function),
			expect.any(Function),
		);

		act(() => onRealtime(add({ state: "opened", confirmed: false }), "INSERT"));
		expect(probe()).toBe("ready|ok|d1[mine=- partner=opened]");

		act(() => onRealtime(add({ state: "added", updated_at: "2026-11-18T19:02:00.000Z" }), "UPDATE"));
		expect(probe()).toBe("ready|ok|d1[mine=- partner=added]");
		expect(mockDb.fetchCalendarAdds).toHaveBeenCalledTimes(1);
	});

	it("drops the row when the partner takes it back", async () => {
		mockDb.fetchCalendarAdds.mockResolvedValue({ data: [add()], error: null });
		renderProvider();
		await waitFor(() => expect(probe()).toContain("partner=added"));

		act(() =>
			onRealtime(add({ state: "removed", updated_at: "2026-11-18T19:05:00.000Z" }), "UPDATE"),
		);

		expect(probe()).toBe("ready|ok|");
	});

	it("ignores a change older than the one it already has", async () => {
		mockDb.fetchCalendarAdds.mockResolvedValue({
			data: [add({ state: "added", updated_at: "2026-11-18T19:05:00.000Z" })],
			error: null,
		});
		renderProvider();
		await waitFor(() => expect(probe()).toContain("partner=added"));

		// The 'opened' that came before it, delivered late.
		act(() => onRealtime(add({ state: "opened", updated_at: "2026-11-18T19:01:00.000Z" }), "UPDATE"));

		expect(probe()).toBe("ready|ok|d1[mine=- partner=added]");
	});

	it("lets my own echo replace the optimistic row, whatever the clocks say", async () => {
		const writing = deferred<Result<CalendarAdd>>();
		mockDb.markOpened.mockReturnValue(writing.promise);
		renderProvider();
		await waitFor(() => expect(probe()).toBe("ready|ok|"));

		let done: Promise<boolean> = Promise.resolve(false);
		act(() => {
			done = api.markOpened("d1", DETAILS);
		});
		// The server's stamp is years behind this phone's clock.
		const saved = add({
			id: "a9",
			added_by: ME,
			state: "opened",
			updated_at: "2020-01-01T00:00:00.000Z",
		});
		act(() => onRealtime(saved, "INSERT"));
		expect(api.addsFor("d1").mine.id).toBe("a9");

		await act(async () => {
			writing.settle({ data: saved, error: null });
			await done;
		});
		expect(probe()).toBe("ready|ok|d1[mine=opened partner=-]");
		expect(Object.keys(api.byDecision)).toEqual(["d1"]);
	});

	it("does not fetch a second time when the channel first connects", async () => {
		renderProvider();
		await waitFor(() => expect(probe()).toBe("ready|ok|"));

		await act(async () => onStatus("SUBSCRIBED"));

		expect(mockDb.fetchCalendarAdds).toHaveBeenCalledTimes(1);
	});

	it("reads the rows it missed when a dropped channel comes back", async () => {
		renderProvider();
		await waitFor(() => expect(probe()).toBe("ready|ok|"));

		mockDb.fetchCalendarAdds.mockResolvedValueOnce({ data: [add()], error: null });
		act(() => onStatus("CHANNEL_ERROR"));
		await act(async () => onStatus("SUBSCRIBED"));

		expect(probe()).toBe("ready|ok|d1[mine=- partner=added]");
	});
});

describe("useCalendarAdds", () => {
	it("throws outside its provider", () => {
		const quiet = jest.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<Probe />)).toThrow(
			"useCalendarAdds must be used within a CalendarAddsProvider",
		);
		quiet.mockRestore();
	});
});
