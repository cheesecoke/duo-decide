import * as React from "react";
import { Text } from "react-native";
import { act, render, screen, waitFor } from "@testing-library/react-native";

import type { OptionListWithItems } from "@/types/database";

/**
 * OptionListsProvider — the `loading` contract (tweak T4).
 *
 * `loading` is a *first-load* flag. The Options screen swaps the whole screen
 * for one line while it is true, so a background refetch that raised it
 * unmounted every card — and a card's edit mode is local state, so the editor
 * the user was typing into closed itself.
 *
 * **These tests hold the fetch open on purpose.** Resolving it inside the
 * same `act()` that started it batches `true → false` into nothing a consumer
 * ever renders, and the assertion then passes against the old provider too.
 * So every case here drives a `deferred()`, asserts `loading` *while the
 * fetch is in flight*, and only then resolves it.
 *
 * `lib/database` is mocked at the module boundary; `RealtimeStatusProvider`
 * is the real one (it is three refs and a boolean).
 */

const mockDb = {
	getOptionListsByCouple: jest.fn(),
	createOptionList: jest.fn(),
	updateOptionList: jest.fn(),
	deleteOptionList: jest.fn(),
	subscribeToOptionLists: jest.fn(),
};

jest.mock("@/lib/database", () => ({
	getOptionListsByCouple: (...args: unknown[]) => mockDb.getOptionListsByCouple(...args),
	createOptionList: (...args: unknown[]) => mockDb.createOptionList(...args),
	updateOptionList: (...args: unknown[]) => mockDb.updateOptionList(...args),
	deleteOptionList: (...args: unknown[]) => mockDb.deleteOptionList(...args),
	subscribeToOptionLists: (coupleId: string, onChange: () => void, onStatus?: unknown) =>
		mockDb.subscribeToOptionLists(coupleId, onChange, onStatus),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { OptionListsProvider, useOptionLists } = require("@/context/option-lists-provider");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { RealtimeStatusProvider } = require("@/context/realtime-status-context");

type Fetched = { data: OptionListWithItems[] | null; error: string | null };

/** A fetch this test decides when to finish. */
function deferred() {
	let settle: (value: Fetched) => void = () => {};
	const promise = new Promise<Fetched>((resolve) => {
		settle = resolve;
	});
	return { promise, settle };
}

function list(over: Partial<OptionListWithItems> = {}): OptionListWithItems {
	return {
		id: "l1",
		couple_id: "couple-1",
		title: "Dinner spots",
		description: "",
		creator_id: "user-1",
		created_at: "2026-09-01T00:00:00Z",
		updated_at: "2026-09-01T00:00:00Z",
		items: [],
		...over,
	} as OptionListWithItems;
}

/** The realtime handler the provider hands to `subscribeToOptionLists`. */
let onRealtimeChange: (() => void) | null = null;
let probeRefresh: () => Promise<void> = async () => {};

function Probe() {
	const { optionLists, loading, error, refreshLists } = useOptionLists();
	probeRefresh = refreshLists;

	return (
		<>
			<Text testID="loading">{loading ? "loading" : "ready"}</Text>
			<Text testID="error">{error ?? "none"}</Text>
			<Text testID="titles">
				{optionLists.map((item: OptionListWithItems) => item.title).join(",")}
			</Text>
		</>
	);
}

function tree(coupleId: string | null) {
	return (
		<RealtimeStatusProvider>
			<OptionListsProvider coupleId={coupleId}>
				<Probe />
			</OptionListsProvider>
		</RealtimeStatusProvider>
	);
}

const shell = () => screen.getByTestId("loading").props.children;
const titles = () => screen.getByTestId("titles").props.children;
const failure = () => screen.getByTestId("error").props.children;

beforeEach(() => {
	jest.clearAllMocks();
	onRealtimeChange = null;
	mockDb.getOptionListsByCouple.mockResolvedValue({ data: [list()], error: null });
	mockDb.subscribeToOptionLists.mockImplementation((_coupleId: string, onChange: () => void) => {
		onRealtimeChange = onChange;
		return { unsubscribe: jest.fn() };
	});
});

/** Mount, let the first fetch settle, and leave a resolved mock behind. */
async function settleFirstLoad() {
	render(tree("couple-1"));
	await waitFor(() => expect(shell()).toBe("ready"));
}

describe("the first load", () => {
	it("is a fetch that shows loading, all the way until it settles", async () => {
		const first = deferred();
		mockDb.getOptionListsByCouple.mockReturnValue(first.promise);

		render(tree("couple-1"));

		expect(shell()).toBe("loading");

		await act(async () => {
			first.settle({ data: [list()], error: null });
		});

		expect(shell()).toBe("ready");
		expect(titles()).toBe("Dinner spots");
	});

	it("ends in ready even when the fetch fails", async () => {
		mockDb.getOptionListsByCouple.mockResolvedValue({ data: null, error: "Boom" });
		render(tree("couple-1"));

		await waitFor(() => expect(failure()).toBe("Boom"));
		expect(shell()).toBe("ready");
	});

	it("never waits at all without a couple", async () => {
		render(tree(null));

		await act(async () => {});
		expect(shell()).toBe("ready");
		expect(mockDb.getOptionListsByCouple).not.toHaveBeenCalled();
	});

	// A new couple is a new first load: there is nothing on screen worth keeping.
	it("waits again when the couple changes", async () => {
		const view = render(tree("couple-1"));
		await waitFor(() => expect(shell()).toBe("ready"));

		const second = deferred();
		mockDb.getOptionListsByCouple.mockReturnValue(second.promise);

		await act(async () => {
			view.rerender(tree("couple-2"));
		});

		expect(shell()).toBe("loading");

		await act(async () => {
			second.settle({ data: [list({ title: "Date nights" })], error: null });
		});

		expect(shell()).toBe("ready");
		expect(titles()).toBe("Date nights");
	});
});

/**
 * The tweak itself. Each of these is a fetch the user did not ask for, and
 * none of them may take the screen away from them mid-edit.
 */
describe("a background refetch", () => {
	it("never raises loading when the realtime subscription fires", async () => {
		await settleFirstLoad();

		const refetch = deferred();
		mockDb.getOptionListsByCouple.mockReturnValue(refetch.promise);

		// Sync act: whatever the refetch does to `loading` on its way in has
		// landed by the time this returns, and the fetch is still open.
		act(() => {
			onRealtimeChange?.();
		});

		expect(shell()).toBe("ready");

		await act(async () => {
			refetch.settle({
				data: [list(), list({ id: "l2", title: "Date nights" })],
				error: null,
			});
		});

		expect(shell()).toBe("ready");
		expect(titles()).toBe("Dinner spots,Date nights");
	});

	it("never raises loading for an explicit refreshLists()", async () => {
		await settleFirstLoad();

		const refetch = deferred();
		mockDb.getOptionListsByCouple.mockReturnValue(refetch.promise);

		let pending: Promise<void> = Promise.resolve();
		act(() => {
			pending = probeRefresh();
		});

		expect(shell()).toBe("ready");

		await act(async () => {
			refetch.settle({ data: [list()], error: null });
			await pending;
		});

		expect(shell()).toBe("ready");
		expect(mockDb.getOptionListsByCouple).toHaveBeenCalledTimes(2);
	});

	// `error` is deliberately *not* first-load-only: a refetch that fails is
	// news, and a refetch that succeeds clears the last failure.
	it("still reports and clears the error", async () => {
		await settleFirstLoad();

		mockDb.getOptionListsByCouple.mockResolvedValue({ data: null, error: "Offline" });
		await act(async () => {
			await probeRefresh();
		});
		expect(failure()).toBe("Offline");
		expect(shell()).toBe("ready");

		mockDb.getOptionListsByCouple.mockResolvedValue({ data: [list()], error: null });
		await act(async () => {
			await probeRefresh();
		});
		expect(failure()).toBe("none");
	});
});
