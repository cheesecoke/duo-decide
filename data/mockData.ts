// Centralized mock data for the Duo app
// This file contains all mock data used across the application

export interface DecisionOption {
	id: string;
	title: string;
	selected: boolean;
}

export interface Decision {
	id: string;
	title: string;
	createdBy: string;
	deadline: string;
	details: string;
	options: DecisionOption[];
	expanded: boolean;
	optionListId?: string;
	status?: "pending" | "voted" | "completed";
	decidedBy?: string;
	decidedAt?: string;
	createdAt: string;
}

export interface OptionList {
	id: string;
	title: string;
	description: string;
	options: DecisionOption[];
	expanded: boolean;
	createdAt: string;
}

export interface HistoryDecision {
	id: string;
	title: string;
	chosenOption: string;
	decidedBy: string;
	decisionDate: string;
	totalOptions: number;
	createdAt: string;
}

export interface DecisionStats {
	totalDecisions: number;
	youDecided: number;
	partnerDecided: number;
	recentStreak: string;
}

// User names for consistency
export const USERS = {
	YOU: "You",
	PARTNER: "Alex", // Changed from "Steph" to "Alex" for variety
} as const;

// Helper function to get future dates
const getFutureDate = (daysFromNow: number): string => {
	const date = new Date();
	date.setDate(date.getDate() + daysFromNow);
	return date.toISOString().split("T")[0];
};

// Helper function to get reasonable future dates (next week to next month)
const getReasonableFutureDate = (daysFromNow: number): string => {
	const date = new Date();
	date.setDate(date.getDate() + Math.max(daysFromNow, 7)); // At least next week
	return date.toISOString().split("T")[0];
};

// Helper function to get past dates
const getPastDate = (daysAgo: number): string => {
	const date = new Date();
	date.setDate(date.getDate() - daysAgo);
	return date.toISOString().split("T")[0];
};

// Realistic option lists for couples
export const MOCK_OPTION_LISTS: OptionList[] = [
	{
		id: "dinner-ideas",
		title: "Dinner Ideas",
		description: "Our favorite dinner spots and home cooking options",
		expanded: false,
		createdAt: getPastDate(30),
		options: [
			{ id: "dinner-1", title: "Candlelit Dinner at Home", selected: false },
			{ id: "dinner-2", title: "Try That New Italian Place", selected: false },
			{ id: "dinner-3", title: "Order Thai Takeout", selected: false },
			{ id: "dinner-4", title: "Grill Something on the Patio", selected: false },
			{ id: "dinner-5", title: "Sushi Night", selected: false },
		],
	},
	{
		id: "weekend-activities",
		title: "Weekend Activities",
		description: "Fun things to do together on weekends",
		expanded: false,
		createdAt: getPastDate(25),
		options: [
			{ id: "weekend-1", title: "Hike at Griffith Park", selected: false },
			{ id: "weekend-2", title: "Beach Day in Santa Monica", selected: false },
			{ id: "weekend-3", title: "Visit the Getty Museum", selected: false },
			{ id: "weekend-4", title: "Farmer's Market & Cooking", selected: false },
			{ id: "weekend-5", title: "Movie Marathon at Home", selected: false },
		],
	},
	{
		id: "date-nights",
		title: "Date Night Ideas",
		description: "Special evening activities for just the two of us",
		expanded: false,
		createdAt: getPastDate(20),
		options: [
			{ id: "date-1", title: "Wine Tasting Downtown", selected: false },
			{ id: "date-2", title: "Stargazing at the Observatory", selected: false },
			{ id: "date-3", title: "Dance Class Together", selected: false },
			{ id: "date-4", title: "Comedy Show at the Laugh Factory", selected: false },
			{ id: "date-5", title: "Sunset Picnic at the Beach", selected: false },
		],
	},
	{
		id: "home-improvements",
		title: "Home Projects",
		description: "Things we want to do around the house",
		expanded: false,
		createdAt: getPastDate(15),
		options: [
			{ id: "home-1", title: "Reorganize the Living Room", selected: false },
			{ id: "home-2", title: "Plant a Herb Garden", selected: false },
			{ id: "home-3", title: "Deep Clean the Kitchen", selected: false },
			{ id: "home-4", title: "Hang New Artwork", selected: false },
		],
	},
	{
		id: "travel-ideas",
		title: "Travel Destinations",
		description: "Places we'd love to visit together",
		expanded: false,
		createdAt: getPastDate(10),
		options: [
			{ id: "travel-1", title: "Weekend in San Diego", selected: false },
			{ id: "travel-2", title: "Napa Valley Wine Country", selected: false },
			{ id: "travel-3", title: "Big Sur Road Trip", selected: false },
			{ id: "travel-4", title: "Palm Springs Getaway", selected: false },
		],
	},
];

