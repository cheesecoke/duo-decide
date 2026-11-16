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
