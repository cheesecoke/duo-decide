import * as React from "react";
import { act, render, screen, userEvent, waitFor } from "@testing-library/react-native";

import {
	COUPLE_ID,
	USER_1_ID,
	USER_2_ID,
	mockCouple,
	mockProfiles,
	mockVoteDecision,
} from "@/test-utils/fixtures";
import {
	getMockDecisionOptions,
	getMockDecisions,
	getMockVotes,
	resetMockData,
	setMockAuthUser,
	setMockCouples,
	setMockDecisionOptions,
	setMockDecisions,
	setMockProfiles,
	setMockVotes,
} from "@/test-utils/supabase-mock";
import type { Decision, DecisionOption, UserContext, Vote } from "@/types/database";

/**
 * Archive + soft delete, end to end, on the two real screens.
 *
 * Unlike __tests__/app/decision-queue.test.tsx and history.test.tsx, nothing
 * between the screen and Supabase is mocked: the real hooks
 * (useDecisionsData, useDecisionManagement) and the real lib/database.ts run
 * over the in-memory Supabase from test-utils/supabase-mock.ts, so the RPCs
 * and the `deleted_at` / `archived_at` filters are the ones that ship. Only
 * the providers a screen reads (user, drawer, option lists, onboarding,
 * realtime status) are stood in, the way the screen tests stand them in.
 *
 * The flow is Chase's: a decided card → ⋮ → Archive → gone from the queue →
 * in History → ⋮ → Delete → confirm → gone from History and the stats → and
 * the row is still in the database with `deleted_at` set.
 */

const mockYou: UserContext = {
	userId: USER_1_ID,
	userName: "Chase",
	coupleId: COUPLE_ID,
	partnerId: USER_2_ID,
	partnerName: "Sam",
};

jest.mock("@/context/user-context-provider", () => ({
	useUserContext: () => ({ userContext: mockYou, loading: false, error: null }),
}));

/** The sheet's content, as handed to `showDrawer`. */
const mockDrawer = {
	showDrawer: jest.fn(),
	hideDrawer: jest.fn(),
	updateContent: jest.fn(),
	isVisible: false,
	drawerType: null as string | null,
};
jest.mock("@/context/drawer-provider", () => ({ useDrawer: () => mockDrawer }));

const mockOptionLists = { optionLists: [] as unknown[] };
jest.mock("@/context/option-lists-provider", () => ({ useOptionLists: () => mockOptionLists }));

jest.mock("@/lib/onboardingStorage", () => ({
	getSeenWelcomeDecision: () => Promise.resolve(true),
	setSeenWelcomeDecision: jest.fn(() => Promise.resolve()),
	getSeenPartnerIntro: () => Promise.resolve(true),
	setSeenPartnerIntro: jest.fn(() => Promise.resolve()),
}));

