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
	/** What holding the card means, in a sentence or two. */
	about: string;
};

const STARTER_DECK: StarterCard[] = [
	// Home
	{
		key: "trash",
		title: "Trash & recycling",
		category: "home",
		daily: true,
		about:
			"Bins out on the right day and back in again. Recycling and compost sorted, and bags restocked.",
	},
	{
		key: "groceries",
		title: "Groceries",
		category: "home",
		daily: true,
		about: "Knowing what's in the fridge, keeping the list, and getting the food into the house.",
	},
	{
		key: "weeknight-dinners",
		title: "Weeknight dinners",
		category: "home",
		daily: true,
		about: "Deciding what's for dinner Monday to Friday, and getting it on the table.",
	},
	{
		key: "weekday-breakfasts",
		title: "Weekday breakfasts",
		category: "home",
		daily: true,
		about: "Something to eat before the day starts, and the basics for it kept in stock.",
	},
	{
		key: "tidying",
		title: "Tidying & organizing",
		category: "home",
		daily: true,
		about: "Putting things back where they live so the house stays usable day to day.",
	},
	{
		key: "household-supplies",
		title: "Household supplies",
		category: "home",
		daily: true,
		about:
			"Toilet paper, soap, light bulbs, batteries. Noticing what's low and replacing it before it runs out.",
	},
	{
		key: "mail",
		title: "Mail & packages",
		category: "home",
		daily: true,
		about:
			"Bringing in the mail, opening it, dealing with what needs an answer, and handling deliveries.",
	},
	{
		key: "home-repairs",
		title: "Home repairs",
		category: "home",
		daily: true,
		about: "Noticing what's broken, then fixing it or booking the person who can.",
	},
	{
		key: "cleaning",
		title: "Cleaning",
		category: "home",
		daily: false,
		about: "Bathrooms, floors, kitchen and dusting, whether you do it or arrange the help.",
	},
	{
		key: "yard-plants",
		title: "Yard & plants",
		category: "home",
		daily: false,
		about: "Watering, mowing and weeding, and keeping the houseplants alive.",
	},
	{
		key: "laundry",
		title: "Laundry",
		category: "home",
		daily: true,
		about: "Washing, drying, folding and putting away, sheets and towels included.",
	},
	{
		key: "hosting",
		title: "Hosting guests",
		category: "home",
		daily: false,
		about:
			"Getting the house and the food ready when people come over, and looking after them while they're here.",
	},
	{
		key: "furnishings",
		title: "Furniture & decor",
		category: "home",
		daily: false,
		about:
			"Choosing, buying and setting up furniture and the things that make the place feel like home.",
	},
	{
		key: "photos",
		title: "Photos & keepsakes",
		category: "home",
		daily: false,
		about: "Backing up photos, printing the good ones, and keeping the things worth keeping.",
	},
	{
		key: "housing",
		title: "Rent, mortgage & home insurance",
		category: "home",
		daily: false,
		about:
			"Paying the rent or mortgage on time, and keeping the lease and home insurance up to date.",
	},
	// Out
	{
		key: "car",
		title: "Car",
		category: "out",
		daily: false,
		about: "Fuel, servicing, registration, insurance and keeping it clean.",
	},
	{
		key: "tech",
		title: "Tech & devices",
		category: "out",
		daily: false,
		about:
			"Phones, laptops, wifi, passwords and subscriptions. Keeping it all working and backed up.",
	},
	{
		key: "first-aid-safety",
		title: "First aid & safety",
		category: "out",
		daily: false,
		about: "A stocked first-aid kit, working smoke alarms, and a plan for when something goes wrong.",
	},
	{
		key: "calendar",
		title: "Shared calendar",
		category: "out",
		daily: true,
		about: "Keeping the shared calendar true: what's on, who's where, and what clashes.",
	},
	{
		key: "weekend-plans",
		title: "Weekend plans",
		category: "out",
		daily: false,
		about: "Having something to look forward to on the weekend, and making the bookings for it.",
	},
	{
		key: "travel",
		title: "Trips & travel",
		category: "out",
		daily: false,
		about: "Researching, booking and packing for trips, and holding the tickets and documents.",
	},
	{
		key: "social-plans",
		title: "Plans with friends",
		category: "out",
		daily: false,
		about:
			"Making plans with other couples and friends, replying to invitations, and following through.",
	},
	{
		key: "returns",
		title: "Returns & refunds",
		category: "out",
		daily: false,
		about: "Sending back what didn't work, and chasing the refund or store credit until it lands.",
	},
	{
		key: "rewards",
		title: "Points & coupons",
		category: "out",
		daily: false,
		about: "Keeping track of points, miles, vouchers and coupons, and using them before they expire.",
	},
	{
		key: "giving",
		title: "Giving & volunteering",
		category: "out",
		daily: false,
		about: "Choosing where you give money or time, and making sure it actually happens.",
	},
	// Care
	{
		key: "pets",
		title: "Pets",
		category: "care",
		daily: true,
		about: "Food, walks, litter, vet visits and grooming.",
	},
	{
		key: "parents-in-laws",
		title: "Parents & in-laws",
		category: "care",
		daily: false,
		about: "Staying in touch with both sets of parents, and helping with what they need.",
	},
	{
		key: "grooming-wardrobe",
		title: "Grooming & wardrobe",
		category: "care",
		daily: false,
		about: "Haircuts, toiletries and clothes that fit the season, and replacing what's worn out.",
	},
	{
		key: "self-care",
		title: "Self-care",
		category: "care",
		daily: false,
		about: "Protecting time for rest, exercise and the things that keep each of you well.",
	},
	{
		key: "health-insurance",
		title: "Health insurance",
		category: "care",
		daily: false,
		about: "Choosing the plan, keeping the cards and paperwork, and sorting out claims and bills.",
	},
	{
		key: "wills",
		title: "Wills & life insurance",
		category: "care",
		daily: false,
		about: "Wills, beneficiaries and life insurance set up and kept current.",
	},
	{
		key: "contraception",
		title: "Contraception",
		category: "care",
		daily: false,
		about: "Whatever method you use: prescriptions, supplies and appointments.",
	},
	// Us
	{
		key: "date-nights",
		title: "Date nights & romance",
		category: "us",
		daily: false,
		about: "Planning time for just the two of you, and making it happen.",
	},
	{
		key: "friendships",
		title: "Friendships",
		category: "us",
		daily: false,
		about: "Keeping up with your friends: making the call, setting the date, showing up.",
	},
	{
		key: "faith",
		title: "Faith & spirituality",
		category: "us",
		daily: false,
		about: "Services, practices and the traditions that matter to you.",
	},
	{
		key: "holidays",
		title: "Holidays & celebrations",
		category: "us",
		daily: false,
		about:
			"Planning holidays and big days: where you'll be, who's coming, the food and the decorations.",
	},
	{
		key: "family-gifts",
		title: "Gifts for family",
		category: "us",
		daily: false,
		about: "Remembering birthdays and occasions, and choosing, buying and wrapping the present.",
	},
	{
		key: "greeting-cards",
		title: "Cards & thank-yous",
		category: "us",
		daily: false,
		about: "Birthday cards, holiday cards and thank-you notes, written and sent on time.",
	},
];

const ABOUT_BY_KEY = new Map(STARTER_DECK.map((card) => [card.key, card.about]));

/**
 * What a card asks of whoever holds it. Starter cards carry their own words;
 * a card the couple wrote has none (there is nowhere to store them yet).
 */
function aboutCard(deckKey: string | null | undefined): string | null {
	return (deckKey ? ABOUT_BY_KEY.get(deckKey) : undefined) ?? null;
}

export { aboutCard, CARD_CATEGORIES, CARD_TITLE_MAX, CATEGORY_LABEL, STARTER_DECK, toCardCategory };
export type { CardCategory, StarterCard };
