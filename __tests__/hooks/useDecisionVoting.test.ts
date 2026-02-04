// Tests for hooks/decision-queue/useDecisionVoting.ts
// Covers handleVote(), handlePollVote(), and selectOption()

import { renderHook, act } from "@testing-library/react-native";
import { useDecisionVoting } from "@/hooks/decision-queue/useDecisionVoting";
import type { UIDecision } from "@/hooks/decision-queue/useDecisionsData";

import {
	resetMockData,
	setMockVotes,
	setMockDecisions,
	setMockDecisionOptions,
	setMockCouples,
	setMockProfiles,
	getMockVotes,
	getMockDecisions,
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
	OPTION_4_ID,
	mockProfiles,
	mockCouple,
	mockVoteDecision,
	mockPollDecision,
	mockVoteOptions,
	mockPollOptions,
	user1Context,
	user2Context,
	createVote,
} from "@/test-utils/fixtures";

// Helper to create UI decisions from database decisions
const createUIDecision = (
	decision: typeof mockVoteDecision,
	options: typeof mockVoteOptions,
): UIDecision => ({
	...decision,
	expanded: false,
	createdBy: decision.creator_id === user1Context.userId ? user1Context.userName : "Partner",
	details: decision.description || "",
	options: options.map((o) => ({
		id: o.id,
		title: o.title,
		selected: false,
	})),
});

