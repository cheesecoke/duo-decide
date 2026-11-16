import * as React from "react";
import { act, fireEvent, render, screen, userEvent, within } from "@testing-library/react-native";

import { STARTER_DECK } from "@/lib/responsibility-deck";
import type { ResponsibilityCard, UserContext } from "@/types/database";

/**
 * The Cards tab, with the two providers mocked.
 *
 * The screen is presentation and wiring, so that is what is asserted: that a
 * holder's user id becomes the right seat for whoever is looking, that the
 * tally and the filter agree with the cards, and that every write reaches the
 * provider with user ids rather than seats.
 *
 * Same shape as __tests__/app/options.test.tsx: the drawer is mocked rather
 * than mounted, so a sheet arrives here as the node handed to `showDrawer`
 * and is rendered on its own.
 */

const mockYou: UserContext = {
	userId: "user-1",
	userName: "Chase",
	coupleId: "couple-1",
	partnerId: "user-2",
	partnerName: "Sam",
};

const mockCards = {
	cards: [] as ResponsibilityCard[],
	loading: false,
	error: null as string | null,
	addDeck: jest.fn(),
	addCard: jest.fn(),
	dealCard: jest.fn(),
	removeCard: jest.fn(),
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

jest.mock("@/context/responsibility-cards-provider", () => ({
	useResponsibilityCards: () => mockCards,
}));

jest.mock("@/context/user-context-provider", () => ({
	useUserContext: () => mockUser,
}));

jest.mock("@/context/drawer-provider", () => ({
	useDrawer: () => mockDrawer,
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Cards = require("@/app/(protected)/(tabs)/cards").default;

function card(over: Partial<ResponsibilityCard> = {}): ResponsibilityCard {
	return {
		id: "c1",
		couple_id: "couple-1",
		title: "Trash & recycling",
		category: "home",
		daily: true,
		holder_id: null,
		deck_key: "trash",
		created_by: "user-1",
		removed_at: null,
		removed_by: null,
		created_at: "2026-11-15T00:00:00Z",
		updated_at: "2026-11-15T00:00:00Z",
		...over,
	};
}

const DECK = [
	card({ id: "c1", title: "Trash & recycling", holder_id: "user-1" }),
	card({ id: "c2", title: "Groceries", holder_id: "user-2" }),
	card({ id: "c3", title: "Car", category: "out", daily: false }),
	card({ id: "c4", title: "Cleaning", daily: false, holder_id: "user-1" }),
];

const lastSheet = () => mockDrawer.showDrawer.mock.calls.at(-1)?.[1] as React.ReactElement;

beforeEach(() => {
	jest.clearAllMocks();
	mockCards.cards = [];
	mockCards.loading = false;
	mockCards.error = null;
	mockCards.addDeck.mockResolvedValue(true);
	mockCards.addCard.mockResolvedValue(true);
	mockCards.dealCard.mockResolvedValue(undefined);
	mockCards.removeCard.mockResolvedValue(undefined);
	mockUser.userContext = mockYou;
	mockUser.loading = false;
	mockUser.error = null;
	mockDrawer.isVisible = false;
	mockDrawer.drawerType = null;
});

describe("the shell", () => {
	it("replaces the screen with one line while either provider is loading", () => {
		mockCards.loading = true;
		render(<Cards />);

		expect(screen.getByText("Loading cards…")).toBeTruthy();
		expect(screen.queryByText("holding what")).toBeNull();
	});

	it("shows the eyebrow and the headline", () => {
		render(<Cards />);

		expect(screen.getByText("Cards")).toBeTruthy();
		expect(screen.getByText("holding what")).toBeTruthy();
	});

	it("shows the error strip for the provider's error, and only then", () => {
		render(<Cards />);
		expect(screen.queryByTestId("screen-error")).toBeNull();

		mockCards.error = "Failed to load cards";
		screen.rerender(<Cards />);

		expect(within(screen.getByTestId("screen-error")).getByText("Failed to load cards")).toBeTruthy();
	});
});

describe("an empty deck", () => {
	it("offers the starter deck, says how big it is, and has no filter", () => {
		render(<Cards />);

		const empty = screen.getByTestId("cards-empty");
		expect(within(empty).getByText("Start with the starter deck")).toBeTruthy();
		expect(within(empty).getByText(new RegExp(`^${STARTER_DECK.length} everyday jobs`))).toBeTruthy();
		expect(screen.queryByLabelText("Show cards held by")).toBeNull();
	});

	it("adds the deck once however fast the tile is tapped", async () => {
		let finish: (ok: boolean) => void = () => {};
		mockCards.addDeck.mockReturnValue(new Promise<boolean>((resolve) => (finish = resolve)));
		render(<Cards />);

		const tile = screen.getByLabelText(/^Start with the starter deck/);
		fireEvent.press(tile);
		fireEvent.press(tile);

		expect(mockCards.addDeck).toHaveBeenCalledTimes(1);
		expect(screen.getByText("Dealing the deck…")).toBeTruthy();

		await act(async () => finish(true));
	});
});

describe("a deck", () => {
	beforeEach(() => {
		mockCards.cards = DECK;
	});

	it("seats each holder for the viewer: you are A, your partner is B", () => {
		render(<Cards />);

		const seatOfCard = (title: string) =>
			within(screen.getByLabelText(title)).getByLabelText("You").props.accessibilityState.checked
				? "a"
				: within(screen.getByLabelText(title)).getByLabelText("Sam").props.accessibilityState.checked
					? "b"
					: "none";

		expect(seatOfCard("Trash & recycling")).toBe("a");
		expect(seatOfCard("Groceries")).toBe("b");
		expect(seatOfCard("Car")).toBe("none");
	});

	it("treats a holder who is no longer in the couple as not dealt", () => {
		mockCards.cards = [card({ holder_id: "someone-who-left" })];
		render(<Cards />);

		expect(screen.getByLabelText("Not dealt 1")).toBeTruthy();
	});

	it("tallies who holds how many on the filter chips", () => {
		render(<Cards />);

		const filter = screen.getByLabelText("Show cards held by");
		expect(within(filter).getByLabelText("All 4")).toBeTruthy();
		expect(within(filter).getByLabelText("You 2")).toBeTruthy();
		expect(within(filter).getByLabelText("Sam 1")).toBeTruthy();
		expect(within(filter).getByLabelText("Not dealt 1")).toBeTruthy();
	});

	it("groups by kind, daily jobs first", () => {
		render(<Cards />);

		const home = screen.getByTestId("cards-section-home");
		const titles = within(home)
			.getAllByText(/^(Groceries|Trash & recycling|Cleaning)$/)
			.map((node) => node.props.children);
		expect(titles).toEqual(["Groceries", "Trash & recycling", "Cleaning"]);
		expect(within(screen.getByTestId("cards-section-out")).getByText("Car")).toBeTruthy();
		expect(screen.queryByTestId("cards-section-care")).toBeNull();
	});

	it("filters to one holder", async () => {
		render(<Cards />);
		const user = userEvent.setup();

		await user.press(screen.getByLabelText("Sam 1"));

		expect(screen.getByText("Groceries")).toBeTruthy();
		expect(screen.queryByText("Trash & recycling")).toBeNull();
		expect(screen.queryByText("Car")).toBeNull();
	});

	it("says so when the filter leaves nothing", async () => {
		mockCards.cards = [card({ holder_id: "user-1" })];
		render(<Cards />);
		const user = userEvent.setup();

		await user.press(screen.getByLabelText("Not dealt 0"));

		expect(screen.getByTestId("cards-filter-empty")).toBeTruthy();
	});

	it("deals with user ids, not seats", async () => {
		render(<Cards />);
		const user = userEvent.setup();

		await user.press(within(screen.getByLabelText("Car")).getByLabelText("Sam"));
		await user.press(within(screen.getByLabelText("Car")).getByLabelText("You"));
		// Your own chip again: back in the deck.
		await user.press(within(screen.getByLabelText("Trash & recycling")).getByLabelText("You"));

		expect(mockCards.dealCard.mock.calls).toEqual([
			["c3", "user-2"],
			["c3", "user-1"],
			["c1", null],
		]);
	});

	it("has no partner chip or partner filter while no partner is linked", () => {
		mockUser.userContext = { ...mockYou, partnerId: null, partnerName: null };
		render(<Cards />);

		expect(screen.queryByLabelText(/^Sam/)).toBeNull();
		// The card your former partner held reads as not dealt.
		expect(screen.getByLabelText("Not dealt 2")).toBeTruthy();
	});
});

describe("removing a card", () => {
	it("asks first, and removes nothing by itself", async () => {
		mockCards.cards = DECK;
		render(<Cards />);
		const user = userEvent.setup();

		await user.press(screen.getByLabelText("More for Car"));
		await user.press(screen.getByLabelText("Remove card"));

		expect(mockCards.removeCard).not.toHaveBeenCalled();
		expect(mockDrawer.showDrawer).toHaveBeenCalledWith("Remove this card?", expect.anything(), {
			type: "confirmDelete",
		});

		render(lastSheet());
		expect(screen.getByText("“Car” leaves the deck for both of you.")).toBeTruthy();

		await user.press(screen.getByLabelText("Keep it"));
		expect(mockCards.removeCard).not.toHaveBeenCalled();

		await user.press(screen.getByLabelText("Delete"));
		expect(mockCards.removeCard).toHaveBeenCalledWith("c3");
	});
});

describe("adding a card", () => {
	it("opens the sheet from the footer", async () => {
		render(<Cards />);
		const user = userEvent.setup();

		await user.press(screen.getByLabelText("Add card"));

		expect(mockDrawer.showDrawer).toHaveBeenCalledWith("Add a card", expect.anything(), {
			type: "addCard",
		});
	});

	it("submits the draft with the holder as a user id, then closes", async () => {
		mockDrawer.isVisible = true;
		mockDrawer.drawerType = "addCard";
		render(<Cards />);

		/** The sheet as the screen last pushed it. */
		const sheet = () => {
			const node = (mockDrawer.updateContent.mock.calls.at(-1)?.[0] ??
				lastSheet()) as React.ReactElement;
			return render(node);
		};

		let view = sheet();
		fireEvent.changeText(view.getByLabelText("Card"), "  Taxes ");
		view.unmount();

		view = sheet();
		fireEvent.press(view.getByLabelText("Out"));
		view.unmount();

		view = sheet();
		fireEvent.press(view.getByLabelText("Sam"));
		view.unmount();

		view = sheet();
		await act(async () => {
			fireEvent.press(view.getByLabelText("Add card"));
		});

		expect(mockCards.addCard).toHaveBeenCalledWith({
			title: "  Taxes ",
			category: "out",
			daily: false,
			holderId: "user-2",
		});
		expect(mockDrawer.hideDrawer).toHaveBeenCalledTimes(1);
	});

	it("keeps the sheet open when the write fails", async () => {
		mockCards.addCard.mockResolvedValue(false);
		mockDrawer.isVisible = true;
		mockDrawer.drawerType = "addCard";
		render(<Cards />);

		let view = render(mockDrawer.updateContent.mock.calls.at(-1)?.[0] as React.ReactElement);
		fireEvent.changeText(view.getByLabelText("Card"), "Taxes");
		view.unmount();

		view = render(mockDrawer.updateContent.mock.calls.at(-1)?.[0] as React.ReactElement);
		await act(async () => {
			fireEvent.press(view.getByLabelText("Add card"));
		});

		expect(mockCards.addCard).toHaveBeenCalledTimes(1);
		expect(mockDrawer.hideDrawer).not.toHaveBeenCalled();
	});
});
