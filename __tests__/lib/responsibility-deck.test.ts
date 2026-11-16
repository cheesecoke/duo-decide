import {
	CARD_CATEGORIES,
	CARD_TITLE_MAX,
	STARTER_DECK,
	toCardCategory,
} from "@/lib/responsibility-deck";

/**
 * The starter deck is data the database trusts: `key` is unique per couple
 * (migration 025) and `category` / `title` have CHECK constraints. A bad row
 * here would fail the whole "Start with the starter deck" insert.
 */
describe("STARTER_DECK", () => {
	it("gives every card its own key and its own title", () => {
		expect(new Set(STARTER_DECK.map((card) => card.key)).size).toBe(STARTER_DECK.length);
		expect(new Set(STARTER_DECK.map((card) => card.title)).size).toBe(STARTER_DECK.length);
	});

	it("only uses categories and titles the database accepts", () => {
		for (const card of STARTER_DECK) {
			expect(CARD_CATEGORIES).toContain(card.category);
			expect(card.title.trim()).toBe(card.title);
			expect(card.title.length).toBeGreaterThan(0);
			expect(card.title.length).toBeLessThanOrEqual(CARD_TITLE_MAX);
		}
	});

	it("has something in every category", () => {
		for (const category of CARD_CATEGORIES) {
			expect(STARTER_DECK.some((card) => card.category === category)).toBe(true);
		}
	});
});

describe("toCardCategory", () => {
	it("passes a known category through and shows anything else as home", () => {
		expect(toCardCategory("care")).toBe("care");
		expect(toCardCategory("magic")).toBe("home");
		expect(toCardCategory(null)).toBe("home");
	});
});

describe("card descriptions", () => {
	/* eslint-disable @typescript-eslint/no-require-imports */
	const { aboutCard, STARTER_DECK: deck } = require("@/lib/responsibility-deck");
	/* eslint-enable @typescript-eslint/no-require-imports */

	it("every starter card says what holding it means, and no two say the same", () => {
		for (const card of deck) {
			expect(card.about.length).toBeGreaterThan(20);
			expect(aboutCard(card.key)).toBe(card.about);
		}
		expect(new Set(deck.map((card: { about: string }) => card.about)).size).toBe(deck.length);
	});

	it("has nothing to say about a card the couple wrote", () => {
		expect(aboutCard(null)).toBeNull();
		expect(aboutCard("not-a-deck-key")).toBeNull();
	});
});
