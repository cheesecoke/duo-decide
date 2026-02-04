// Tests for hooks/decision-queue/useDecisionsData.ts
// Covers data loading, transformation, and state management

import { renderHook, act, waitFor } from "@testing-library/react-native";
import { useDecisionsData } from "@/hooks/decision-queue/useDecisionsData";
import type { UserContext } from "@/types/database";

import {
	resetMockData,
	setMockVotes,
	setMockDecisions,
	setMockDecisionOptions,
	setMockCouples,
	setMockProfiles,
	mockSupabase,
} from "@/test-utils/supabase-mock";

import {
	USER_1_ID,
	USER_2_ID,
	COUPLE_ID,
	DECISION_VOTE_ID,
	DECISION_POLL_ID,
	OPTION_1_ID,
	OPTION_2_ID,
	mockProfiles,
	mockCouple,
	mockVoteDecision,
	mockPollDecision,
	mockVoteOptions,
	mockPollOptions,
	createVote,
} from "@/test-utils/fixtures";

// Mock user context that would be provided by UserContextProvider
const mockUserContext: UserContext = {
	userId: USER_1_ID,
	coupleId: COUPLE_ID,
	partnerId: USER_2_ID,
	userName: "Alice",
	partnerName: "Bob",
};

// Mock the auth.getUser response
beforeEach(() => {
	mockSupabase.supabase.auth.getUser.mockResolvedValue({
		data: { user: { id: USER_1_ID, email: "alice@example.com" } },
		error: null,
	});
});

