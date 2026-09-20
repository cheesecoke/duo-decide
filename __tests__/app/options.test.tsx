import * as React from "react";
import { act, fireEvent, render, screen, userEvent, within } from "@testing-library/react-native";

import type { OptionListWithItems, UserContext } from "@/types/database";

/**
 * The Options tab (FEATURE-INVENTORY §1.11), with the two providers mocked.
 *
 * The screen is presentation and wiring, so that is what is asserted: that
 * every write still reaches the same provider function with the same
 * arguments, that the two things a pure card cannot know (whose seat it wears,
 * who may delete it) are computed here correctly, and that the one behaviour
 * this task added — confirm before delete — cannot delete anything by itself.
 *
 * Same shape as __tests__/app/decision-queue.test.tsx: the drawer is mocked
 * rather than mounted, so a sheet arrives here as the node handed to
 * `showDrawer` and is rendered on its own.
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

const mockLists = {
	optionLists: [] as OptionListWithItems[],
	loading: false,
	error: null as string | null,
	createList: jest.fn(),
	updateList: jest.fn(),
	deleteList: jest.fn(),
};

const mockUser = {
	userContext: mockYou as UserContext | null,
	loading: false,
	error: null as string | null,
};

const mockDrawer = {
	showDrawer: jest.fn(),
	hideDrawer: jest.fn(),
	updateContent: jest.fn(),
	isVisible: false,
	drawerType: null as string | null,
};

jest.mock("@/context/option-lists-provider", () => ({
	useOptionLists: () => ({
		optionLists: mockLists.optionLists,
		loading: mockLists.loading,
		error: mockLists.error,
		refreshLists: jest.fn(),
		createList: mockLists.createList,
		updateList: mockLists.updateList,
		deleteList: mockLists.deleteList,
	}),
}));

jest.mock("@/context/user-context-provider", () => ({
	useUserContext: () => ({
		userContext: mockUser.userContext,
		loading: mockUser.loading,
		error: mockUser.error,
	}),
}));

jest.mock("@/context/drawer-provider", () => ({
	useDrawer: () => mockDrawer,
}));

jest.mock("@/context/theme-provider", () => ({
	useTheme: () => ({ colorMode: "light", toggleColorMode: jest.fn() }),
}));

const mockOnboarding = { welcomeOptions: true };
jest.mock("@/lib/onboardingStorage", () => ({
	getSeenWelcomeOptions: () => Promise.resolve(mockOnboarding.welcomeOptions),
	setSeenWelcomeOptions: jest.fn(() => Promise.resolve()),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Options = require("@/app/(protected)/(tabs)/options").default;

/* --------------------------------------------------------------- fixtures - */

function list(over: Partial<OptionListWithItems> = {}): OptionListWithItems {
	return {
		id: "l1",
		couple_id: "couple-1",
		title: "Dinner spots",
		description: "Places we keep coming back to",
		creator_id: "user-1",
		created_at: "2026-09-01T00:00:00Z",
		updated_at: "2026-09-01T00:00:00Z",
		items: [
			{ id: "o1", option_list_id: "l1", title: "Tacos", created_at: "2026-09-01T00:00:00Z" },
			{ id: "o2", option_list_id: "l1", title: "Ramen", created_at: "2026-09-01T00:00:00Z" },
		],
		...over,
	} as OptionListWithItems;
}

/** `WELCOME_OPTIONS.title` — the one string that says the card is on screen. */
const WELCOME_TITLE = "Lists of options — your first one.";

/** Render, and let the AsyncStorage onboarding flag land. */
async function renderScreen() {
	const view = render(<Options />);
	await act(async () => {});
	return view;
}

beforeEach(() => {
	jest.clearAllMocks();
	mockLists.optionLists = [];
	mockLists.loading = false;
	mockLists.error = null;
	mockLists.createList.mockResolvedValue(list());
	mockLists.updateList.mockResolvedValue(undefined);
	mockLists.deleteList.mockResolvedValue(undefined);
	mockUser.userContext = mockYou;
	mockUser.loading = false;
	mockUser.error = null;
	mockDrawer.isVisible = false;
	mockDrawer.drawerType = null;
	mockOnboarding.welcomeOptions = true;
});

