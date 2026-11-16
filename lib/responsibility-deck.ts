/**
 * Responsibility cards: the categories, and the starter deck.
 *
 * A card is one job in a couple's shared life, held by one of them. The
 * starter deck is the app's own list of common ones, so a couple has something
 * to deal on day one instead of an empty screen. They can remove any of it and
 * write their own.
 *
 * `key` is the card's identity in the database (`deck_key`, unique per couple,
 * migration 025). **Never change or reuse a key**: it is what stops the deck
 * being added twice, and what stops a card the couple removed from coming
 * back. Reword a `title` freely; couples who already have the card keep the
 * title they were given.
 */

const CARD_CATEGORIES = ["home", "out", "care", "us"] as const;

type CardCategory = (typeof CARD_CATEGORIES)[number];

/** What the app calls each category. */
const CATEGORY_LABEL: Record<CardCategory, string> = {
	home: "Home",
	out: "Out",
	care: "Care",
	us: "Us",
};

/** Longest title the database accepts (migration 025's CHECK). */
const CARD_TITLE_MAX = 80;

/** A category read from the database. Anything unknown is shown as Home. */
function toCardCategory(value: string | null | undefined): CardCategory {
	return (CARD_CATEGORIES as readonly string[]).includes(value ?? "")
		? (value as CardCategory)
		: "home";
}

type StarterCard = {
	key: string;
	title: string;
	category: CardCategory;
	/** Comes round every day and can't be put off. */
	daily: boolean;
};

const STARTER_DECK: StarterCard[] = [
	// Home
	{ key: "trash", title: "Trash & recycling", category: "home", daily: true },
	{ key: "groceries", title: "Groceries", category: "home", daily: true },
	{ key: "weeknight-dinners", title: "Weeknight dinners", category: "home", daily: true },
	{ key: "weekday-breakfasts", title: "Weekday breakfasts", category: "home", daily: true },
	{ key: "tidying", title: "Tidying & organizing", category: "home", daily: true },
	{ key: "household-supplies", title: "Household supplies", category: "home", daily: true },
	{ key: "mail", title: "Mail & packages", category: "home", daily: true },
	{ key: "home-repairs", title: "Home repairs", category: "home", daily: true },
	{ key: "cleaning", title: "Cleaning", category: "home", daily: false },
	{ key: "yard-plants", title: "Yard & plants", category: "home", daily: false },
	// Out
	{ key: "car", title: "Car", category: "out", daily: false },
	{ key: "tech", title: "Tech & devices", category: "out", daily: false },
	{ key: "first-aid-safety", title: "First aid & safety", category: "out", daily: false },
	// Care
	{ key: "pets", title: "Pets", category: "care", daily: true },
	{ key: "parents-in-laws", title: "Parents & in-laws", category: "care", daily: false },
	{ key: "grooming-wardrobe", title: "Grooming & wardrobe", category: "care", daily: false },
	{ key: "self-care", title: "Self-care", category: "care", daily: false },
	// Us
	{ key: "date-nights", title: "Date nights & romance", category: "us", daily: false },
	{ key: "friendships", title: "Friendships", category: "us", daily: false },
	{ key: "faith", title: "Faith & spirituality", category: "us", daily: false },
];

export { CARD_CATEGORIES, CARD_TITLE_MAX, CATEGORY_LABEL, STARTER_DECK, toCardCategory };
export type { CardCategory, StarterCard };
