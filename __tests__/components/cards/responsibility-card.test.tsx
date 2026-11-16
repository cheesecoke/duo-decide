import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { cardArtFor, CATEGORY_ART, DECK_ART } from "@/components/cards/card-art/card-art";
import {
	ResponsibilityCard,
	cardLabel,
	holderName,
	type ResponsibilityCardProps,
} from "@/components/cards/responsibility-card/responsibility-card";
import { CARD_CATEGORIES, STARTER_DECK } from "@/lib/responsibility-deck";

/**
 * ResponsibilityCard: the face of a card. What it says about itself (the
 * label a screen reader hears is the same facts the face draws), and that the
 * whole face is the one button.
 */

function renderCard(over: Partial<ResponsibilityCardProps> = {}) {
	const onOpen = jest.fn();
	render(
		<ResponsibilityCard
			title="Trash & recycling"
			category="home"
			daily
			deckKey="trash"
			holder="none"
			partnerLabel="Sam"
			onOpen={onOpen}
			{...over}
		/>,
	);
	return { onOpen };
}

describe("the face", () => {
	it("shows the kind, the name, the picture and who holds it", () => {
		renderCard({ holder: "b" });

		expect(screen.getByText("Home")).toBeTruthy();
		expect(screen.getByText("Trash & recycling")).toBeTruthy();
		expect(screen.getByText("Sam")).toBeTruthy();
		// Decorative, so hidden from screen readers; it is still drawn.
		expect(screen.getByTestId("card-art", { includeHiddenElements: true })).toBeTruthy();
		expect(screen.getByTestId("card-state-b")).toBeTruthy();
	});

	it("stamps a daily card, and only a daily card", () => {
		renderCard();
		expect(screen.getByTestId("daily-mark")).toBeTruthy();
		expect(screen.getByText("Daily")).toBeTruthy();

		screen.unmount();
		renderCard({ daily: false });
		expect(screen.queryByTestId("daily-mark")).toBeNull();
	});

	it("reads Not dealt, on a neutral card, when nobody holds it", () => {
		renderCard();

		expect(screen.getByText("Not dealt")).toBeTruthy();
		expect(screen.getByTestId("card-state-neutral")).toBeTruthy();
	});

	it("is one button that opens the card", () => {
		const { onOpen } = renderCard({ holder: "a" });

		fireEvent.press(screen.getByLabelText("Trash & recycling. Home, every day. Yours"));

		expect(onOpen).toHaveBeenCalledTimes(1);
	});
});

describe("cardLabel", () => {
	const base = {
		title: "Car",
		category: "out",
		daily: false,
		holder: "none",
		partnerLabel: "Sam",
	} as const;

	it("says the kind and whose it is", () => {
		expect(cardLabel(base)).toBe("Car. Out. Not dealt");
		expect(cardLabel({ ...base, daily: true, holder: "b" })).toBe("Car. Out, every day. Sam's");
		expect(cardLabel({ ...base, holder: "a" })).toBe("Car. Out. Yours");
	});
});

describe("holderName", () => {
	it("names the seat", () => {
		expect(holderName("a", "Sam")).toBe("You");
		expect(holderName("b", "Sam")).toBe("Sam");
		expect(holderName("b", null)).toBe("Partner");
		expect(holderName("none", "Sam")).toBe("Not dealt");
	});
});

describe("card art", () => {
	it("has a picture of its own for every starter card", () => {
		for (const card of STARTER_DECK) {
			expect(DECK_ART[card.key]).toBeDefined();
		}
		// And no two starter cards share one.
		expect(new Set(STARTER_DECK.map((card) => DECK_ART[card.key])).size).toBe(STARTER_DECK.length);
	});

	it("falls back to the category's picture for a card the couple wrote", () => {
		for (const category of CARD_CATEGORIES) {
			expect(cardArtFor(null, category)).toBe(CATEGORY_ART[category]);
			expect(cardArtFor("not-a-deck-key", category)).toBe(CATEGORY_ART[category]);
		}
		expect(cardArtFor("pets", "home")).toBe(DECK_ART.pets);
	});
});