describe("useDecisionsData", () => {
	beforeEach(() => {
		resetMockData();
		setMockCouples([mockCouple]);
		setMockProfiles(mockProfiles);
	});

	describe("initial data loading", () => {
		it("should start with loading state true when userContext provided", () => {
			const { result } = renderHook(() => useDecisionsData(mockUserContext));

			expect(result.current.loading).toBe(true);
		});

		it("should set loading to false immediately when no userContext", () => {
			// Act
			const { result } = renderHook(() => useDecisionsData(null));

			// Assert - Should not be loading without userContext
			expect(result.current.loading).toBe(false);
		});

		it("should load decisions for the couple", async () => {
			// Arrange
			setMockDecisions([{ ...mockVoteDecision }]);
			setMockDecisionOptions(mockVoteOptions.map((o) => ({ ...o })));

			// Act
			const { result } = renderHook(() => useDecisionsData(mockUserContext));

			// Assert
			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			expect(result.current.decisions).toHaveLength(1);
			expect(result.current.decisions[0].id).toBe(DECISION_VOTE_ID);
		});

		it("should transform decisions with UI-specific fields", async () => {
			// Arrange
			setMockDecisions([{ ...mockVoteDecision }]);
			setMockDecisionOptions(mockVoteOptions.map((o) => ({ ...o })));

			// Act
			const { result } = renderHook(() => useDecisionsData(mockUserContext));

			// Assert
			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			const decision = result.current.decisions[0];
			expect(decision).toHaveProperty("expanded");
			expect(decision).toHaveProperty("createdBy");
			expect(decision).toHaveProperty("details");
			expect(decision.expanded).toBe(false); // Default state
		});

		it("should not load data when userContext is null", async () => {
			// Arrange
			setMockDecisions([{ ...mockVoteDecision }]);
			setMockDecisionOptions(mockVoteOptions.map((o) => ({ ...o })));

			// Act
			const { result } = renderHook(() => useDecisionsData(null));

			// Assert - Should have no decisions without userContext
			expect(result.current.loading).toBe(false);
			expect(result.current.decisions).toHaveLength(0);
		});
	});

	describe("poll votes loading", () => {
		it("should load existing poll votes for poll decisions", async () => {
			// Arrange
			const pollDecision = { ...mockPollDecision, current_round: 1 };
			setMockDecisions([pollDecision]);
			setMockDecisionOptions(mockPollOptions.map((o) => ({ ...o })));

			const existingVote = createVote(USER_1_ID, OPTION_1_ID, DECISION_POLL_ID, 1);
			setMockVotes([existingVote]);

			// Act
			const { result } = renderHook(() => useDecisionsData(mockUserContext));

			// Assert
			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			// Poll votes should be loaded
			expect(result.current.pollVotes).toBeDefined();
		});
	});

	describe("state setters", () => {
		it("should provide setDecisions function", async () => {
			// Arrange
			setMockDecisions([{ ...mockVoteDecision }]);
			setMockDecisionOptions(mockVoteOptions.map((o) => ({ ...o })));

			const { result } = renderHook(() => useDecisionsData(mockUserContext));

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			// Act - Use setDecisions to update state
			act(() => {
				result.current.setDecisions((prev) =>
					prev.map((d) => ({ ...d, expanded: true })),
				);
			});

			// Assert
			expect(result.current.decisions[0].expanded).toBe(true);
		});

		it("should provide setPollVotes function", async () => {
			// Arrange
			setMockDecisions([]);
			setMockDecisionOptions([]);

			const { result } = renderHook(() => useDecisionsData(mockUserContext));

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			// Act
			act(() => {
				result.current.setPollVotes({ "test-id": { Alice: "option-1" } });
			});

			// Assert
			expect(result.current.pollVotes["test-id"]).toEqual({ Alice: "option-1" });
		});

		it("should provide setError function", async () => {
			// Arrange
			setMockDecisions([]);
			setMockDecisionOptions([]);

			const { result } = renderHook(() => useDecisionsData(mockUserContext));

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			// Act
			act(() => {
				result.current.setError("Test error message");
			});

			// Assert
			expect(result.current.error).toBe("Test error message");
		});
	});

	describe("options handling", () => {
		it("should transform options with UI fields", async () => {
			// Arrange
			setMockDecisions([{ ...mockVoteDecision }]);
			setMockDecisionOptions(mockVoteOptions.map((o) => ({ ...o })));

			// Act
			const { result } = renderHook(() => useDecisionsData(mockUserContext));

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			// Assert
			const options = result.current.decisions[0].options;
			expect(options).toHaveLength(2);
			expect(options[0]).toHaveProperty("id");
			expect(options[0]).toHaveProperty("title");
			expect(options[0]).toHaveProperty("selected");
		});

		it("should mark user's previously voted option as selected", async () => {
			// Arrange - User already voted for option 1
			const existingVote = createVote(USER_1_ID, OPTION_1_ID, DECISION_VOTE_ID, 1);
			setMockVotes([existingVote]);
			setMockDecisions([{ ...mockVoteDecision }]);
			setMockDecisionOptions(mockVoteOptions.map((o) => ({ ...o })));

			// Act
			const { result } = renderHook(() => useDecisionsData(mockUserContext));

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			// Assert
			const options = result.current.decisions[0].options;
			const votedOption = options.find((o) => o.id === OPTION_1_ID);
			expect(votedOption?.selected).toBe(true);
		});
	});

	describe("creator display name", () => {
		it("should show current user's name when they created the decision", async () => {
			// Arrange - Decision created by user 1 (current user)
			setMockDecisions([{ ...mockVoteDecision, creator_id: USER_1_ID }]);
			setMockDecisionOptions(mockVoteOptions.map((o) => ({ ...o })));

			// Act
			const { result } = renderHook(() => useDecisionsData(mockUserContext));

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			// Assert
			expect(result.current.decisions[0].createdBy).toBe("Alice");
		});

		it("should show partner's name when they created the decision", async () => {
			// Arrange - Decision created by user 2 (partner)
			setMockDecisions([{ ...mockVoteDecision, creator_id: USER_2_ID }]);
			setMockDecisionOptions(mockVoteOptions.map((o) => ({ ...o })));

			// Act
			const { result } = renderHook(() => useDecisionsData(mockUserContext));

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			// Assert
			expect(result.current.decisions[0].createdBy).toBe("Bob");
		});
	});
});