/* ------------------------------------------------------------------ tests - */

describe("the shell", () => {
	it("replaces the screen with one line while either provider is loading", async () => {
		mockLists.loading = true;
		await renderScreen();

		expect(screen.getByText("Loading option lists…")).toBeTruthy();
		expect(screen.queryByText("Options")).toBeNull();
	});

	it("waits on the user provider too", async () => {
		mockUser.loading = true;
		await renderScreen();

		expect(screen.getByText("Loading option lists…")).toBeTruthy();
	});

	it("shows the eyebrow and the headline", async () => {
		await renderScreen();

		expect(screen.getByText("Options")).toBeTruthy();
		expect(screen.getByText("reach for again")).toBeTruthy();
	});

	it("shows the error strip for either provider's error, and only then", async () => {
		await renderScreen();
		expect(screen.queryByTestId("screen-error")).toBeNull();

		mockLists.error = "Failed to load option lists";
		await act(async () => {
			screen.rerender(<Options />);
		});

		expect(
			within(screen.getByTestId("screen-error")).getByText("Failed to load option lists"),
		).toBeTruthy();
	});

	it("shows the user provider's error too", async () => {
		mockUser.error = "Failed to load your account";
		await renderScreen();

		expect(
			within(screen.getByTestId("screen-error")).getByText("Failed to load your account"),
		).toBeTruthy();
	});
});

/**
 * Four combinations of "are there lists" × "has the welcome been seen".
 * §1.11 only had the welcome card, so an empty tab with the flag set rendered
 * nothing at all — the tile is what closes that.
 */
describe("the empty tab and the welcome card", () => {
	it("no lists, welcome unseen → both", async () => {
		mockOnboarding.welcomeOptions = false;
		await renderScreen();

		expect(await screen.findByText(WELCOME_TITLE)).toBeTruthy();
		expect(screen.getByTestId("options-empty")).toBeTruthy();
	});

	it("no lists, welcome seen → the tile alone", async () => {
		await renderScreen();

		expect(screen.queryByText(WELCOME_TITLE)).toBeNull();
		const tile = screen.getByTestId("options-empty");
		expect(within(tile).getByText("No lists yet")).toBeTruthy();
	});

	it("lists, welcome unseen → neither", async () => {
		mockOnboarding.welcomeOptions = false;
		mockLists.optionLists = [list()];
		await renderScreen();

		expect(screen.queryByText(WELCOME_TITLE)).toBeNull();
		expect(screen.queryByTestId("options-empty")).toBeNull();
	});

	it("lists, welcome seen → neither", async () => {
		mockLists.optionLists = [list()];
		await renderScreen();

		expect(screen.queryByText(WELCOME_TITLE)).toBeNull();
		expect(screen.queryByTestId("options-empty")).toBeNull();
	});

	// tokens.md §9 keeps the characters on the queue and the welcome; and the
	// footer pill is already on screen saying "Create List".
	it("the tile is the button, and the only other one", async () => {
		await renderScreen();

		expect(screen.getAllByLabelText(/Create List/)).toHaveLength(1);
		expect(screen.queryAllByTestId("character")).toHaveLength(0);

		await userEvent.press(screen.getByLabelText(/No lists yet/));

		expect(mockDrawer.showDrawer).toHaveBeenCalledWith("Create New List", expect.anything(), {
			type: "createList",
		});
	});

	it("dismissing the welcome card takes it off the screen", async () => {
		mockOnboarding.welcomeOptions = false;
		await renderScreen();
		await screen.findByText(WELCOME_TITLE);

		await userEvent.press(screen.getByLabelText("Got it"));

		expect(screen.queryByText(WELCOME_TITLE)).toBeNull();
	});
});

