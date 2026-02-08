// Integration tests for voting flows
// Exercises full vote mode and poll mode (rounds 1-3) with mocked DB
// Validates round progression and creator blocking per ROUND_LOGIC.md

import {
	recordVote,
	getVoteCountsForDecision,
	checkRoundCompletion,
	progressToNextRound,
	completeDecision,
} from "@/lib/database";

import {
	resetMockData,
	setMockDecisions,
	setMockDecisionOptions,
	setMockCouples,
	setMockProfiles,
	getMockVotes,
	getMockDecisions,
	getMockDecisionOptions,
} from "@/test-utils/supabase-mock";

import {
	USER_1_ID,
	USER_2_ID,
	COUPLE_ID,
	DECISION_VOTE_ID,
	DECISION_POLL_ID,
	OPTION_1_ID,
	OPTION_2_ID,
	OPTION_3_ID,
	mockProfiles,
	mockCouple,
	mockVoteDecision,
	mockPollDecision,
	mockVoteOptions,
	mockPollOptions,
} from "@/test-utils/fixtures";

describe("Voting Flows (Integration)", () => {
	beforeEach(() => {
		resetMockData();
		setMockCouples([mockCouple]);
		setMockProfiles(mockProfiles);
	});

	describe("Vote Mode - full flow", () => {
		beforeEach(() => {
			setMockDecisions([{ ...mockVoteDecision }]);
			setMockDecisionOptions(mockVoteOptions.map((o) => ({ ...o })));
		});

		it("should complete when both partners vote (different options)", async () => {
			// User 1 votes for option 1
			const vote1 = await recordVote(DECISION_VOTE_ID, OPTION_1_ID, USER_1_ID, 1);
			expect(vote1.error).toBeNull();

			// Check round - not complete yet
			const check1 = await checkRoundCompletion(DECISION_VOTE_ID, 1, COUPLE_ID);
			expect(check1.data).toBe(false);

			// User 2 votes for option 2
			const vote2 = await recordVote(DECISION_VOTE_ID, OPTION_2_ID, USER_2_ID, 1);
			expect(vote2.error).toBeNull();

			// Check round - now complete
			const check2 = await checkRoundCompletion(DECISION_VOTE_ID, 1, COUPLE_ID);
			expect(check2.data).toBe(true);

			// Complete the decision
			const complete = await completeDecision(DECISION_VOTE_ID, OPTION_1_ID, USER_1_ID);
			expect(complete.error).toBeNull();

			// Verify final state
			const decision = getMockDecisions().find((d) => d.id === DECISION_VOTE_ID);
			expect(decision?.status).toBe("completed");
			expect(decision?.final_decision).toBe(OPTION_1_ID);
			expect(decision?.decided_by).toBe(USER_1_ID);
			expect(decision?.decided_at).toBeDefined();
		});

		it("should complete when both partners vote for the same option", async () => {
			// Both vote for option 1
			await recordVote(DECISION_VOTE_ID, OPTION_1_ID, USER_1_ID, 1);
			await recordVote(DECISION_VOTE_ID, OPTION_1_ID, USER_2_ID, 1);

			// Both voted
			const check = await checkRoundCompletion(DECISION_VOTE_ID, 1, COUPLE_ID);
			expect(check.data).toBe(true);

			// Get vote counts - only 1 unique option voted for
			const counts = await getVoteCountsForDecision(DECISION_VOTE_ID, 1);
			expect(counts.data).toEqual({ [OPTION_1_ID]: 2 });

			const votedOptions = Object.keys(counts.data!).filter((id) => counts.data![id] > 0);
			expect(votedOptions).toHaveLength(1);

			// Complete decision
			const complete = await completeDecision(DECISION_VOTE_ID, OPTION_1_ID, USER_1_ID);
			expect(complete.error).toBeNull();
			expect(getMockDecisions()[0].status).toBe("completed");
		});

		it("should allow vote updates before partner votes", async () => {
			// User 1 votes for option 1
			await recordVote(DECISION_VOTE_ID, OPTION_1_ID, USER_1_ID, 1);
			expect(getMockVotes()).toHaveLength(1);
			expect(getMockVotes()[0].option_id).toBe(OPTION_1_ID);

			// User 1 changes their mind
			await recordVote(DECISION_VOTE_ID, OPTION_2_ID, USER_1_ID, 1);
			expect(getMockVotes()).toHaveLength(1); // Still 1 vote (updated)
			expect(getMockVotes()[0].option_id).toBe(OPTION_2_ID);
		});
	});

	describe("Poll Mode - full 3-round flow", () => {
		beforeEach(() => {
			setMockDecisions([{ ...mockPollDecision, current_round: 1 }]);
			setMockDecisionOptions(mockPollOptions.map((o) => ({ ...o })));
		});

		it("should progress Round 1 -> Round 2 when partners vote for different options", async () => {
			// Round 1: Both partners vote for different options
			await recordVote(DECISION_POLL_ID, OPTION_1_ID, USER_1_ID, 1);
			await recordVote(DECISION_POLL_ID, OPTION_2_ID, USER_2_ID, 1);

			// Verify round is complete
			const roundComplete = await checkRoundCompletion(DECISION_POLL_ID, 1, COUPLE_ID);
			expect(roundComplete.data).toBe(true);

			// Get vote counts - different options
			const counts = await getVoteCountsForDecision(DECISION_POLL_ID, 1);
			const votedOptionIds = Object.keys(counts.data!).filter((id) => counts.data![id] > 0);
			expect(votedOptionIds).toHaveLength(2); // Different options

			// Progress to round 2
			const progress = await progressToNextRound(DECISION_POLL_ID, 1);
			expect(progress.error).toBeNull();
			expect(progress.data).toBe(true);

			// Verify decision advanced to round 2
			const updatedDecision = getMockDecisions().find((d) => d.id === DECISION_POLL_ID);
			expect(updatedDecision?.current_round).toBe(2);

			// Verify only 2 options remain (the ones that were voted for)
			const remainingOptions = getMockDecisionOptions().filter(
				(o) => o.decision_id === DECISION_POLL_ID,
			);
			expect(remainingOptions).toHaveLength(2);
		});

		it("should progress Round 2 -> Round 3 when partners vote for different options", async () => {
			// Set up Round 2 state: 2 options remaining
			const round2Options = mockPollOptions.slice(0, 2).map((o) => ({ ...o }));
			setMockDecisionOptions(round2Options);
			setMockDecisions([{ ...mockPollDecision, current_round: 2 }]);

			// Round 2: Both partners vote for different options
			await recordVote(DECISION_POLL_ID, OPTION_1_ID, USER_1_ID, 2);
			await recordVote(DECISION_POLL_ID, OPTION_2_ID, USER_2_ID, 2);

			// Verify round complete
			const check = await checkRoundCompletion(DECISION_POLL_ID, 2, COUPLE_ID);
			expect(check.data).toBe(true);

			// Progress to round 3
			const progress = await progressToNextRound(DECISION_POLL_ID, 2);
			expect(progress.error).toBeNull();

			// Verify round 3
			const decision = getMockDecisions().find((d) => d.id === DECISION_POLL_ID);
			expect(decision?.current_round).toBe(3);
		});

		it("should complete in Round 3 with only partner vote (creator blocked)", async () => {
			// Set up Round 3 state
			const round3Options = mockPollOptions.slice(0, 2).map((o) => ({ ...o }));
			setMockDecisionOptions(round3Options);
			setMockDecisions([{ ...mockPollDecision, current_round: 3 }]);

			// Only partner (User 2) votes in round 3 - creator (User 1) is blocked
			const vote = await recordVote(DECISION_POLL_ID, OPTION_1_ID, USER_2_ID, 3);
			expect(vote.error).toBeNull();

			// Round 3 completes with just 1 vote
			const check = await checkRoundCompletion(DECISION_POLL_ID, 3, COUPLE_ID);
			expect(check.data).toBe(true);

			// Complete the decision - decided by partner
			const complete = await completeDecision(DECISION_POLL_ID, OPTION_1_ID, USER_2_ID);
			expect(complete.error).toBeNull();

			// Verify final state
			const decision = getMockDecisions().find((d) => d.id === DECISION_POLL_ID);
			expect(decision?.status).toBe("completed");
			expect(decision?.decided_by).toBe(USER_2_ID); // Partner decided
			expect(decision?.final_decision).toBe(OPTION_1_ID);
		});

		it("should complete early when both partners vote for same option in Round 1", async () => {
			// Both vote for same option in round 1
			await recordVote(DECISION_POLL_ID, OPTION_1_ID, USER_1_ID, 1);
			await recordVote(DECISION_POLL_ID, OPTION_1_ID, USER_2_ID, 1);

			// Round complete
			const check = await checkRoundCompletion(DECISION_POLL_ID, 1, COUPLE_ID);
			expect(check.data).toBe(true);

			// Vote counts show 1 unique option with 2 votes
			const counts = await getVoteCountsForDecision(DECISION_POLL_ID, 1);
			const votedOptions = Object.keys(counts.data!).filter((id) => counts.data![id] > 0);
			expect(votedOptions).toHaveLength(1); // Same option - early completion

			// Complete immediately (no round progression needed)
			const complete = await completeDecision(DECISION_POLL_ID, OPTION_1_ID, USER_1_ID);
			expect(complete.error).toBeNull();
			expect(getMockDecisions()[0].status).toBe("completed");
		});

		it("should complete early when both partners vote for same option in Round 2", async () => {
			// Set up Round 2
			const round2Options = mockPollOptions.slice(0, 2).map((o) => ({ ...o }));
			setMockDecisionOptions(round2Options);
			setMockDecisions([{ ...mockPollDecision, current_round: 2 }]);

			// Both vote for same option
			await recordVote(DECISION_POLL_ID, OPTION_1_ID, USER_1_ID, 2);
			await recordVote(DECISION_POLL_ID, OPTION_1_ID, USER_2_ID, 2);

			const counts = await getVoteCountsForDecision(DECISION_POLL_ID, 2);
			const votedOptions = Object.keys(counts.data!).filter((id) => counts.data![id] > 0);
			expect(votedOptions).toHaveLength(1);

			// Complete immediately
			const complete = await completeDecision(DECISION_POLL_ID, OPTION_1_ID, USER_2_ID);
			expect(complete.error).toBeNull();
			expect(getMockDecisions()[0].status).toBe("completed");
		});
	});

	describe("Round 3 Creator Blocking", () => {
		beforeEach(() => {
			// Set up Round 3 state with 2 final options
			const round3Options = mockPollOptions.slice(0, 2).map((o) => ({ ...o }));
			setMockDecisionOptions(round3Options);
			setMockDecisions([{ ...mockPollDecision, current_round: 3 }]);
		});

		it("Round 3 should complete with only 1 vote (partner's vote)", async () => {
			// Partner votes
			await recordVote(DECISION_POLL_ID, OPTION_1_ID, USER_2_ID, 3);

			// 1 vote = complete for round 3
			const check = await checkRoundCompletion(DECISION_POLL_ID, 3, COUPLE_ID);
			expect(check.data).toBe(true);
		});

		it("Round 3 should NOT be complete with 0 votes", async () => {
			const check = await checkRoundCompletion(DECISION_POLL_ID, 3, COUPLE_ID);
			expect(check.data).toBe(false);
		});

		it("decision should record partner as decided_by in Round 3", async () => {
			// Partner votes and completes
			await recordVote(DECISION_POLL_ID, OPTION_2_ID, USER_2_ID, 3);
			await completeDecision(DECISION_POLL_ID, OPTION_2_ID, USER_2_ID);

			const decision = getMockDecisions().find((d) => d.id === DECISION_POLL_ID);
			expect(decision?.decided_by).toBe(USER_2_ID); // Partner, not creator
			expect(decision?.final_decision).toBe(OPTION_2_ID);
		});
	});

	describe("Round progression preserves only voted options", () => {
		it("should keep exactly 2 options after round 1 progression (the ones voted for)", async () => {
			// 4 options, each partner votes for a different one
			setMockDecisions([{ ...mockPollDecision, current_round: 1 }]);
			setMockDecisionOptions(mockPollOptions.map((o) => ({ ...o })));

			await recordVote(DECISION_POLL_ID, OPTION_1_ID, USER_1_ID, 1);
			await recordVote(DECISION_POLL_ID, OPTION_3_ID, USER_2_ID, 1);

			const progress = await progressToNextRound(DECISION_POLL_ID, 1);
			expect(progress.error).toBeNull();

			const remaining = getMockDecisionOptions().filter((o) => o.decision_id === DECISION_POLL_ID);
			expect(remaining).toHaveLength(2);

			// Verify the titles match the voted options
			const titles = remaining.map((o) => o.title).sort();
			expect(titles).toEqual(["Action Movie", "Drama"].sort());
		});

		it("should reject progression if not exactly 2 votes", async () => {
			// Only 1 vote
			setMockDecisions([{ ...mockPollDecision, current_round: 1 }]);
			setMockDecisionOptions(mockPollOptions.map((o) => ({ ...o })));

			await recordVote(DECISION_POLL_ID, OPTION_1_ID, USER_1_ID, 1);

			const progress = await progressToNextRound(DECISION_POLL_ID, 1);
			expect(progress.error).toBe("Expected exactly 2 votes for round progression");
		});

		it("should reject progression if both voted for same option (should complete instead)", async () => {
			setMockDecisions([{ ...mockPollDecision, current_round: 1 }]);
			setMockDecisionOptions(mockPollOptions.map((o) => ({ ...o })));

			await recordVote(DECISION_POLL_ID, OPTION_1_ID, USER_1_ID, 1);
			await recordVote(DECISION_POLL_ID, OPTION_1_ID, USER_2_ID, 1);

			// progressToNextRound expects 2 unique voted options
			const progress = await progressToNextRound(DECISION_POLL_ID, 1);
			expect(progress.error).toContain("Expected exactly 2 unique voted options");
		});
	});
});