// Current active decisions
export const MOCK_DECISIONS: Decision[] = [
	{
		id: "decision-1",
		title: "What should we do for dinner tonight?",
		createdBy: USERS.PARTNER,
		deadline: getReasonableFutureDate(1),
		details:
			"I'm craving something different tonight. Let's pick something we haven't had in a while and make it special!",
		expanded: true,
		status: "pending",
		createdAt: getPastDate(2),
		options: [
			{ id: "dinner-1", title: "Candlelit Dinner at Home", selected: false },
			{ id: "dinner-2", title: "Try That New Italian Place", selected: false },
			{ id: "dinner-3", title: "Order Thai Takeout", selected: false },
		],
		optionListId: "dinner-ideas",
	},
	{
		id: "decision-2",
		title: "Weekend Adventure Plans",
		createdBy: USERS.YOU,
		deadline: getReasonableFutureDate(10),
		details:
			"We have a free weekend coming up and I want to make the most of it. What sounds fun to you?",
		expanded: false,
		status: "pending",
		createdAt: getPastDate(1),
		options: [
			{ id: "weekend-1", title: "Hike at Griffith Park", selected: false },
			{ id: "weekend-2", title: "Beach Day in Santa Monica", selected: false },
			{ id: "weekend-3", title: "Visit the Getty Museum", selected: false },
		],
		optionListId: "weekend-activities",
	},
	{
		id: "decision-3",
		title: "Date Night This Friday",
		createdBy: USERS.PARTNER,
		deadline: getReasonableFutureDate(5),
		details:
			"I want to plan something special for us this Friday. Let's do something we haven't done in a while!",
		expanded: false,
		status: "voted",
		createdAt: getPastDate(3),
		options: [
			{ id: "date-1", title: "Wine Tasting Downtown", selected: true },
			{ id: "date-2", title: "Stargazing at the Observatory", selected: false },
			{ id: "date-3", title: "Dance Class Together", selected: false },
		],
		optionListId: "date-nights",
	},
	{
		id: "decision-4",
		title: "Home Project This Month",
		createdBy: USERS.YOU,
		deadline: getReasonableFutureDate(14),
		details: "We've been talking about improving our space. Which project should we tackle first?",
		expanded: false,
		status: "pending",
		createdAt: getPastDate(4),
		options: [
			{ id: "home-1", title: "Reorganize the Living Room", selected: false },
			{ id: "home-2", title: "Plant a Herb Garden", selected: false },
			{ id: "home-3", title: "Deep Clean the Kitchen", selected: false },
		],
		optionListId: "home-improvements",
	},
];

// Historical decisions for the history tab
export const MOCK_HISTORY: HistoryDecision[] = [
	{
		id: "history-1",
		title: "What to cook for dinner",
		chosenOption: "Homemade Pasta",
		decidedBy: USERS.YOU,
		decisionDate: getPastDate(1),
		totalOptions: 4,
		createdAt: getPastDate(2),
	},
	{
		id: "history-2",
		title: "Movie night choice",
		chosenOption: "Romantic Comedy",
		decidedBy: USERS.PARTNER,
		decisionDate: getPastDate(3),
		totalOptions: 3,
		createdAt: getPastDate(4),
	},
	{
		id: "history-3",
		title: "Weekend activity",
		chosenOption: "Beach Day",
		decidedBy: USERS.YOU,
		decisionDate: getPastDate(5),
		totalOptions: 5,
		createdAt: getPastDate(6),
	},
	{
		id: "history-4",
		title: "Restaurant for anniversary",
		chosenOption: "That Fancy French Place",
		decidedBy: USERS.PARTNER,
		decisionDate: getPastDate(7),
		totalOptions: 3,
		createdAt: getPastDate(8),
	},
	{
		id: "history-5",
		title: "Home decoration",
		chosenOption: "New Plants for Living Room",
		decidedBy: USERS.YOU,
		decisionDate: getPastDate(10),
		totalOptions: 4,
		createdAt: getPastDate(11),
	},
	{
		id: "history-6",
		title: "Weekend getaway",
		chosenOption: "Napa Valley Trip",
		decidedBy: USERS.PARTNER,
		decisionDate: getPastDate(14),
		totalOptions: 3,
		createdAt: getPastDate(15),
	},
	{
		id: "history-7",
		title: "Date night activity",
		chosenOption: "Cooking Class Together",
		decidedBy: USERS.YOU,
		decisionDate: getPastDate(18),
		totalOptions: 4,
		createdAt: getPastDate(19),
	},
	{
		id: "history-8",
		title: "Home improvement",
		chosenOption: "Paint the Bedroom",
		decidedBy: USERS.PARTNER,
		decisionDate: getPastDate(21),
		totalOptions: 3,
		createdAt: getPastDate(22),
	},
];

// Calculate stats from history data
export const MOCK_STATS: DecisionStats = {
	totalDecisions: MOCK_HISTORY.length,
	youDecided: MOCK_HISTORY.filter((d) => d.decidedBy === USERS.YOU).length,
	partnerDecided: MOCK_HISTORY.filter((d) => d.decidedBy === USERS.PARTNER).length,
	recentStreak: MOCK_HISTORY[0]?.decidedBy || USERS.YOU,
};

// Helper functions for data manipulation
export const getOptionListById = (id: string): OptionList | undefined => {
	return MOCK_OPTION_LISTS.find((list) => list.id === id);
};

export const getDecisionById = (id: string): Decision | undefined => {
	return MOCK_DECISIONS.find((decision) => decision.id === id);
};

export const getHistoryById = (id: string): HistoryDecision | undefined => {
	return MOCK_HISTORY.find((history) => history.id === id);
};

// Simulate API delays
export const simulateApiDelay = (ms: number = 500): Promise<void> => {
	return new Promise((resolve) => setTimeout(resolve, ms));
};