describe("the cards", () => {
	it("renders one per list, collapsed, with its count", async () => {
		mockLists.optionLists = [list(), list({ id: "l2", title: "Date nights", items: [] })];
		await renderScreen();

		expect(screen.getByLabelText("Dinner spots")).toBeTruthy();
		expect(screen.getByText("2 options")).toBeTruthy();
		expect(screen.getByText("No options yet")).toBeTruthy();
	});

	/**
	 * tokens.md §10's ruling: a list's rail and wash are its *creator's* seat.
	 * This is the mapping the pure card cannot do for itself.
	 */
	it("wears person A's seat for a list you made", async () => {
		mockLists.optionLists = [list({ creator_id: "user-1" })];
		await renderScreen();

		expect(screen.getByTestId("card-state-a")).toBeTruthy();
	});

	it("wears person B's seat for one your partner made", async () => {
		mockLists.optionLists = [list({ creator_id: "user-2" })];
		await renderScreen();

		expect(screen.getByTestId("card-state-b")).toBeTruthy();
	});

	it("stays neutral when nobody is on record as having made it", async () => {
		mockLists.optionLists = [list({ creator_id: null })];
		await renderScreen();

		expect(screen.getByTestId("card-state-neutral")).toBeTruthy();
	});

	it("stays neutral for a creator who is neither of you", async () => {
		mockLists.optionLists = [list({ creator_id: "user-9" })];
		await renderScreen();

		expect(screen.getByTestId("card-state-neutral")).toBeTruthy();
	});

	it("offers the trash only on a list you made", async () => {
		mockLists.optionLists = [
			list({ creator_id: "user-1" }),
			list({ id: "l2", creator_id: "user-2" }),
		];
		await renderScreen();

		await userEvent.press(screen.getAllByLabelText("Expand")[0]);
		await userEvent.press(screen.getAllByLabelText("Expand")[0]);

		expect(screen.getAllByLabelText("Delete list")).toHaveLength(1);
	});

	it("expands one card at a time", async () => {
		mockLists.optionLists = [list()];
		await renderScreen();

		expect(screen.queryByText("Tacos")).toBeNull();
		await userEvent.press(screen.getByLabelText("Expand"));

		expect(screen.getByText("Tacos")).toBeTruthy();
		expect(screen.getByLabelText("Collapse")).toBeTruthy();
	});

	it("collapse-all closes every card, expand-all opens every card", async () => {
		mockLists.optionLists = [list(), list({ id: "l2", title: "Date nights" })];
		await renderScreen();

		// Open them all, then check the button is offering the other direction.
		await userEvent.press(screen.getByLabelText("Collapse all"));
		expect(screen.getAllByLabelText("Expand")).toHaveLength(2);

		await userEvent.press(screen.getByLabelText("Expand all"));
		expect(screen.getAllByLabelText("Collapse")).toHaveLength(2);

		await userEvent.press(screen.getByLabelText("Collapse all"));
		expect(screen.getAllByLabelText("Expand")).toHaveLength(2);
	});

	// §1.11: the card's repeater writes through `updateList`, title and
	// description carried along unchanged.
	it("an option edit reaches updateList with the list's own title", async () => {
		mockLists.optionLists = [list()];
		await renderScreen();

		await userEvent.press(screen.getByLabelText("Expand"));
		await userEvent.press(screen.getByLabelText("Edit options"));
		await userEvent.press(screen.getByLabelText("Add option"));

		expect(mockLists.updateList).toHaveBeenCalledWith(
			"l1",
			{ title: "Dinner spots", description: "Places we keep coming back to" },
			[
				expect.objectContaining({ id: "o1", title: "Tacos" }),
				expect.objectContaining({ id: "o2", title: "Ramen" }),
				{ id: expect.stringMatching(/^temp-/), title: "" },
			],
		);
	});
});