describe("useDecisionVoting", () => {
	let mockDecisions: UIDecision[];
	let mockSetDecisions: jest.Mock;
	let mockSetPollVotes: jest.Mock;
	let mockSetError: jest.Mock;

	beforeEach(() => {
		resetMockData();
		setMockCouples([mockCouple]);
		setMockProfiles(mockProfiles);

		// Create fresh UI decisions for each test
		mockDecisions = [createUIDecision(mockVoteDecision, mockVoteOptions)];
		mockSetDecisions = jest.fn((updater) => {
			if (typeof updater === "function") {
				mockDecisions = updater(mockDecisions);
			} else {
				mockDecisions = updater;
			}
		});
		mockSetPollVotes = jest.fn();
		mockSetError = jest.fn();
	});

	describe("handleVote", () => {
		it("should record vote and update status to voted when first partner votes", async () => {
			// Arrange
			setMockDecisions([{ ...mockVoteDecision }]);
			setMockDecisionOptions(mockVoteOptions.map((o) => ({ ...o })));

			const { result } = renderHook(() =>
				useDecisionVoting(user1Context, mockDecisions, mockSetDecisions, mockSetPollVotes, mockSetError),
			);

			// Act
			await act(async () => {
				await result.current.handleVote(DECISION_VOTE_ID, OPTION_1_ID);
			});

			// Assert
			expect(mockSetError).toHaveBeenCalledWith(null); // Error cleared at start
			expect(getMockVotes()).toHaveLength(1);
			expect(getMockVotes()[0].option_id).toBe(OPTION_1_ID);

			// Should have updated decision status to voted
			const updatedDecision = mockDecisions.find((d) => d.id === DECISION_VOTE_ID);
			expect(updatedDecision?.status).toBe("voted");
		});

		it("should complete decision when both partners have voted", async () => {
			// Arrange - Partner 2 already voted
			const existingVote = createVote(USER_2_ID, OPTION_2_ID, DECISION_VOTE_ID, 1);
			setMockVotes([existingVote]);
			setMockDecisions([{ ...mockVoteDecision }]);
			setMockDecisionOptions(mockVoteOptions.map((o) => ({ ...o })));

			const { result } = renderHook(() =>
				useDecisionVoting(user1Context, mockDecisions, mockSetDecisions, mockSetPollVotes, mockSetError),
			);

			// Act - User 1 votes
			await act(async () => {
				await result.current.handleVote(DECISION_VOTE_ID, OPTION_1_ID);
			});

			// Assert
			expect(getMockVotes()).toHaveLength(2);

			// Should have marked decision as completed
			const updatedDecision = mockDecisions.find((d) => d.id === DECISION_VOTE_ID);
			expect(updatedDecision?.status).toBe("completed");
		});

		it("should mark selected option in UI state", async () => {
			// Arrange
			setMockDecisions([{ ...mockVoteDecision }]);
			setMockDecisionOptions(mockVoteOptions.map((o) => ({ ...o })));

			const { result } = renderHook(() =>
				useDecisionVoting(user1Context, mockDecisions, mockSetDecisions, mockSetPollVotes, mockSetError),
			);

			// Act
			await act(async () => {
				await result.current.handleVote(DECISION_VOTE_ID, OPTION_1_ID);
			});

			// Assert - Check the setDecisions was called with option marked as selected
			expect(mockSetDecisions).toHaveBeenCalled();
			const updatedDecision = mockDecisions.find((d) => d.id === DECISION_VOTE_ID);
			const selectedOption = updatedDecision?.options.find((o) => o.id === OPTION_1_ID);
			expect(selectedOption?.selected).toBe(true);
		});

		it("should not record vote if user context is null", async () => {
			// Arrange
			setMockDecisions([{ ...mockVoteDecision }]);

			const { result } = renderHook(() =>
				useDecisionVoting(null, mockDecisions, mockSetDecisions, mockSetPollVotes, mockSetError),
			);

			// Act
			await act(async () => {
				await result.current.handleVote(DECISION_VOTE_ID, OPTION_1_ID);
			});

			// Assert - No votes should be recorded
			expect(getMockVotes()).toHaveLength(0);
		});

		it("should set voting state during operation", async () => {
			// Arrange
			setMockDecisions([{ ...mockVoteDecision }]);
			setMockDecisionOptions(mockVoteOptions.map((o) => ({ ...o })));

			const { result } = renderHook(() =>
				useDecisionVoting(user1Context, mockDecisions, mockSetDecisions, mockSetPollVotes, mockSetError),
			);

			// Assert - Initially not voting
			expect(result.current.voting).toBeNull();

			// Act - Start voting
			let votingPromise: Promise<void>;
			act(() => {
				votingPromise = result.current.handleVote(DECISION_VOTE_ID, OPTION_1_ID);
			});

			// Complete the voting
			await act(async () => {
				await votingPromise;
			});

			// Assert - No longer voting after completion
			expect(result.current.voting).toBeNull();
		});
	});

	describe("handlePollVote", () => {
		let pollDecision: UIDecision;

		beforeEach(() => {
			pollDecision = createUIDecision(mockPollDecision, mockPollOptions);
			pollDecision.current_round = 1;
			mockDecisions = [pollDecision];
			setMockDecisions([{ ...mockPollDecision, current_round: 1 }]);
			setMockDecisionOptions(mockPollOptions.map((o) => ({ ...o })));
		});

		it("should require an option to be selected before voting", async () => {
			// Arrange - No option selected
			const { result } = renderHook(() =>
				useDecisionVoting(user1Context, mockDecisions, mockSetDecisions, mockSetPollVotes, mockSetError),
			);

			// Act
			await act(async () => {
				await result.current.handlePollVote(DECISION_POLL_ID);
			});

			// Assert
			expect(mockSetError).toHaveBeenCalledWith("Please select an option first");
			expect(getMockVotes()).toHaveLength(0);
		});

		it("should record poll vote for current round when option is selected", async () => {
			// Arrange - Select an option first
			mockDecisions[0].options[0].selected = true;

			const { result } = renderHook(() =>
				useDecisionVoting(user1Context, mockDecisions, mockSetDecisions, mockSetPollVotes, mockSetError),
			);

			// Act
			await act(async () => {
				await result.current.handlePollVote(DECISION_POLL_ID);
			});

			// Assert
			expect(getMockVotes()).toHaveLength(1);
			expect(getMockVotes()[0].round).toBe(1);
		});

		it("should complete decision when both partners vote for same option in round 1", async () => {
			// Arrange - Partner already voted for same option
			const existingVote = createVote(USER_2_ID, OPTION_1_ID, DECISION_POLL_ID, 1);
			setMockVotes([existingVote]);

			// User 1 selects same option
			mockDecisions[0].options[0].selected = true; // OPTION_1_ID

			const { result } = renderHook(() =>
				useDecisionVoting(user1Context, mockDecisions, mockSetDecisions, mockSetPollVotes, mockSetError),
			);

			// Act
			await act(async () => {
				await result.current.handlePollVote(DECISION_POLL_ID);
			});

			// Assert - Decision should be completed
			const updatedDecision = mockDecisions.find((d) => d.id === DECISION_POLL_ID);
			expect(updatedDecision?.status).toBe("completed");
		});

		it("should progress to next round when partners vote for different options", async () => {
			// Arrange - Partner voted for option 2, user will vote for option 1
			const existingVote = createVote(USER_2_ID, OPTION_2_ID, DECISION_POLL_ID, 1);
			setMockVotes([existingVote]);

			// User 1 selects different option
			mockDecisions[0].options[0].selected = true; // OPTION_1_ID

			const { result } = renderHook(() =>
				useDecisionVoting(user1Context, mockDecisions, mockSetDecisions, mockSetPollVotes, mockSetError),
			);

			// Act
			await act(async () => {
				await result.current.handlePollVote(DECISION_POLL_ID);
			});

			// Assert - Decision should progress, not complete
			// Note: The actual round progression is tested in database.test.ts
			// Here we just verify the vote was recorded
			expect(getMockVotes()).toHaveLength(2);
		});

		it("should clear poll votes when round is completed", async () => {
			// Arrange
			const existingVote = createVote(USER_2_ID, OPTION_1_ID, DECISION_POLL_ID, 1);
			setMockVotes([existingVote]);
			mockDecisions[0].options[0].selected = true;

			const { result } = renderHook(() =>
				useDecisionVoting(user1Context, mockDecisions, mockSetDecisions, mockSetPollVotes, mockSetError),
			);

			// Act
			await act(async () => {
				await result.current.handlePollVote(DECISION_POLL_ID);
			});

			// Assert
			expect(mockSetPollVotes).toHaveBeenCalled();
		});

		it("should update status to voted when only one partner has voted", async () => {
			// Arrange - No existing votes
			mockDecisions[0].options[0].selected = true;

			const { result } = renderHook(() =>
				useDecisionVoting(user1Context, mockDecisions, mockSetDecisions, mockSetPollVotes, mockSetError),
			);

			// Act
			await act(async () => {
				await result.current.handlePollVote(DECISION_POLL_ID);
			});

			// Assert
			const updatedDecision = mockDecisions.find((d) => d.id === DECISION_POLL_ID);
			expect(updatedDecision?.status).toBe("voted");
		});
	});

	describe("selectOption", () => {
		it("should mark only the selected option as selected", () => {
			// Arrange
			const { result } = renderHook(() =>
				useDecisionVoting(user1Context, mockDecisions, mockSetDecisions, mockSetPollVotes, mockSetError),
			);

			// Act
			act(() => {
				result.current.selectOption(DECISION_VOTE_ID, OPTION_1_ID);
			});

			// Assert
			expect(mockSetDecisions).toHaveBeenCalled();
			const updatedDecision = mockDecisions.find((d) => d.id === DECISION_VOTE_ID);
			expect(updatedDecision?.options.find((o) => o.id === OPTION_1_ID)?.selected).toBe(true);
			expect(updatedDecision?.options.find((o) => o.id === OPTION_2_ID)?.selected).toBe(false);
		});

		it("should deselect previously selected option when selecting a new one", () => {
			// Arrange - Option 2 is already selected
			mockDecisions[0].options[1].selected = true;

			const { result } = renderHook(() =>
				useDecisionVoting(user1Context, mockDecisions, mockSetDecisions, mockSetPollVotes, mockSetError),
			);

			// Act - Select option 1
			act(() => {
				result.current.selectOption(DECISION_VOTE_ID, OPTION_1_ID);
			});

			// Assert
			const updatedDecision = mockDecisions.find((d) => d.id === DECISION_VOTE_ID);
			expect(updatedDecision?.options.find((o) => o.id === OPTION_1_ID)?.selected).toBe(true);
			expect(updatedDecision?.options.find((o) => o.id === OPTION_2_ID)?.selected).toBe(false);
		});
	});

	describe("Round 3 creator blocking", () => {
		it("should only require partner vote in round 3 (creator is blocked)", async () => {
			// Arrange - Set up round 3 scenario
			const round3Decision: UIDecision = {
				...createUIDecision(mockPollDecision, mockPollOptions.slice(0, 2)), // Only 2 options in round 3
				current_round: 3,
			};
			round3Decision.options[0].selected = true;
			mockDecisions = [round3Decision];

			setMockDecisions([{ ...mockPollDecision, current_round: 3 }]);
			setMockDecisionOptions(mockPollOptions.slice(0, 2).map((o) => ({ ...o })));

			// Act as partner (user2), since creator (user1) should be blocked
			const { result } = renderHook(() =>
				useDecisionVoting(user2Context, mockDecisions, mockSetDecisions, mockSetPollVotes, mockSetError),
			);

			// Act
			await act(async () => {
				await result.current.handlePollVote(DECISION_POLL_ID);
			});

			// Assert - Partner's vote should complete the decision
			expect(getMockVotes()).toHaveLength(1);
			expect(getMockVotes()[0].user_id).toBe(USER_2_ID);
			expect(getMockVotes()[0].round).toBe(3);

			// Decision should be completed since round 3 only needs 1 vote
			const updatedDecision = mockDecisions.find((d) => d.id === DECISION_POLL_ID);
			expect(updatedDecision?.status).toBe("completed");
		});
	});
});