jest.mock("@/context/realtime-status-context", () => ({
	useRealtimeStatus: () => ({
		setReconnecting: jest.fn(),
		registerRefetch: jest.fn(() => () => {}),
		runRefetches: jest.fn(),
	}),
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const Queue = require("@/app/(protected)/(tabs)/index").default;
const History = require("@/app/(protected)/(tabs)/history").default;
/* eslint-enable @typescript-eslint/no-require-imports */

/* --------------------------------------------------------------- fixtures - */

const today = new Date().toISOString();
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

/** Decided by Sam, today: the one Chase archives and then deletes. */
const DINNER: Decision = {
	...mockVoteDecision,
	id: "dinner",
	title: "Dinner tonight",
	creator_id: USER_1_ID,
	status: "completed",
	decided_by: USER_2_ID,
	decided_at: today,
	final_decision: "dinner-o1",
};
/** Decided by Chase, yesterday: stays put throughout. */
const MOVIE: Decision = {
	...mockVoteDecision,
	id: "movie",
	title: "Movie night",
	creator_id: USER_2_ID,
	status: "completed",
	decided_by: USER_1_ID,
	decided_at: yesterday,
	final_decision: "movie-o1",
};
/** Still open, created by Sam: no ⋮ for Chase. */
const TRIP: Decision = {
	...mockVoteDecision,
	id: "trip",
	title: "Weekend trip",
	creator_id: USER_2_ID,
};

const option = (id: string, decision_id: string, title: string): DecisionOption =>
	({ id, decision_id, title, created_at: today, eliminated_in_round: null }) as DecisionOption;

const vote = (id: string, decision_id: string, user_id: string, option_id: string): Vote =>
	({ id, decision_id, user_id, option_id, round: 1, created_at: today }) as Vote;

beforeEach(() => {
	jest.clearAllMocks();
	resetMockData();
	setMockAuthUser(USER_1_ID);
	setMockCouples([mockCouple]);
	setMockProfiles(mockProfiles);
	setMockDecisions([{ ...DINNER }, { ...MOVIE }, { ...TRIP }]);
	setMockDecisionOptions([
		option("dinner-o1", "dinner", "Tacos"),
		option("dinner-o2", "dinner", "Ramen"),
		option("movie-o1", "movie", "Dune"),
		option("movie-o2", "movie", "Heat"),
		option("trip-o1", "trip", "Lisbon"),
		option("trip-o2", "trip", "Porto"),
	]);
	setMockVotes([
		vote("v1", "dinner", USER_2_ID, "dinner-o1"),
		vote("v2", "movie", USER_1_ID, "movie-o1"),
	]);
});

const row = (id: string) => getMockDecisions().find((d) => d.id === id)!;

async function settle() {
	await act(async () => {});
	await act(async () => {});
}

/* ------------------------------------------------------------------- flow - */

it("decided card → Archive → History → Delete → gone everywhere, row soft-deleted", async () => {
	const user = userEvent.setup();

	// 1. The queue: all three, and only the decided one has a ⋮ for Chase.
	const queue = render(<Queue />);
	await waitFor(() => expect(screen.getByText("Dinner tonight")).toBeTruthy());
	expect(screen.getByText("Movie night")).toBeTruthy();
	expect(screen.getByText("Weekend trip")).toBeTruthy();

	// Collapsed cards: Dinner then Movie are the two decided ones (newest
	// created first is the mock's insertion order here), Trip has none.
	const mores = screen.getAllByLabelText("More");
	expect(mores).toHaveLength(2);

	// 2. ⋮ → Archive on Dinner. No confirm sheet: History keeps it.
	await user.press(mores[0]);
	expect(screen.queryByLabelText("Delete decision")).toBeNull();
	await user.press(screen.getByLabelText("Archive"));
	expect(mockDrawer.showDrawer).not.toHaveBeenCalled();

	// 3. It animates out, then it is gone from the queue — and archived in the DB.
	await waitFor(() => expect(screen.queryByText("Dinner tonight")).toBeNull());
	expect(screen.getByText("Movie night")).toBeTruthy();
	expect(screen.getByText("Weekend trip")).toBeTruthy();
	await waitFor(() => expect(row("dinner").archived_at).toBeTruthy());
	// Removed, not just hidden mid-exit.
	expect(screen.queryByText("Dinner tonight", { includeHiddenElements: true })).toBeNull();
	expect(row("dinner").archived_by).toBe(USER_1_ID);
	expect(row("dinner").deleted_at).toBeFalsy();
	queue.unmount();

	// A fresh load of the queue agrees: archived stays off it.
	const queueAgain = render(<Queue />);
	await waitFor(() => expect(screen.getByText("Movie night")).toBeTruthy());
	expect(screen.queryByText("Dinner tonight")).toBeNull();
	queueAgain.unmount();

	// 4. History still has it, and it still counts.
	const history = render(<History />);
	await settle();
	await waitFor(() => expect(screen.getByText("Dinner tonight")).toBeTruthy());
	expect(screen.getByText("Movie night")).toBeTruthy();
	expect(screen.queryByText("Weekend trip")).toBeNull();
	expect(screen.getByLabelText("2 decisions: you decided 1, Sam decided 1")).toBeTruthy();

	// 5. ⋮ → Delete on Dinner (newest first, so the first row).
	await user.press(screen.getAllByLabelText("More")[0]);
	expect(screen.getByLabelText("Move back to queue")).toBeTruthy();
	await user.press(screen.getByLabelText("Delete"));
	expect(row("dinner").deleted_at).toBeFalsy();

	const [heading, sheet] = mockDrawer.showDrawer.mock.calls.at(-1)!;
	expect(heading).toBe("Delete this decision?");
	const confirm = sheet as React.ReactElement<{ message: string; onConfirm(): void }>;
	expect(confirm.props.message).toBe("It will be removed from your history.");

	// 6. Confirm. (Through the node's prop: RNTL only presses in the newest
	// render, and the History screen has to stay that one.)
	await act(async () => confirm.props.onConfirm());
	expect(mockDrawer.hideDrawer).toHaveBeenCalled();

	// 7. Gone from History and from the stats.
	await waitFor(() => expect(screen.queryByText("Dinner tonight")).toBeNull());
	expect(screen.getByText("Movie night")).toBeTruthy();
	expect(screen.getByLabelText("1 decisions: you decided 1, Sam decided 0")).toBeTruthy();
	history.unmount();

	// 8. A fresh History load agrees — rows and the count query both.
	render(<History />);
	await settle();
	await waitFor(() => expect(screen.getByText("Movie night")).toBeTruthy());
	expect(screen.queryByText("Dinner tonight")).toBeNull();
	expect(screen.getByLabelText("1 decisions: you decided 1, Sam decided 0")).toBeTruthy();

	// 9. And the row is still in the database: soft-deleted, not removed,
	// with its options and its votes exactly where they were.
	expect(row("dinner")).toBeTruthy();
	expect(row("dinner").deleted_at).toBeTruthy();
	expect(row("dinner").deleted_by).toBe(USER_1_ID);
	expect(row("dinner").archived_at).toBeTruthy();
	expect(getMockDecisions()).toHaveLength(3);
	expect(getMockDecisionOptions().filter((o) => o.decision_id === "dinner")).toHaveLength(2);
	expect(getMockVotes().filter((v) => v.decision_id === "dinner")).toHaveLength(1);
});

it("History → Move back to queue puts an archived decision back on the queue", async () => {
	setMockDecisions([{ ...DINNER, archived_at: yesterday, archived_by: USER_2_ID }, { ...MOVIE }]);
	const user = userEvent.setup();

	const history = render(<History />);
	await settle();
	await waitFor(() => expect(screen.getByText("Dinner tonight")).toBeTruthy());
	await user.press(screen.getAllByLabelText("More")[0]);
	await act(async () => {
		await user.press(screen.getByLabelText("Move back to queue"));
	});
	expect(row("dinner").archived_at).toBeNull();
	expect(screen.getByText("Dinner tonight")).toBeTruthy();
	history.unmount();

	render(<Queue />);
	await waitFor(() => expect(screen.getByText("Dinner tonight")).toBeTruthy());
});

it("an open card's Delete is a soft delete, behind the confirm", async () => {
	setMockDecisions([{ ...TRIP, creator_id: USER_1_ID }]);
	const user = userEvent.setup();

	render(<Queue />);
	await waitFor(() => expect(screen.getByText("Weekend trip")).toBeTruthy());
	await user.press(screen.getByLabelText("More"));
	expect(screen.queryByLabelText("Archive")).toBeNull();
	await user.press(screen.getByLabelText("Delete decision"));

	const [, sheet] = mockDrawer.showDrawer.mock.calls.at(-1)!;
	await act(async () => (sheet as React.ReactElement<{ onConfirm(): void }>).props.onConfirm());

	await waitFor(() => expect(screen.queryByText("Weekend trip")).toBeNull());
	await waitFor(() => expect(row("trip").deleted_at).toBeTruthy());
	expect(getMockDecisionOptions().filter((o) => o.decision_id === "trip")).toHaveLength(2);
});
