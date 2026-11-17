import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { ClaimSheet, type ClaimSheetProps } from "@/components/cards/claim-sheet/claim-sheet";
import { DeckStrip } from "@/components/cards/deck-strip/deck-strip";

/**
 * ClaimSheet (whose card is this?) and DeckStrip (each person's stack). Both
 * are pure, so each test is props in, callbacks and words out.
 */

const ABOUT =
	"Knowing what's in the fridge, keeping the list, and getting the food into the house.";

function renderSheet(over: Partial<ClaimSheetProps> = {}) {
	const handlers = { onDeal: jest.fn(), onRemove: jest.fn() };
	render(
		<ClaimSheet
			category="home"
			daily
			deckKey="groceries"
			about={ABOUT}
			holder="none"
			partnerLabel="Sam"
			{...handlers}
			{...over}
		/>,
	);
	return handlers;
}

describe("ClaimSheet", () => {
	it("says what the card asks of its holder", () => {
		renderSheet();

		expect(screen.getByText(ABOUT)).toBeTruthy();
		expect(screen.getByText("Whose card is this?")).toBeTruthy();
	});

	it("leaves the description out for a card the couple wrote", () => {
		renderSheet({ about: null, deckKey: null });

		expect(screen.queryByText(ABOUT)).toBeNull();
		expect(screen.getByText("Whose card is this?")).toBeTruthy();
	});

	it("gives the card to whoever is tapped", () => {
		const { onDeal } = renderSheet();

		fireEvent.press(screen.getByLabelText("Give this card to you"));

		expect(onDeal).toHaveBeenCalledWith("a");
		// The pick shows at once, before the write comes back.
		expect(screen.getByText("Yours")).toBeTruthy();
	});

	it("gives it to the partner by name", () => {
		const { onDeal } = renderSheet();

		fireEvent.press(screen.getByLabelText("Give this card to Sam"));

		expect(onDeal).toHaveBeenCalledWith("b");
		expect(screen.getByText("Theirs")).toBeTruthy();
	});

	it("takes one pick per opening, however fast the tiles are tapped", () => {
		const { onDeal } = renderSheet();

		fireEvent.press(screen.getByLabelText("Give this card to you"));
		fireEvent.press(screen.getByLabelText("Give this card to Sam"));

		expect(onDeal).toHaveBeenCalledTimes(1);
	});

	it("shows who holds it, and lets it change hands", () => {
		const { onDeal } = renderSheet({ holder: "a" });

		expect(screen.getByLabelText("You, holds this card")).toBeTruthy();
		fireEvent.press(screen.getByLabelText("Give this card to Sam"));

		expect(onDeal).toHaveBeenCalledWith("b");
	});

	it("puts a held card back in the deck, and offers that only when it is held", () => {
		const { onDeal } = renderSheet({ holder: "b" });
		fireEvent.press(screen.getByLabelText("Put back in the deck"));
		expect(onDeal).toHaveBeenCalledWith("none");

		screen.unmount();
		renderSheet({ holder: "none" });
		expect(screen.queryByLabelText("Put back in the deck")).toBeNull();
	});

	it("leaves the partner's tile out while no partner is linked", () => {
		renderSheet({ partnerLabel: null });

		expect(screen.getByLabelText("Give this card to you")).toBeTruthy();
		expect(screen.queryByLabelText(/Sam/)).toBeNull();
	});

	it("says nothing about doing or logging the job", () => {
		renderSheet({ holder: "a" });

		expect(screen.queryByText(/did this|done|today/i)).toBeNull();
	});

	it("removes through the callback", () => {
		const { onRemove } = renderSheet();

		fireEvent.press(screen.getByLabelText("Remove card"));

		expect(onRemove).toHaveBeenCalledTimes(1);
	});
});

describe("DeckStrip", () => {
	it("counts each person's cards", () => {
		render(<DeckStrip you={11} partner={1} partnerLabel="Sam" />);

		expect(screen.getByLabelText("You: 11 cards")).toBeTruthy();
		expect(screen.getByLabelText("Sam: 1 card")).toBeTruthy();
	});

	it("is one stack while no partner is linked", () => {
		render(<DeckStrip you={2} partner={0} partnerLabel={null} />);

		expect(screen.getByTestId("deck-a")).toBeTruthy();
		expect(screen.queryByTestId("deck-b")).toBeNull();
	});

	it("follows the count as cards land and leave", () => {
		render(<DeckStrip you={2} partner={3} partnerLabel="Sam" />);

		act(() => screen.rerender(<DeckStrip you={3} partner={2} partnerLabel="Sam" />));

		expect(screen.getByLabelText("You: 3 cards")).toBeTruthy();
		expect(screen.getByLabelText("Sam: 2 cards")).toBeTruthy();
	});
});
