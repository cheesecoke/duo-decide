import * as React from "react";
import { act, render, screen, userEvent, within } from "@testing-library/react-native";

import type { UIDecision } from "@/hooks/decision-queue/useDecisionsData";
import type { UserContext } from "@/types/database";

/**
 * The Decision Queue screen, with the three data hooks mocked.
 *
 * The screen is presentation and wiring, so that is what is asserted: that the
 * mapper's output reaches the real `DecisionCard` (a vote card and a poll card
 * read correctly without either one being handed hand-written props), that
 * every action in FEATURE-INVENTORY §1.10's table still reaches the same hook
 * function, and that the one behaviour Chase added — confirm before delete —
 * cannot delete anything by itself.
 *
 * The drawer is mocked rather than mounted: `BottomDrawer` lives in the tabs
 * layout, not in this screen, so the sheet's content arrives here as the node
 * handed to `showDrawer` and is rendered on its own.
 *
 * nativewind/babel is off under jest (babel.config.js) and the Reanimated mock
 * lands every value on its target, so nothing here asserts a class or a frame.
 */

const mockYou: UserContext = {
	userId: "user-1",
	userName: "Chase",
	coupleId: "couple-1",
	partnerId: "user-2",
	partnerName: "Sam",
};

/* ------------------------------------------------------------------ mocks - */

const mockHooks = {
	decisions: [] as UIDecision[],
	pollVotes: {} as Record<string, Record<string, string>>,
	loading: false,
	error: null as string | null,
	voting: null as string | null,
	setDecisions: jest.fn(),
	handleVote: jest.fn(),
	handlePollVote: jest.fn(),
	selectOption: jest.fn(),
	createNewDecision: jest.fn(),
	updateExistingDecision: jest.fn(),
	updateDecisionInline: jest.fn(),
	deleteExistingDecision: jest.fn(),
};

const mockDrawer = {
	showDrawer: jest.fn(),
	hideDrawer: jest.fn(),
	updateContent: jest.fn(),
	isVisible: false,
	drawerType: null as string | null,
};

jest.mock("@/hooks/decision-queue/useDecisionsData", () => ({
	useDecisionsData: () => ({
		decisions: mockHooks.decisions,
		setDecisions: mockHooks.setDecisions,
		pollVotes: mockHooks.pollVotes,
		setPollVotes: jest.fn(),
		loading: mockHooks.loading,
		error: mockHooks.error,
		setError: jest.fn(),
	}),
}));

jest.mock("@/hooks/decision-queue/useDecisionVoting", () => ({
	useDecisionVoting: () => ({
		voting: mockHooks.voting,
		handleVote: mockHooks.handleVote,
		handlePollVote: mockHooks.handlePollVote,
		selectOption: mockHooks.selectOption,
	}),
}));

jest.mock("@/hooks/decision-queue/useDecisionManagement", () => ({
	useDecisionManagement: () => ({
		creating: false,
		createNewDecision: mockHooks.createNewDecision,
		updateExistingDecision: mockHooks.updateExistingDecision,
		updateDecisionInline: mockHooks.updateDecisionInline,
		deleteExistingDecision: mockHooks.deleteExistingDecision,
		updateOptions: jest.fn(),
	}),
}));

jest.mock("@/context/drawer-provider", () => ({
	useDrawer: () => mockDrawer,
}));

jest.mock("@/context/user-context-provider", () => ({
	useUserContext: () => ({ userContext: mockYou }),
}));

jest.mock("@/context/option-lists-provider", () => ({
	useOptionLists: () => ({ optionLists: [] }),
}));

