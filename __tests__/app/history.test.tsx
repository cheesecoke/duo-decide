import * as React from "react";
import { act, render, screen, userEvent, within } from "@testing-library/react-native";
import { router } from "expo-router";

import type { DecisionWithOptions, UserContext } from "@/types/database";

/**
 * The History tab (FEATURE-INVENTORY §1.12), with the database and the user
 * provider mocked.
 *
 * The arithmetic has its own table (`__tests__/components/history/`), so what
 * is asserted here is the wiring: that both queries are still called with the
 * same arguments in the same order, that paging appends and recomputes the
 * split while the count query keeps the headline, and that the two failure
 * modes are now different — an initial failure replaces the screen, a
 * load-more failure keeps the rows.
 *
 * Same shape as __tests__/app/options.test.tsx. nativewind/babel is off under
 * jest (babel.config.js) and the Reanimated mock lands every value on its
 * target, so nothing here asserts a class or a frame.
 */

const mockYou: UserContext = {
	userId: "user-1",
	userName: "Chase",
	coupleId: "couple-1",
	partnerId: "user-2",
	partnerName: "Sam",
};

/* ------------------------------------------------------------------ mocks - */

const mockUser = {
	userContext: mockYou as UserContext | null,
	loading: false,
	error: null as string | null,
};

const mockDb = {
	getCompletedDecisions: jest.fn(),
	getCompletedDecisionsCount: jest.fn(),
	softDeleteDecision: jest.fn(),
	unarchiveDecision: jest.fn(),
};

// The sheet lives in the tabs layout; here its content is just the node
// handed to `showDrawer`, rendered on its own (as decision-queue.test does).
const mockDrawer = { showDrawer: jest.fn(), hideDrawer: jest.fn() };
jest.mock("@/context/drawer-provider", () => ({
	useDrawer: () => mockDrawer,
}));

jest.mock("@/context/user-context-provider", () => ({
	useUserContext: () => ({
		userContext: mockUser.userContext,
		loading: mockUser.loading,
		error: mockUser.error,
	}),
}));