describe("the create sheet", () => {
	/** Open it, then render the node handed to `showDrawer` on its own. */
	async function openTheSheet() {
		await renderScreen();

		await userEvent.press(screen.getByLabelText("Create List"));

		expect(mockDrawer.showDrawer).toHaveBeenCalledWith("Create New List", expect.anything(), {
			type: "createList",
		});
	}

	it("the footer pill opens it", async () => {
		await openTheSheet();
	});

	/**
	 * §1.11's quiet contract, end to end: a row the user typed into but never
	 * confirmed with ✓ is on the list that gets created; a row they never
	 * typed into is filtered.
	 */
	it("submits the exact payload, unconfirmed rows included, then closes", async () => {
		const app = await renderScreen();
		mockDrawer.isVisible = true;
		mockDrawer.drawerType = "createList";

		await userEvent.press(app.getByLabelText("Create List"));

		/**
		 * The sheet lives in a tree of its own (`BottomDrawer` is in the tabs
		 * layout, not here), so it is rendered separately and re-fed the latest
		 * node the screen pushed. `app` is addressed by name rather than through
		 * `screen`, which follows whichever tree rendered last.
		 */
		const latest = () =>
			(mockDrawer.updateContent.mock.calls.at(-1)?.[0] ??
				mockDrawer.showDrawer.mock.calls.at(-1)?.[1]) as React.ReactElement;

		const sheet = render(latest());

		// `changeText` rather than `type`: the title lives on the *screen*, and
		// this tree is only re-fed between steps, so typing letter by letter
		// would send each keystroke against a stale value and only the last
		// character would survive. One change is what a real keystroke against
		// a live drawer does anyway.
		fireEvent.changeText(sheet.getByLabelText("Title"), "Dinner spots");
		await act(async () => {});
		sheet.rerender(latest());

		// A row typed into but never confirmed with the ✓ — §1.11's contract.
		await userEvent.press(sheet.getByLabelText("Edit options"));
		await userEvent.type(sheet.getByLabelText("Option 1"), "Tacos");
		await act(async () => {});
		sheet.rerender(latest());

		await userEvent.press(sheet.getByLabelText("Create List"));
		await act(async () => {});

		expect(mockLists.createList).toHaveBeenCalledWith(
			{
				couple_id: "couple-1",
				title: "Dinner spots",
				description: "",
				creator_id: "user-1",
			},
			[{ id: expect.stringMatching(/^temp-/), title: "Tacos" }],
		);
		expect(mockDrawer.hideDrawer).toHaveBeenCalled();
	});
});

/**
 * Chase's ruling of 2026-09-20, extended from decisions to lists: both people
 * lose it, and nothing in the app undoes anything.
 */
describe("delete asks first", () => {
	async function openTheConfirmSheet() {
		mockLists.optionLists = [list({ creator_id: "user-1" })];
		await renderScreen();

		await userEvent.press(screen.getByLabelText("Expand"));
		await userEvent.press(screen.getByLabelText("Delete list"));

		expect(mockLists.deleteList).not.toHaveBeenCalled();
		expect(mockDrawer.showDrawer).toHaveBeenCalledWith("Delete this list?", expect.anything(), {
			type: "confirmDelete",
		});

		screen.unmount();
		render(mockDrawer.showDrawer.mock.calls.at(-1)?.[1] as React.ReactElement);
	}

	/**
	 * The second sentence is checked against lib/database.ts: `createDecision`
	 * copies option *titles* into `decision_options`, which has no reference
	 * back to `option_list_items` (schema.sql:70-78).
	 */
	it("names the list and says what actually happens", async () => {
		await openTheConfirmSheet();

		expect(
			screen.getByText(
				"“Dinner spots” and its options are removed for both of you. Decisions you already made from it keep their options.",
			),
		).toBeTruthy();
	});

	it("keep it → nothing is deleted", async () => {
		await openTheConfirmSheet();

		await userEvent.press(screen.getByLabelText("Keep it"));

		expect(mockLists.deleteList).not.toHaveBeenCalled();
		expect(mockDrawer.hideDrawer).toHaveBeenCalled();
	});

	it("delete → deleted exactly once, and the sheet closes", async () => {
		await openTheConfirmSheet();

		await userEvent.press(screen.getByLabelText("Delete"));

		expect(mockLists.deleteList).toHaveBeenCalledTimes(1);
		expect(mockLists.deleteList).toHaveBeenCalledWith("l1");
		expect(mockDrawer.hideDrawer).toHaveBeenCalled();
	});
});