// The onboarding flags are AsyncStorage reads; "already seen" is the state
// every test but the welcome ones wants.
const mockOnboarding = { welcome: true, partnerIntro: true };
jest.mock("@/lib/onboardingStorage", () => ({
	getSeenWelcomeDecision: () => Promise.resolve(mockOnboarding.welcome),
	setSeenWelcomeDecision: jest.fn(() => Promise.resolve()),
	getSeenPartnerIntro: () => Promise.resolve(mockOnboarding.partnerIntro),
	setSeenPartnerIntro: jest.fn(() => Promise.resolve()),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Home = require("@/app/(protected)/(tabs)/index").default;

/* --------------------------------------------------------------- fixtures - */

function decision(over: Partial<UIDecision> = {}): UIDecision {
	return {
		id: "d1",
		title: "Where are we eating?",
		description: "Somewhere we have not been.",
		deadline: "2026-09-25",
		creator_id: "user-2",
		partner_id: "user-1",
		couple_id: "couple-1",
		type: "vote",
		status: "pending",
		current_round: 1,
		decided_by: null,
		decided_at: null,
		final_decision: null,
		created_at: "2026-09-01T00:00:00Z",
		updated_at: "2026-09-01T00:00:00Z",
		expanded: true,
		createdBy: "Sam",
		details: "Somewhere we have not been.",
		options: [
			{ id: "o1", title: "Tacos", selected: false },
			{ id: "o2", title: "Ramen", selected: false },
		],
		...over,
	};
}

/**
 * Render the screen and let the onboarding flags land.
 *
 * `getSeenWelcomeDecision` / `getSeenPartnerIntro` are promises, so the two
 * `useState`s they feed settle a microtask after the first paint. Flushing
 * here — rather than letting each test discover it — is what keeps the run
 * free of "not wrapped in act(...)" noise and what makes "the welcome card is
 * absent" mean absent rather than not-yet-arrived.
 */
async function renderScreen() {
	const view = render(<Home />);
	await act(async () => {});
	return view;
}

beforeEach(() => {
	mockHooks.decisions = [];
	mockHooks.pollVotes = {};
	mockHooks.loading = false;
	mockHooks.error = null;
	mockHooks.voting = null;
	mockDrawer.isVisible = false;
	mockDrawer.drawerType = null;
	mockOnboarding.welcome = true;
	mockOnboarding.partnerIntro = true;
});

/* ------------------------------------------------------------------ tests - */

describe("the shell", () => {
	it("replaces the screen with one line while loading (inventory §1.10)", async () => {
		mockHooks.loading = true;
		await renderScreen();

		expect(screen.getByText("Loading decisions…")).toBeTruthy();
		expect(screen.queryByText("Decision Queue")).toBeNull();
	});

	it("shows the eyebrow and the headline", async () => {
		await renderScreen();

		expect(screen.getByText("Decision Queue")).toBeTruthy();
		expect(screen.getByText("deciding today?")).toBeTruthy();
	});

	// The mock's duo-row (decision-queue-round-3.html:448-451). The counting rule
	// itself is table-tested in __tests__/components/decision-queue/who-line.test.ts.
	it("says who the two of you are and what the queue holds", async () => {
		mockHooks.decisions = [
			decision(),
			decision({ id: "d2", title: "Which couch?", status: "completed", decidedBy: "Sam" }),
		];
		await renderScreen();

		expect(screen.getByText("You & Sam · 1 open, 1 settled")).toBeTruthy();
	});

	it("shows the error strip, and only when there is an error", async () => {
		await renderScreen();
		expect(screen.queryByTestId("decision-queue-error")).toBeNull();

		mockHooks.error = "Failed to update decision. Please try again.";
		await act(async () => {
			screen.rerender(<Home />);
		});

		expect(
			within(screen.getByTestId("decision-queue-error")).getByText(
				"Failed to update decision. Please try again.",
			),
		).toBeTruthy();
	});
});

describe("the empty queue — the hole in inventory §1.10 item 4", () => {
	it("renders the tile when nothing is queued", async () => {
		await renderScreen();

		const tile = screen.getByTestId("decision-queue-empty");
		expect(within(tile).getByText("Nothing in the queue yet")).toBeTruthy();
		// The 96 px pair, tokens.md §9 (the duo-row's 32 px pair is elsewhere).
		expect(within(tile).getAllByTestId("character")).toHaveLength(2);
	});

	// The tile is the button. It carries no button of its own: the footer pill
	// is already on screen with the same words, and two controls with one
	// accessible name is a thing a screen reader cannot tell apart.
	it("opens the create drawer when pressed, and is the only such control", async () => {
		await renderScreen();

		expect(screen.getAllByLabelText(/Create Decision/)).toHaveLength(1);

		await userEvent.press(screen.getByLabelText(/Nothing in the queue yet/));

		expect(mockDrawer.showDrawer).toHaveBeenCalledWith("Create Decision", expect.anything(), {
			type: "createDecision",
		});
	});

	it("is gone as soon as there is a decision", async () => {
		mockHooks.decisions = [decision()];
		await renderScreen();

		expect(screen.queryByText("Nothing in the queue yet")).toBeNull();
	});

	// index.tsx before: the welcome card was the empty state, so a user who had
	// dismissed it saw a blank screen.
	it("still renders once the welcome card has been dismissed", async () => {
		mockOnboarding.welcome = false;
		await renderScreen();
		await screen.findByText(/welcome to Duo/);

		expect(screen.getByText("Nothing in the queue yet")).toBeTruthy();
	});
});

describe("the intro cards", () => {
	it("welcomes a first-time user with an empty queue", async () => {
		mockOnboarding.welcome = false;
		await renderScreen();

		expect(await screen.findByText(/welcome to Duo/)).toBeTruthy();
		// The four "how it works" lines (inventory §1.10 item 4).
		expect(screen.getByText(/Vote = pick one option/)).toBeTruthy();
	});

	it("introduces a partner who joined a queue that already has decisions", async () => {
		mockOnboarding.partnerIntro = false;
		mockHooks.decisions = [decision()];
		await renderScreen();

		expect(await screen.findByText("Welcome, here's how decisions work!")).toBeTruthy();
	});

	it("shows neither once both flags are set", async () => {
		mockHooks.decisions = [decision()];
		await renderScreen();

		expect(screen.queryByText(/welcome to Duo/)).toBeNull();
		expect(screen.queryByText("Welcome, here's how decisions work!")).toBeNull();
	});
});

describe("the cards — what the mapper hands the real DecisionCard", () => {
	it("reads a vote card: who made it, its badge and its CTA", async () => {
		mockHooks.decisions = [decision()];
		await renderScreen();

		const card = screen.getByLabelText("Where are we eating?");
		expect(within(card).getByText("Pending")).toBeTruthy();
		expect(within(card).getByText("Created by Sam")).toBeTruthy();
		// Two options, none selected — inventory's DecisionDecideButton row 7.
		expect(within(card).getByText("Select option")).toBeTruthy();
	});

	it("reads a poll card off the ledger, keyed by display name", async () => {
		mockHooks.decisions = [
			decision({ id: "d2", title: "Which couch?", type: "poll", current_round: 2 }),
		];
		mockHooks.pollVotes = { d2: { Chase: "o1" } };
		await renderScreen();

		const card = screen.getByLabelText("Which couch?");
		// Only you have voted: badge "Waiting", CTA row 3.
		expect(within(card).getByText("Waiting")).toBeTruthy();
		expect(within(card).getByText("Vote Submitted")).toBeTruthy();
		expect(within(card).getByText("Round 2")).toBeTruthy();
		expect(within(card).getByText("Chase: voted")).toBeTruthy();
		expect(within(card).getByText("Sam: waiting")).toBeTruthy();
	});

	it("marks the card with a write in flight as submitting", async () => {
		mockHooks.decisions = [
			decision({
				options: [
					{ id: "o1", title: "Tacos", selected: true },
					{ id: "o2", title: "Ramen", selected: false },
				],
			}),
		];
		mockHooks.voting = "d1";
		await renderScreen();

		expect(screen.getByText("Submitting…")).toBeTruthy();
	});
});

describe("the action table (inventory §1.10)", () => {
	it("tap an option → selectOption, a local selection only", async () => {
		mockHooks.decisions = [decision()];
		await renderScreen();

		await userEvent.press(screen.getByLabelText("Tacos"));

		expect(mockHooks.selectOption).toHaveBeenCalledWith("d1", "o1");
		expect(mockHooks.handleVote).not.toHaveBeenCalled();
	});

	it("decide → handleVote with the option the user selected", async () => {
		mockHooks.decisions = [
			decision({
				options: [
					{ id: "o1", title: "Tacos", selected: false },
					{ id: "o2", title: "Ramen", selected: true },
				],
			}),
		];
		await renderScreen();

		expect(screen.getByText("Decide")).toBeTruthy();
		await userEvent.press(screen.getByTestId("decision-card-cta"));

		expect(mockHooks.handleVote).toHaveBeenCalledWith("d1", "o2");
	});

	it("submit vote → handlePollVote, which reads the selection itself", async () => {
		mockHooks.decisions = [
			decision({
				type: "poll",
				options: [
					{ id: "o1", title: "Tacos", selected: true },
					{ id: "o2", title: "Ramen", selected: false },
				],
			}),
		];
		await renderScreen();

		expect(screen.getByText("Submit Vote")).toBeTruthy();
		await userEvent.press(screen.getByTestId("decision-card-cta"));

		expect(mockHooks.handlePollVote).toHaveBeenCalledWith("d1");
		expect(mockHooks.handleVote).not.toHaveBeenCalled();
	});

	it("tap the chevron → the one card's expanded flag flips", async () => {
		mockHooks.decisions = [decision()];
		await renderScreen();

		await userEvent.press(screen.getByLabelText("Collapse"));

		const update = mockHooks.setDecisions.mock.calls[0][0] as (d: UIDecision[]) => UIDecision[];
		expect(update([decision(), decision({ id: "d9" })]).map((d) => d.expanded)).toEqual([
			false,
			true,
		]);
	});

	it("collapse all → every card, then expand all", async () => {
		mockHooks.decisions = [decision(), decision({ id: "d2", title: "Which couch?" })];
		await renderScreen();

		await userEvent.press(screen.getByLabelText("Collapse all"));

		const collapse = mockHooks.setDecisions.mock.calls[0][0] as (d: UIDecision[]) => UIDecision[];
		expect(collapse(mockHooks.decisions).map((d) => d.expanded)).toEqual([false, false]);

		// The button is the other one now (IconUnfoldMore, inventory §1.10 item 2).
		await userEvent.press(screen.getByLabelText("Expand all"));

		const expand = mockHooks.setDecisions.mock.calls[1][0] as (d: UIDecision[]) => UIDecision[];
		expect(expand(mockHooks.decisions).map((d) => d.expanded)).toEqual([true, true]);
	});

	it("save an inline edit → updateDecisionInline, in the hook's own shape", async () => {
		mockHooks.decisions = [decision({ createdBy: "Chase", creator_id: "user-1" })];
		await renderScreen();

		await userEvent.press(screen.getByLabelText("Edit decision"));
		await userEvent.press(screen.getByLabelText("Save edit"));

		expect(mockHooks.updateDecisionInline).toHaveBeenCalledWith("d1", {
			title: "Where are we eating?",
			details: "Somewhere we have not been.",
			deadline: "2026-09-25",
			options: [
				{ id: "o1", title: "Tacos", selected: false },
				{ id: "o2", title: "Ramen", selected: false },
			],
		});
	});

	it("cancel an inline edit → out of edit mode, and nothing written", async () => {
		mockHooks.decisions = [decision({ createdBy: "Chase", creator_id: "user-1" })];
		await renderScreen();

		await userEvent.press(screen.getByLabelText("Edit decision"));
		expect(screen.getByLabelText("Title")).toBeTruthy();

		await userEvent.press(screen.getByLabelText("Cancel edit"));

		// The title input is gone, and the edit affordance is back.
		expect(screen.queryByLabelText("Title")).toBeNull();
		expect(screen.getByLabelText("Edit decision")).toBeTruthy();
		expect(mockHooks.updateDecisionInline).not.toHaveBeenCalled();
	});

	it("the footer pill opens the create drawer", async () => {
		mockHooks.decisions = [decision()];
		await renderScreen();

		await userEvent.press(screen.getByLabelText("Create Decision"));

		expect(mockDrawer.showDrawer).toHaveBeenCalledWith("Create Decision", expect.anything(), {
			type: "createDecision",
		});
	});

	it("dismissing the welcome card writes the flag", async () => {
		mockOnboarding.welcome = false;
		await renderScreen();
		await screen.findByText(/welcome to Duo/);

		await userEvent.press(screen.getByLabelText("Got it"));

		expect(screen.queryByText(/welcome to Duo/)).toBeNull();
	});
});

/**
 * Chase's ruling 2026-09-20. The card only *asks* (`onDelete` is a plain
 * callback, decision-card.model.ts); the screen is what confirms.
 */
describe("delete asks first", () => {
	/** The kebab → "Delete decision", then the node handed to `showDrawer`. */
	async function openTheSheet() {
		mockHooks.decisions = [decision({ createdBy: "Chase", creator_id: "user-1" })];
		await renderScreen();

		await userEvent.press(screen.getByLabelText("More"));
		await userEvent.press(screen.getByLabelText("Delete decision"));

		expect(mockHooks.deleteExistingDecision).not.toHaveBeenCalled();
		expect(mockDrawer.showDrawer).toHaveBeenCalledWith("Delete this decision?", expect.anything(), {
			type: "confirmDelete",
		});

		screen.unmount();
		render(mockDrawer.showDrawer.mock.calls[0][1] as React.ReactElement);
	}

	it("names the decision in the sheet", async () => {
		await openTheSheet();

		expect(
			screen.getByText(
				"“Where are we eating?” and every vote on it are removed for both of you. This cannot be undone.",
			),
		).toBeTruthy();
	});

	it("keep it → nothing is deleted", async () => {
		await openTheSheet();

		await userEvent.press(screen.getByLabelText("Keep it"));

		expect(mockHooks.deleteExistingDecision).not.toHaveBeenCalled();
		expect(mockDrawer.hideDrawer).toHaveBeenCalled();
	});

	it("delete → deleted exactly once, and the sheet closes", async () => {
		await openTheSheet();

		await userEvent.press(screen.getByLabelText("Delete"));

		expect(mockHooks.deleteExistingDecision).toHaveBeenCalledTimes(1);
		expect(mockHooks.deleteExistingDecision).toHaveBeenCalledWith("d1");
		expect(mockDrawer.hideDrawer).toHaveBeenCalled();
	});
});