jest.mock("@/lib/database", () => ({
	getCompletedDecisions: (...args: unknown[]) => mockDb.getCompletedDecisions(...args),
	getCompletedDecisionsCount: (...args: unknown[]) => mockDb.getCompletedDecisionsCount(...args),
	softDeleteDecision: (...args: unknown[]) => mockDb.softDeleteDecision(...args),
	unarchiveDecision: (...args: unknown[]) => mockDb.unarchiveDecision(...args),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const History = require("@/app/(protected)/(tabs)/history").default;

/* --------------------------------------------------------------- fixtures - */

const DAY = 24 * 60 * 60 * 1000;

/** Half past three days ago — "3 days ago" whatever the clock does mid-test. */
const THREE_DAYS_AGO = new Date(Date.now() - 3.5 * DAY).toISOString();

function decision(over: Partial<DecisionWithOptions> = {}): DecisionWithOptions {
	const id = (over.id as string) ?? "d1";
	return {
		id,
		title: "Dinner tonight",
		description: null,
		deadline: null,
		creator_id: "user-1",
		partner_id: "user-2",
		couple_id: "couple-1",
		type: "vote",
		status: "completed",
		current_round: 1,
		decided_by: "user-1",
		decided_at: new Date().toISOString(),
		final_decision: `${id}-o1`,
		created_at: "2026-09-01T00:00:00Z",
		updated_at: "2026-09-01T00:00:00Z",
		options: [
			{
				id: `${id}-o1`,
				decision_id: id,
				title: "Tacos",
				votes: 1,
				eliminated_in_round: null,
				created_at: "2026-09-01T00:00:00Z",
			},
		],
		...over,
	} as DecisionWithOptions;
}

/** A full page — the only thing that makes `hasMore` true. */
function fullPage(prefix: string, over: Partial<DecisionWithOptions> = {}): DecisionWithOptions[] {
	return Array.from({ length: 20 }, (_unused, index) =>
		decision({ id: `${prefix}${index}`, title: `${prefix} decision ${index}`, ...over }),
	);
}

function ok<T>(data: T) {
	return { data, error: null };
}

async function renderScreen() {
	const view = render(<History />);
	// The load-effect's `Promise.all` resolves a tick after mount.
	await act(async () => {});
	return view;
}

beforeEach(() => {
	jest.clearAllMocks();
	mockUser.userContext = mockYou;
	mockUser.loading = false;
	mockUser.error = null;
	mockDb.getCompletedDecisionsCount.mockResolvedValue(ok(1));
	mockDb.getCompletedDecisions.mockResolvedValue(ok([decision()]));
	mockDb.softDeleteDecision.mockResolvedValue(ok(true));
	mockDb.unarchiveDecision.mockResolvedValue(ok(true));
});

/* ------------------------------------------------------------------ tests - */

describe("loading", () => {
	it("replaces the screen with one line while the first page is in flight", async () => {
		// Never resolves: the screen is caught mid-load.
		mockDb.getCompletedDecisions.mockReturnValue(new Promise(() => {}));
		render(<History />);

		expect(screen.getByText("Loading decision history…")).toBeTruthy();
		expect(screen.queryByText("History")).toBeNull();
	});

	it("waits on the user provider too", async () => {
		mockUser.loading = true;
		await renderScreen();

		expect(screen.getByText("Loading decision history…")).toBeTruthy();
		expect(mockDb.getCompletedDecisions).not.toHaveBeenCalled();
	});
});

describe("the queries", () => {
	it("asks for the count and the first page together, with the same arguments", async () => {
		await renderScreen();

		expect(mockDb.getCompletedDecisionsCount).toHaveBeenCalledWith("couple-1");
		expect(mockDb.getCompletedDecisions).toHaveBeenCalledWith("couple-1", {
			limit: 20,
			offset: 0,
		});
	});
});

describe("the initial error", () => {
	it("replaces the screen, and Retry re-fetches both queries", async () => {
		mockDb.getCompletedDecisions.mockResolvedValue({ data: null, error: "Network unreachable" });
		await renderScreen();

		expect(screen.getByText("Network unreachable")).toBeTruthy();
		expect(screen.queryByText("Recent decisions")).toBeNull();

		mockDb.getCompletedDecisions.mockResolvedValue(ok([decision()]));
		await userEvent.press(screen.getByLabelText("Retry loading history"));
		await act(async () => {});

		expect(mockDb.getCompletedDecisionsCount).toHaveBeenCalledTimes(2);
		expect(mockDb.getCompletedDecisions).toHaveBeenCalledTimes(2);
		expect(screen.getByText("Recent decisions")).toBeTruthy();
	});

	it("says so when the user has no couple", async () => {
		mockUser.userContext = { ...mockYou, coupleId: "" };
		await renderScreen();

		expect(screen.getByText("Unable to load user context")).toBeTruthy();
		expect(mockDb.getCompletedDecisions).not.toHaveBeenCalled();
	});

	it("shows the user provider's own error", async () => {
		mockUser.error = "Failed to load your account";
		await renderScreen();

		expect(screen.getByText("Failed to load your account")).toBeTruthy();
	});
});

describe("the empty state", () => {
	it("offers the queue, and nothing else", async () => {
		mockDb.getCompletedDecisionsCount.mockResolvedValue(ok(0));
		mockDb.getCompletedDecisions.mockResolvedValue(ok([]));
		await renderScreen();

		const tile = screen.getByTestId("history-empty");
		expect(within(tile).getByText("No completed decisions yet")).toBeTruthy();
		expect(within(tile).getByText("Complete decisions to see them here.")).toBeTruthy();
		expect(screen.queryByLabelText("Load More History")).toBeNull();

		await userEvent.press(screen.getByLabelText(/No completed decisions yet/));

		expect(jest.mocked(router.navigate)).toHaveBeenCalledWith("/(protected)/(tabs)");
	});
});

describe("the rows", () => {
	it("renders one per decision, with its decider and its date", async () => {
		mockDb.getCompletedDecisionsCount.mockResolvedValue(ok(2));
		mockDb.getCompletedDecisions.mockResolvedValue(
			ok([
				decision({ id: "d1", title: "Dinner tonight" }),
				decision({
					id: "d2",
					title: "Saturday plans",
					decided_by: "user-2",
					decided_at: THREE_DAYS_AGO,
				}),
			]),
		);
		await renderScreen();

		expect(screen.getByText("Dinner tonight")).toBeTruthy();
		expect(screen.getByText("by You")).toBeTruthy();
		expect(screen.getAllByText("Today")).toHaveLength(1);

		expect(screen.getByText("Saturday plans")).toBeTruthy();
		expect(screen.getByText("by Sam")).toBeTruthy();
		expect(screen.getByText("3 days ago")).toBeTruthy();

		// Each row wears its decider's seat (tokens.md §10 + history.model.ts).
		expect(screen.getAllByTestId("history-row-chip-a")).toHaveLength(1);
		expect(screen.getAllByTestId("history-row-chip-b")).toHaveLength(1);
	});

	/**
	 * §1.12: a row missing `decided_by` (or `decided_at`, or a matching
	 * `final_decision`) is silently dropped — so the list is shorter than the
	 * count query's total, which is shown as-is.
	 */
	it("drops an unrenderable row and still shows the count query's total", async () => {
		mockDb.getCompletedDecisionsCount.mockResolvedValue(ok(7));
		mockDb.getCompletedDecisions.mockResolvedValue(
			ok([
				decision({ id: "d1", title: "Dinner tonight" }),
				decision({ id: "d2", title: "Saturday plans", decided_at: null }),
			]),
		);
		await renderScreen();

		expect(screen.getByText("Dinner tonight")).toBeTruthy();
		expect(screen.queryByText("Saturday plans")).toBeNull();
		// 7 is the count query's number; the loaded rows would only ever say 2.
		expect(screen.getByText("7")).toBeTruthy();
	});
});

describe("the gauge", () => {
	it("splits the loaded rows and shows the count query's total", async () => {
		mockDb.getCompletedDecisionsCount.mockResolvedValue(ok(23));
		mockDb.getCompletedDecisions.mockResolvedValue(
			ok([
				decision({ id: "d1" }),
				decision({ id: "d2" }),
				decision({ id: "d3", decided_by: "user-2" }),
			]),
		);
		await renderScreen();

		expect(screen.getByTestId("gauge").props.accessibilityLabel).toBe(
			"23 decisions: you decided 2, Sam decided 1",
		);
		// The numeral is the count query's answer, not the loaded three.
		expect(screen.getByText("23")).toBeTruthy();
	});

	it("carries the split into the legend, and the last decider under it", async () => {
		mockDb.getCompletedDecisionsCount.mockResolvedValue(ok(3));
		mockDb.getCompletedDecisions.mockResolvedValue(
			ok([
				decision({ id: "d1", decided_at: new Date().toISOString() }),
				decision({ id: "d2", decided_by: "user-2", decided_at: THREE_DAYS_AGO }),
				decision({ id: "d3", decided_by: "user-2", decided_at: THREE_DAYS_AGO }),
			]),
		);
		await renderScreen();

		expect(screen.getByText("You · 1")).toBeTruthy();
		expect(screen.getByText("Sam · 2")).toBeTruthy();
		expect(screen.getByText("Last decided by You")).toBeTruthy();
	});

	it("names the partner “Partner” when the couple has no second name", async () => {
		mockUser.userContext = { ...mockYou, partnerName: null };
		mockDb.getCompletedDecisionsCount.mockResolvedValue(ok(1));
		mockDb.getCompletedDecisions.mockResolvedValue(ok([decision({ decided_by: "user-2" })]));
		await renderScreen();

		expect(screen.getByText("Partner · 1")).toBeTruthy();
		expect(screen.getByText("Last decided by Partner")).toBeTruthy();
	});

	it("says nothing about a last decider when nothing has been decided", async () => {
		mockDb.getCompletedDecisionsCount.mockResolvedValue(ok(0));
		mockDb.getCompletedDecisions.mockResolvedValue(ok([]));
		await renderScreen();

		expect(screen.queryByText(/Last decided by/)).toBeNull();
	});
});

describe("paging", () => {
	it("offers Load More only when the last page was full", async () => {
		await renderScreen();
		expect(screen.queryByLabelText("Load More History")).toBeNull();

		screen.unmount();
		mockDb.getCompletedDecisions.mockResolvedValue(ok(fullPage("a")));
		await renderScreen();

		expect(screen.getByLabelText("Load More History")).toBeTruthy();
	});

	it("asks for the next page at offset 20 and appends it", async () => {
		mockDb.getCompletedDecisionsCount.mockResolvedValue(ok(23));
		mockDb.getCompletedDecisions.mockResolvedValueOnce(ok(fullPage("a")));
		await renderScreen();

		mockDb.getCompletedDecisions.mockResolvedValueOnce(
			ok([decision({ id: "b0", title: "Twenty-first decision", decided_by: "user-2" })]),
		);
		await userEvent.press(screen.getByLabelText("Load More History"));
		await act(async () => {});

		expect(mockDb.getCompletedDecisions).toHaveBeenLastCalledWith("couple-1", {
			limit: 20,
			offset: 20,
		});
		// The first page is still there, with the new row after it.
		expect(screen.getByText("a decision 0")).toBeTruthy();
		expect(screen.getByText("Twenty-first decision")).toBeTruthy();
		// A short page means there is nothing left to ask for.
		expect(screen.queryByLabelText("Load More History")).toBeNull();
	});

	it("recomputes the split over every loaded row, and leaves the total alone", async () => {
		mockDb.getCompletedDecisionsCount.mockResolvedValue(ok(23));
		mockDb.getCompletedDecisions.mockResolvedValueOnce(ok(fullPage("a")));
		await renderScreen();

		expect(screen.getByTestId("gauge").props.accessibilityLabel).toBe(
			"23 decisions: you decided 20, Sam decided 0",
		);

		mockDb.getCompletedDecisions.mockResolvedValueOnce(
			ok([decision({ id: "b0", decided_by: "user-2" })]),
		);
		await userEvent.press(screen.getByLabelText("Load More History"));
		await act(async () => {});

		expect(screen.getByTestId("gauge").props.accessibilityLabel).toBe(
			"23 decisions: you decided 20, Sam decided 1",
		);
		expect(screen.getByText("23")).toBeTruthy();
	});

	it("says “Loading…” and refuses a second press while a page is in flight", async () => {
		mockDb.getCompletedDecisions.mockResolvedValueOnce(ok(fullPage("a")));
		await renderScreen();

		let releasePage: (value: unknown) => void = () => {};
		mockDb.getCompletedDecisions.mockReturnValueOnce(
			new Promise((resolve) => {
				releasePage = resolve;
			}),
		);

		await userEvent.press(screen.getByLabelText("Load More History"));

		const button = screen.getByLabelText("Loading more history");
		expect(within(button).getByText("Loading…")).toBeTruthy();
		expect(button.props.disabled).toBe(true);

		// Two calls so far: the first page and the one in flight. A press on a
		// disabled button adds nothing.
		await userEvent.press(button);
		expect(mockDb.getCompletedDecisions).toHaveBeenCalledTimes(2);

		await act(async () => {
			releasePage(ok([decision({ id: "b0", title: "Twenty-first decision" })]));
		});

		expect(screen.getByText("Twenty-first decision")).toBeTruthy();
	});

	/**
	 * The ruling this task made. The old code wrote this into the same `error`
	 * state the initial load used, which replaced the whole screen and threw
	 * away the rows the user was reading.
	 */
	it("keeps the rows and shows the strip when a page fails", async () => {
		mockDb.getCompletedDecisions.mockResolvedValueOnce(ok(fullPage("a")));
		await renderScreen();

		mockDb.getCompletedDecisions.mockResolvedValueOnce({
			data: null,
			error: "Network unreachable",
		});
		await userEvent.press(screen.getByLabelText("Load More History"));
		await act(async () => {});

		expect(within(screen.getByTestId("screen-error")).getByText("Network unreachable")).toBeTruthy();
		expect(screen.getByText("a decision 0")).toBeTruthy();
		expect(screen.getByText("Recent decisions")).toBeTruthy();
		// Still offered — the page was not fetched, so there is still more.
		expect(screen.getByLabelText("Load More History")).toBeTruthy();
	});

	it("clears the strip when the next attempt succeeds", async () => {
		mockDb.getCompletedDecisions.mockResolvedValueOnce(ok(fullPage("a")));
		await renderScreen();

		mockDb.getCompletedDecisions.mockResolvedValueOnce({ data: null, error: "Network unreachable" });
		await userEvent.press(screen.getByLabelText("Load More History"));
		await act(async () => {});
		expect(screen.getByTestId("screen-error")).toBeTruthy();

		mockDb.getCompletedDecisions.mockResolvedValueOnce(ok([decision({ id: "b0" })]));
		await userEvent.press(screen.getByLabelText("Load More History"));
		await act(async () => {});

		expect(screen.queryByTestId("screen-error")).toBeNull();
	});
});

describe("the chrome", () => {
	it("shows the eyebrow, the headline and the list heading", async () => {
		await renderScreen();

		expect(screen.getByText("History")).toBeTruthy();
		expect(screen.getByText("settled")).toBeTruthy();
		expect(screen.getByText("Recent decisions")).toBeTruthy();
	});

	// §1.12 had no footer button, and this screen creates nothing.
	it("has no create pill on it", async () => {
		await renderScreen();

		expect(screen.queryByLabelText(/Create/)).toBeNull();
	});
});

/* ----------------------------------------------- archive + soft delete - */

/**
 * Migration 024. Each row's ⋮: Delete (soft, confirmed first) and, on an
 * archived row, Move back to queue. Both optimistic, both roll back.
 */
describe("the row menu", () => {
	/** Two rows: d1 by you (archived), d2 by Sam (still on the queue). */
	async function twoRows() {
		mockDb.getCompletedDecisionsCount.mockResolvedValue(ok(2));
		mockDb.getCompletedDecisions.mockResolvedValue(
			ok([
				decision({ id: "d1", title: "Dinner tonight", archived_at: "2026-11-01T00:00:00Z" }),
				decision({ id: "d2", title: "Saturday plans", decided_by: "user-2" }),
			]),
		);
		return renderScreen();
	}

	/**
	 * ⋮ → Delete on row `index`, then the node handed to `showDrawer`,
	 * rendered on its own. After this `screen` is the sheet, so the screen
	 * itself is read through the `view` the caller kept.
	 */
	async function askToDelete(view: ReturnType<typeof render>, index: number) {
		const user = userEvent.setup();
		await user.press(view.getAllByLabelText("More")[index]);
		await user.press(view.getByLabelText("Delete"));
		const [heading, node] = mockDrawer.showDrawer.mock.calls.at(-1)!;
		return { user, heading, sheet: render(node as React.ReactElement) };
	}

	it("asks first, in the words Chase chose, and deletes nothing by itself", async () => {
		const view = await twoRows();
		const { heading, sheet } = await askToDelete(view, 1);
		expect(heading).toBe("Delete this decision?");
		expect(sheet.getByText("It will be removed from your history.")).toBeTruthy();
		expect(mockDb.softDeleteDecision).not.toHaveBeenCalled();
	});

	it("keep it → nothing happens", async () => {
		const view = await twoRows();
		const { user, sheet } = await askToDelete(view, 1);
		await user.press(sheet.getByLabelText("Keep it"));
		expect(mockDrawer.hideDrawer).toHaveBeenCalled();
		expect(mockDb.softDeleteDecision).not.toHaveBeenCalled();
	});

	it("delete → soft-deleted, gone from the list, the ring and the total at once", async () => {
		const view = await twoRows();
		expect(view.getByLabelText("2 decisions: you decided 1, Sam decided 1")).toBeTruthy();
		const { user, sheet } = await askToDelete(view, 1);
		await act(async () => {
			await user.press(sheet.getByLabelText("Delete"));
		});
		expect(mockDrawer.hideDrawer).toHaveBeenCalled();
		expect(mockDb.softDeleteDecision).toHaveBeenCalledWith("d2");
		expect(view.queryByText("Saturday plans")).toBeNull();
		expect(view.getByText("Dinner tonight")).toBeTruthy();
		expect(view.getByLabelText("1 decisions: you decided 1, Sam decided 0")).toBeTruthy();
	});

	it("a failed delete puts the row and the stats back, and says why", async () => {
		mockDb.softDeleteDecision.mockResolvedValue({ data: null, error: "Decision not found" });
		const view = await twoRows();
		const { user, sheet } = await askToDelete(view, 1);
		await act(async () => {
			await user.press(sheet.getByLabelText("Delete"));
		});
		expect(view.getByText("Saturday plans")).toBeTruthy();
		expect(view.getByLabelText("2 decisions: you decided 1, Sam decided 1")).toBeTruthy();
		expect(view.getByText("Decision not found")).toBeTruthy();
	});

	it("only an archived row offers Move back to queue", async () => {
		await twoRows();
		const user = userEvent.setup();
		const [dinnerMore, saturdayMore] = screen.getAllByLabelText("More");

		await user.press(saturdayMore);
		expect(screen.queryByLabelText("Move back to queue")).toBeNull();
		await user.press(saturdayMore);

		await user.press(dinnerMore);
		expect(screen.getByLabelText("Move back to queue")).toBeTruthy();
	});

	it("move back to queue → unarchived; the row stays in History", async () => {
		await twoRows();
		const user = userEvent.setup();
		await user.press(screen.getAllByLabelText("More")[0]);
		await act(async () => {
			await user.press(screen.getByLabelText("Move back to queue"));
		});
		expect(mockDb.unarchiveDecision).toHaveBeenCalledWith("d1");
		expect(screen.getByText("Dinner tonight")).toBeTruthy();
		// No longer archived, so its menu no longer offers it.
		await user.press(screen.getAllByLabelText("More")[0]);
		expect(screen.queryByLabelText("Move back to queue")).toBeNull();
	});

	it("a failed move back leaves it archived and says why", async () => {
		mockDb.unarchiveDecision.mockResolvedValue({ data: null, error: "Network down" });
		await twoRows();
		const user = userEvent.setup();
		await user.press(screen.getAllByLabelText("More")[0]);
		await act(async () => {
			await user.press(screen.getByLabelText("Move back to queue"));
		});
		expect(screen.getByText("Network down")).toBeTruthy();
		await user.press(screen.getAllByLabelText("More")[0]);
		expect(screen.getByLabelText("Move back to queue")).toBeTruthy();
	});

	it("the next page starts one row earlier after a delete", async () => {
		mockDb.getCompletedDecisionsCount.mockResolvedValue(ok(25));
		mockDb.getCompletedDecisions.mockResolvedValueOnce(ok(fullPage("p")));
		await renderScreen();
		const user = userEvent.setup();
		await user.press(screen.getAllByLabelText("More")[0]);
		await user.press(screen.getByLabelText("Delete"));
		// Confirm through the sheet node's own prop: RNTL only presses in the
		// most recent render, and the screen has to stay that one here.
		const [, node] = mockDrawer.showDrawer.mock.calls.at(-1)!;
		await act(async () => {
			(node as React.ReactElement<{ onConfirm(): void }>).props.onConfirm();
		});

		mockDb.getCompletedDecisions.mockResolvedValueOnce(ok([]));
		await user.press(screen.getByLabelText("Load More History"));
		await act(async () => {});
		expect(mockDb.getCompletedDecisions).toHaveBeenLastCalledWith("couple-1", {
			limit: 20,
			offset: 19,
		});
	});
});
