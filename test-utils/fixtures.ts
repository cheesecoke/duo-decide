// Test fixtures for Duo app
// Provides consistent test data across all test files

import type {
	Vote,
	Decision,
	DecisionOption,
	Couple,
	Profile,
	UserContext,
	DecisionWithOptions,
} from "@/types/database";

// User IDs
export const USER_1_ID = "user-1-uuid";
export const USER_2_ID = "user-2-uuid";
export const COUPLE_ID = "couple-uuid";

// Profiles
export const mockProfiles: Profile[] = [
	{
		id: USER_1_ID,
		email: "alice@example.com",
		display_name: "Alice",
		avatar_url: null,
		couple_id: COUPLE_ID,
		created_at: "2024-01-01T00:00:00Z",
		updated_at: "2024-01-01T00:00:00Z",
	},
	{
		id: USER_2_ID,
		email: "bob@example.com",
		display_name: "Bob",
		avatar_url: null,
		couple_id: COUPLE_ID,
		created_at: "2024-01-01T00:00:00Z",
		updated_at: "2024-01-01T00:00:00Z",
	},
];

// Couple
export const mockCouple: Couple = {
	id: COUPLE_ID,
	user1_id: USER_1_ID,
	user2_id: USER_2_ID,
	created_at: "2024-01-01T00:00:00Z",
	updated_at: "2024-01-01T00:00:00Z",
};

// User contexts
export const user1Context: UserContext = {
	userId: USER_1_ID,
	userName: "Alice",
	coupleId: COUPLE_ID,
	partnerId: USER_2_ID,
	partnerName: "Bob",
};

export const user2Context: UserContext = {
	userId: USER_2_ID,
	userName: "Bob",
	coupleId: COUPLE_ID,
	partnerId: USER_1_ID,
	partnerName: "Alice",
};

// Decision IDs
export const DECISION_VOTE_ID = "decision-vote-uuid";
export const DECISION_POLL_ID = "decision-poll-uuid";

// Option IDs
export const OPTION_1_ID = "option-1-uuid";
export const OPTION_2_ID = "option-2-uuid";
export const OPTION_3_ID = "option-3-uuid";
export const OPTION_4_ID = "option-4-uuid";

// Vote mode decision
export const mockVoteDecision: Decision = {
	id: DECISION_VOTE_ID,
	title: "Where to eat dinner?",
	description: "Let's decide where to go for dinner tonight",
	deadline: "2024-01-15T18:00:00Z",
	creator_id: USER_1_ID,
	partner_id: USER_2_ID,
	couple_id: COUPLE_ID,
	type: "vote",
	status: "pending",
	current_round: 1,
	decided_by: null,
	decided_at: null,
	final_decision: null,
	created_at: "2024-01-01T00:00:00Z",
	updated_at: "2024-01-01T00:00:00Z",
};

// Poll mode decision
export const mockPollDecision: Decision = {
	id: DECISION_POLL_ID,
	title: "Movie night pick",
	description: "What movie should we watch?",
	deadline: "2024-01-15T20:00:00Z",
	creator_id: USER_1_ID,
	partner_id: USER_2_ID,
	couple_id: COUPLE_ID,
	type: "poll",
	status: "pending",
	current_round: 1,
	decided_by: null,
	decided_at: null,
	final_decision: null,
	created_at: "2024-01-01T00:00:00Z",
	updated_at: "2024-01-01T00:00:00Z",
};

// Decision options
export const mockVoteOptions: DecisionOption[] = [
	{
		id: OPTION_1_ID,
		decision_id: DECISION_VOTE_ID,
		title: "Italian Restaurant",
		votes: 0,
		eliminated_in_round: null,
		created_at: "2024-01-01T00:00:00Z",
	},
	{
		id: OPTION_2_ID,
		decision_id: DECISION_VOTE_ID,
		title: "Sushi Place",
		votes: 0,
		eliminated_in_round: null,
		created_at: "2024-01-01T00:00:00Z",
	},
];

export const mockPollOptions: DecisionOption[] = [
	{
		id: OPTION_1_ID,
		decision_id: DECISION_POLL_ID,
		title: "Action Movie",
		votes: 0,
		eliminated_in_round: null,
		created_at: "2024-01-01T00:00:00Z",
	},
	{
		id: OPTION_2_ID,
		decision_id: DECISION_POLL_ID,
		title: "Comedy",
		votes: 0,
		eliminated_in_round: null,
		created_at: "2024-01-01T00:00:00Z",
	},
	{
		id: OPTION_3_ID,
		decision_id: DECISION_POLL_ID,
		title: "Drama",
		votes: 0,
		eliminated_in_round: null,
		created_at: "2024-01-01T00:00:00Z",
	},
	{
		id: OPTION_4_ID,
		decision_id: DECISION_POLL_ID,
		title: "Thriller",
		votes: 0,
		eliminated_in_round: null,
		created_at: "2024-01-01T00:00:00Z",
	},
];

// Combined decision with options
export const mockVoteDecisionWithOptions: DecisionWithOptions = {
	...mockVoteDecision,
	options: mockVoteOptions,
};

export const mockPollDecisionWithOptions: DecisionWithOptions = {
	...mockPollDecision,
	options: mockPollOptions,
};

// Vote fixtures
export const createVote = (
	userId: string,
	optionId: string,
	decisionId: string,
	round: number = 1,
): Vote => ({
	id: `vote-${userId}-${optionId}-${round}`,
	decision_id: decisionId,
	user_id: userId,
	option_id: optionId,
	round,
	created_at: new Date().toISOString(),
});

// Helper to create completed decision
export const createCompletedDecision = (
	decision: Decision,
	finalOptionId: string,
	decidedBy: string,
): Decision => ({
	...decision,
	status: "completed",
	final_decision: finalOptionId,
	decided_by: decidedBy,
	decided_at: new Date().toISOString(),
});

// Helper to create round-progressed poll decision
export const createProgressedPollDecision = (
	decision: Decision,
	currentRound: number,
): Decision => ({
	...decision,
	current_round: currentRound,
	status: "pending",
});

// Poll round 3 scenario (only 2 options)
export const mockRound3Options: DecisionOption[] = [
	{
		id: OPTION_1_ID,
		decision_id: DECISION_POLL_ID,
		title: "Action Movie",
		votes: 0,
		eliminated_in_round: null,
		created_at: "2024-01-01T00:00:00Z",
	},
	{
		id: OPTION_2_ID,
		decision_id: DECISION_POLL_ID,
		title: "Comedy",
		votes: 0,
		eliminated_in_round: null,
		created_at: "2024-01-01T00:00:00Z",
	},
];

export const mockRound3PollDecision: Decision = {
	...mockPollDecision,
	current_round: 3,
	status: "pending",
};

// Pending partner couple (for testing partner invitation flow)
export const mockPendingCouple: Couple = {
	id: "pending-couple-uuid",
	user1_id: USER_1_ID,
	user2_id: USER_2_ID, // This would be null in actual pending state, but type requires string
	created_at: "2024-01-01T00:00:00Z",
	updated_at: "2024-01-01T00:00:00Z",
};
