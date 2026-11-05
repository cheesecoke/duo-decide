// Tests for lib/database.ts
// Covers vote recording, round progression, and decision completion logic

import {
	recordVote,
	getVotesForDecision,
	getUserVoteForDecision,
	getVotesForRound,
	getVoteCountsForDecision,
	checkRoundCompletion,
	progressToNextRound,
	completeDecision,
	archiveDecision,
	unarchiveDecision,
	softDeleteDecision,
	getActiveDecisions,
	getCompletedDecisions,
	getCompletedDecisionsCount,
	isMissingLifecycleColumn,
	isOffQueue,
	createDecision,
	getDecisionById,
	updateDecision,
} from "@/lib/database";

import {
	resetMockData,
	setMockVotes,
	setMockDecisions,
	setMockDecisionOptions,
	setMockCouples,
	setMockProfiles,
	getMockVotes,
	getMockDecisions,
	getMockDecisionOptions,
	setMockLifecycleColumns,
	setMockRpcError,
	setMockAuthUser,
} from "@/test-utils/supabase-mock";
import { supabase } from "@/config/supabase";

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
	createVote,
} from "@/test-utils/fixtures";

describe("lib/database", () => {
	beforeEach(() => {
		resetMockData();
		setMockCouples([mockCouple]);
		setMockProfiles(mockProfiles);
	});

	describe("recordVote", () => {
		describe("when creating a new vote", () => {
			it("should create a vote record with correct data", async () => {
				// Arrange
				setMockDecisions([mockVoteDecision]);
				setMockDecisionOptions(mockVoteOptions);

				// Act
				const result = await recordVote(DECISION_VOTE_ID, OPTION_1_ID, USER_1_ID, 1);

				// Assert
				expect(result.error).toBeNull();
				expect(result.data).toMatchObject({
					decision_id: DECISION_VOTE_ID,
					option_id: OPTION_1_ID,
					user_id: USER_1_ID,
					round: 1,
				});
			});

			it("should create votes for different users independently", async () => {
				// Arrange
				setMockDecisions([mockVoteDecision]);
				setMockDecisionOptions(mockVoteOptions);

				// Act
				const result1 = await recordVote(DECISION_VOTE_ID, OPTION_1_ID, USER_1_ID, 1);
				const result2 = await recordVote(DECISION_VOTE_ID, OPTION_2_ID, USER_2_ID, 1);

				// Assert
				expect(result1.error).toBeNull();
				expect(result2.error).toBeNull();
				expect(getMockVotes()).toHaveLength(2);
				expect(getMockVotes()[0].user_id).toBe(USER_1_ID);
				expect(getMockVotes()[1].user_id).toBe(USER_2_ID);
			});
		});

		describe("when updating an existing vote", () => {
			it("should update the existing vote instead of creating a new one", async () => {
				// Arrange
				const existingVote = createVote(USER_1_ID, OPTION_1_ID, DECISION_VOTE_ID, 1);
				setMockVotes([existingVote]);
				setMockDecisions([mockVoteDecision]);
				setMockDecisionOptions(mockVoteOptions);

				// Act
				const result = await recordVote(DECISION_VOTE_ID, OPTION_2_ID, USER_1_ID, 1);

				// Assert
				expect(result.error).toBeNull();
				expect(result.data?.option_id).toBe(OPTION_2_ID);
				// Should still only have 1 vote (updated, not new)
				expect(getMockVotes()).toHaveLength(1);
			});
		});

		describe("default round parameter", () => {
			it("should default to round 1 when round is not specified", async () => {
				// Arrange
				setMockDecisions([mockVoteDecision]);
				setMockDecisionOptions(mockVoteOptions);

				// Act - no round parameter
				const result = await recordVote(DECISION_VOTE_ID, OPTION_1_ID, USER_1_ID);

				// Assert
				expect(result.error).toBeNull();
				expect(result.data?.round).toBe(1);
			});
		});

		describe("with poll mode rounds", () => {
			it("should record vote for specific round", async () => {
				// Arrange
				setMockDecisions([mockPollDecision]);
				setMockDecisionOptions(mockPollOptions);

				// Act
				const round1Vote = await recordVote(DECISION_POLL_ID, OPTION_1_ID, USER_1_ID, 1);
				const round2Vote = await recordVote(DECISION_POLL_ID, OPTION_2_ID, USER_1_ID, 2);

				// Assert
				expect(round1Vote.data?.round).toBe(1);
				expect(round2Vote.data?.round).toBe(2);
				expect(getMockVotes()).toHaveLength(2);
			});
		});
	});

	describe("getVotesForDecision", () => {
		it("should return all votes for a decision", async () => {
			// Arrange
			const votes = [
				createVote(USER_1_ID, OPTION_1_ID, DECISION_VOTE_ID, 1),
				createVote(USER_2_ID, OPTION_2_ID, DECISION_VOTE_ID, 1),
			];
			setMockVotes(votes);

			// Act
			const result = await getVotesForDecision(DECISION_VOTE_ID);

			// Assert
			expect(result.error).toBeNull();
			expect(result.data).toHaveLength(2);
		});

		it("should filter votes by round when specified", async () => {
			// Arrange
			const votes = [
				createVote(USER_1_ID, OPTION_1_ID, DECISION_POLL_ID, 1),
				createVote(USER_2_ID, OPTION_2_ID, DECISION_POLL_ID, 1),
				createVote(USER_1_ID, OPTION_1_ID, DECISION_POLL_ID, 2),
			];
			setMockVotes(votes);

			// Act
			const result = await getVotesForDecision(DECISION_POLL_ID, 1);

			// Assert
			expect(result.error).toBeNull();
			expect(result.data).toHaveLength(2);
			expect(result.data?.every((v) => v.round === 1)).toBe(true);
		});

		it("should return empty array when no votes exist", async () => {
			// Act
			const result = await getVotesForDecision("non-existent-id");

			// Assert
			expect(result.error).toBeNull();
			expect(result.data).toHaveLength(0);
		});
	});

	describe("getUserVoteForDecision", () => {
		it("should return the user's vote for a specific round", async () => {
			// Arrange
			const vote = createVote(USER_1_ID, OPTION_1_ID, DECISION_VOTE_ID, 1);
			setMockVotes([vote]);

			// Act
			const result = await getUserVoteForDecision(DECISION_VOTE_ID, USER_1_ID, 1);

			// Assert
			expect(result.error).toBeNull();
			expect(result.data?.user_id).toBe(USER_1_ID);
			expect(result.data?.option_id).toBe(OPTION_1_ID);
		});

		it("should return null when user has not voted", async () => {
			// Act
			const result = await getUserVoteForDecision(DECISION_VOTE_ID, USER_1_ID, 1);

			// Assert
			expect(result.error).toBeNull();
			expect(result.data).toBeNull();
		});
	});

	describe("getVotesForRound", () => {
		it("should return only votes for the specified round", async () => {
			// Arrange
			const votes = [
				createVote(USER_1_ID, OPTION_1_ID, DECISION_POLL_ID, 1),
				createVote(USER_2_ID, OPTION_2_ID, DECISION_POLL_ID, 1),
				createVote(USER_1_ID, OPTION_1_ID, DECISION_POLL_ID, 2),
				createVote(USER_2_ID, OPTION_1_ID, DECISION_POLL_ID, 2),
			];
			setMockVotes(votes);

			// Act
			const round1Result = await getVotesForRound(DECISION_POLL_ID, 1);
			const round2Result = await getVotesForRound(DECISION_POLL_ID, 2);

			// Assert
			expect(round1Result.data).toHaveLength(2);
			expect(round2Result.data).toHaveLength(2);
		});
	});

	describe("getVoteCountsForDecision", () => {
		it("should return vote counts per option", async () => {
			// Arrange
			const votes = [
				createVote(USER_1_ID, OPTION_1_ID, DECISION_POLL_ID, 1),
				createVote(USER_2_ID, OPTION_1_ID, DECISION_POLL_ID, 1), // Same option
			];
			setMockVotes(votes);

			// Act
			const result = await getVoteCountsForDecision(DECISION_POLL_ID, 1);

			// Assert
			expect(result.error).toBeNull();
			expect(result.data?.[OPTION_1_ID]).toBe(2);
			expect(result.data?.[OPTION_2_ID]).toBeUndefined();
		});

		it("should count votes separately when partners choose different options", async () => {
			// Arrange
			const votes = [
				createVote(USER_1_ID, OPTION_1_ID, DECISION_POLL_ID, 1),
				createVote(USER_2_ID, OPTION_2_ID, DECISION_POLL_ID, 1),
			];
			setMockVotes(votes);

			// Act
			const result = await getVoteCountsForDecision(DECISION_POLL_ID, 1);

			// Assert
			expect(result.data?.[OPTION_1_ID]).toBe(1);
			expect(result.data?.[OPTION_2_ID]).toBe(1);
		});

		it("should return empty object when no votes exist", async () => {
			// Act
			const result = await getVoteCountsForDecision(DECISION_POLL_ID, 1);

			// Assert
			expect(result.error).toBeNull();
			expect(result.data).toEqual({});
		});

		it("should only count votes for the specified round", async () => {
			// Arrange - votes across multiple rounds
			const votes = [
				createVote(USER_1_ID, OPTION_1_ID, DECISION_POLL_ID, 1),
				createVote(USER_2_ID, OPTION_2_ID, DECISION_POLL_ID, 1),
				createVote(USER_1_ID, OPTION_1_ID, DECISION_POLL_ID, 2),
			];
			setMockVotes(votes);

			// Act
			const round2Counts = await getVoteCountsForDecision(DECISION_POLL_ID, 2);

			// Assert - only round 2 vote counted
			expect(round2Counts.data?.[OPTION_1_ID]).toBe(1);
			expect(round2Counts.data?.[OPTION_2_ID]).toBeUndefined();
		});
	});

	describe("checkRoundCompletion", () => {
		describe("for rounds 1 and 2", () => {
			it("should return false when only one partner has voted", async () => {
				// Arrange
				const votes = [createVote(USER_1_ID, OPTION_1_ID, DECISION_POLL_ID, 1)];
				setMockVotes(votes);

				// Act
				const result = await checkRoundCompletion(DECISION_POLL_ID, 1, COUPLE_ID);

				// Assert
				expect(result.error).toBeNull();
				expect(result.data).toBe(false);
			});

			it("should return true when both partners have voted", async () => {
				// Arrange
				const votes = [
					createVote(USER_1_ID, OPTION_1_ID, DECISION_POLL_ID, 1),
					createVote(USER_2_ID, OPTION_2_ID, DECISION_POLL_ID, 1),
				];
				setMockVotes(votes);

				// Act
				const result = await checkRoundCompletion(DECISION_POLL_ID, 1, COUPLE_ID);

				// Assert
				expect(result.error).toBeNull();
				expect(result.data).toBe(true);
			});
		});

		describe("for round 2", () => {
			it("should return true when both partners have voted in round 2", async () => {
				// Arrange
				const votes = [
					createVote(USER_1_ID, OPTION_1_ID, DECISION_POLL_ID, 2),
					createVote(USER_2_ID, OPTION_2_ID, DECISION_POLL_ID, 2),
				];
				setMockVotes(votes);

				// Act
				const result = await checkRoundCompletion(DECISION_POLL_ID, 2, COUPLE_ID);

				// Assert
				expect(result.error).toBeNull();
				expect(result.data).toBe(true);
			});
		});

		describe("for round 3", () => {
			it("should return true when only partner (non-creator) has voted", async () => {
				// Arrange - In round 3, only the partner (non-creator) votes
				// Creator is USER_1_ID, so partner (USER_2_ID) votes
				const votes = [createVote(USER_2_ID, OPTION_1_ID, DECISION_POLL_ID, 3)];
				setMockVotes(votes);

				// Act
				const result = await checkRoundCompletion(DECISION_POLL_ID, 3, COUPLE_ID);

				// Assert
				expect(result.error).toBeNull();
				expect(result.data).toBe(true); // Round 3 needs only 1 vote
			});

			it("should return false when no one has voted in round 3", async () => {
				// Arrange
				setMockVotes([]);

				// Act
				const result = await checkRoundCompletion(DECISION_POLL_ID, 3, COUPLE_ID);

				// Assert
				expect(result.error).toBeNull();
				expect(result.data).toBe(false);
			});
		});
	});

	describe("progressToNextRound", () => {
		it("should advance from round 1 to round 2 with top options", async () => {
			// Arrange - Both partners voted for different options
			const votes = [
				createVote(USER_1_ID, OPTION_1_ID, DECISION_POLL_ID, 1),
				createVote(USER_2_ID, OPTION_2_ID, DECISION_POLL_ID, 1),
			];
			setMockVotes(votes);
			setMockDecisions([{ ...mockPollDecision, current_round: 1 }]);
			setMockDecisionOptions(mockPollOptions.map((o) => ({ ...o })));

			// Act
			const result = await progressToNextRound(DECISION_POLL_ID, 1);

			// Assert
			expect(result.error).toBeNull();
			expect(result.data).toBe(true);
		});

		it("should advance from round 2 to round 3", async () => {
			// Arrange - Round 2 with 2 remaining options
			const round2Options = mockPollOptions.slice(0, 2).map((o) => ({ ...o }));
			const votes = [
				createVote(USER_1_ID, OPTION_1_ID, DECISION_POLL_ID, 2),
				createVote(USER_2_ID, OPTION_2_ID, DECISION_POLL_ID, 2),
			];
			setMockVotes(votes);
			setMockDecisions([{ ...mockPollDecision, current_round: 2 }]);
			setMockDecisionOptions(round2Options);

			// Act
			const result = await progressToNextRound(DECISION_POLL_ID, 2);

			// Assert
			expect(result.error).toBeNull();
			expect(result.data).toBe(true);
			const decision = getMockDecisions().find((d) => d.id === DECISION_POLL_ID);
			expect(decision?.current_round).toBe(3);
		});

		it("should create new options matching the voted option titles", async () => {
			// Arrange
			const votes = [
				createVote(USER_1_ID, OPTION_1_ID, DECISION_POLL_ID, 1),
				createVote(USER_2_ID, OPTION_3_ID, DECISION_POLL_ID, 1),
			];
			setMockVotes(votes);
			setMockDecisions([{ ...mockPollDecision, current_round: 1 }]);
			setMockDecisionOptions(mockPollOptions.map((o) => ({ ...o })));

			// Act
			await progressToNextRound(DECISION_POLL_ID, 1);

			// Assert - new options should have the titles of voted options
			const newOptions = getMockDecisionOptions().filter((o) => o.decision_id === DECISION_POLL_ID);
			const titles = newOptions.map((o) => o.title).sort();
			expect(titles).toEqual(["Action Movie", "Drama"].sort());
		});

		it("should fail if not exactly 2 votes in the round", async () => {
			// Arrange - Only one vote
			const votes = [createVote(USER_1_ID, OPTION_1_ID, DECISION_POLL_ID, 1)];
			setMockVotes(votes);
			setMockDecisions([mockPollDecision]);
			setMockDecisionOptions(mockPollOptions.map((o) => ({ ...o })));

			// Act
			const result = await progressToNextRound(DECISION_POLL_ID, 1);

			// Assert
			expect(result.error).toBe("Expected exactly 2 votes for round progression");
		});

		it("should fail if both votes are for the same option", async () => {
			// Arrange - Both voted for same option
			const votes = [
				createVote(USER_1_ID, OPTION_1_ID, DECISION_POLL_ID, 1),
				createVote(USER_2_ID, OPTION_1_ID, DECISION_POLL_ID, 1),
			];
			setMockVotes(votes);
			setMockDecisions([{ ...mockPollDecision, current_round: 1 }]);
			setMockDecisionOptions(mockPollOptions.map((o) => ({ ...o })));

			// Act
			const result = await progressToNextRound(DECISION_POLL_ID, 1);

			// Assert - should fail because only 1 unique option
			expect(result.error).toContain("Expected exactly 2 unique voted options");
		});
	});

	describe("completeDecision", () => {
		it("should mark decision as completed with final option", async () => {
			// Arrange
			setMockDecisions([mockVoteDecision]);
			setMockDecisionOptions(mockVoteOptions);

			// Act
			const result = await completeDecision(DECISION_VOTE_ID, OPTION_1_ID, USER_1_ID);

			// Assert
			expect(result.error).toBeNull();
			const decisions = getMockDecisions();
			const updated = decisions.find((d) => d.id === DECISION_VOTE_ID);
			expect(updated?.status).toBe("completed");
			expect(updated?.final_decision).toBe(OPTION_1_ID);
			expect(updated?.decided_by).toBe(USER_1_ID);
		});

		it("should set decided_at timestamp", async () => {
			// Arrange
			setMockDecisions([mockVoteDecision]);
			setMockDecisionOptions(mockVoteOptions);

			// Act
			const before = new Date().toISOString();
			await completeDecision(DECISION_VOTE_ID, OPTION_1_ID, USER_1_ID);
			const after = new Date().toISOString();

			// Assert
			const updated = getMockDecisions().find((d) => d.id === DECISION_VOTE_ID);
			expect(updated?.decided_at).toBeDefined();
			expect(updated!.decided_at! >= before).toBe(true);
			expect(updated!.decided_at! <= after).toBe(true);
		});

		it("should work for poll decisions completed by partner", async () => {
			// Arrange - Poll decision in round 3
			setMockDecisions([{ ...mockPollDecision, current_round: 3 }]);
			setMockDecisionOptions(mockPollOptions.slice(0, 2));

			// Act - Partner (User 2) makes final decision
			const result = await completeDecision(DECISION_POLL_ID, OPTION_2_ID, USER_2_ID);

			// Assert
			expect(result.error).toBeNull();
			const updated = getMockDecisions().find((d) => d.id === DECISION_POLL_ID);
			expect(updated?.status).toBe("completed");
			expect(updated?.decided_by).toBe(USER_2_ID);
			expect(updated?.final_decision).toBe(OPTION_2_ID);
		});
	});

	/**
	 * Migration 024. Nothing in lib/database.ts hard-deletes a decision any
	 * more: archive, unarchive and soft delete are one RPC each, and every
	 * read leaves soft-deleted rows out (and the queue, archived ones).
	 */
	describe("archive + soft delete", () => {
		const ID = "lifecycle-decision";
		const completed = (over: Partial<typeof mockVoteDecision> = {}) => ({
			...mockVoteDecision,
			id: ID,
			status: "completed" as const,
			decided_by: USER_2_ID,
			decided_at: "2026-11-01T00:00:00Z",
			final_decision: OPTION_1_ID,
			...over,
		});

		beforeEach(() => {
			resetMockData();
			setMockCouples([mockCouple]);
			setMockProfiles(mockProfiles);
			setMockAuthUser(USER_2_ID);
		});

		it("archiveDecision calls the RPC and stamps who did it; nothing is removed", async () => {
			setMockDecisions([completed()]);
			setMockDecisionOptions(mockVoteOptions.map((o) => ({ ...o, decision_id: ID })));
			setMockVotes([createVote(USER_2_ID, OPTION_1_ID, ID, 1)]);

			const result = await archiveDecision(ID);

			expect(result).toEqual({ data: true, error: null });
			expect(supabase.rpc).toHaveBeenCalledWith("archive_decision", { p_decision_id: ID });
			const row = getMockDecisions()[0];
			expect(row.archived_at).toBeTruthy();
			expect(row.archived_by).toBe(USER_2_ID);
			expect(row.deleted_at).toBeFalsy();
			expect(getMockDecisionOptions()).toHaveLength(2);
			expect(getMockVotes()).toHaveLength(1);
		});

		it("unarchiveDecision clears the stamps", async () => {
			setMockDecisions([completed({ archived_at: "2026-11-02T00:00:00Z", archived_by: USER_1_ID })]);

			const result = await unarchiveDecision(ID);

			expect(result.error).toBeNull();
			expect(supabase.rpc).toHaveBeenCalledWith("unarchive_decision", { p_decision_id: ID });
			expect(getMockDecisions()[0].archived_at).toBeNull();
			expect(getMockDecisions()[0].archived_by).toBeNull();
		});

		it("softDeleteDecision keeps the row, its options and its votes", async () => {
			setMockDecisions([completed()]);
			setMockDecisionOptions(mockVoteOptions.map((o) => ({ ...o, decision_id: ID })));
			setMockVotes([createVote(USER_2_ID, OPTION_1_ID, ID, 1)]);

			const result = await softDeleteDecision(ID);

			expect(result).toEqual({ data: true, error: null });
			expect(supabase.rpc).toHaveBeenCalledWith("soft_delete_decision", { p_decision_id: ID });
			expect(getMockDecisions()).toHaveLength(1);
			expect(getMockDecisions()[0].deleted_at).toBeTruthy();
			expect(getMockDecisions()[0].deleted_by).toBe(USER_2_ID);
			expect(getMockDecisionOptions()).toHaveLength(2);
			expect(getMockVotes()).toHaveLength(1);
		});

		it("passes the database's refusal through as the error", async () => {
			setMockDecisions([completed()]);
			setMockRpcError("archive_decision", "Only a decided decision can be archived");

			expect(await archiveDecision(ID)).toEqual({
				data: null,
				error: "Only a decided decision can be archived",
			});
		});

		it("turns a thrown error into a result, not a crash", async () => {
			jest.mocked(supabase.rpc).mockImplementationOnce(() => {
				throw new Error("offline");
			});
			expect(await softDeleteDecision(ID)).toEqual({ data: null, error: "offline" });
		});

		it("the queue leaves out archived and soft-deleted decisions", async () => {
			setMockDecisions([
				{ ...mockVoteDecision, id: "live" },
				completed({ id: "decided" }),
				completed({ id: "archived", archived_at: "2026-11-02T00:00:00Z" }),
				{ ...mockVoteDecision, id: "deleted-open", deleted_at: "2026-11-02T00:00:00Z" },
			]);

			const result = await getActiveDecisions(COUPLE_ID);

			expect(result.error).toBeNull();
			expect(result.data!.map((d) => d.id).sort()).toEqual(["decided", "live"]);
		});

		it("History keeps archived decisions and leaves out soft-deleted ones — rows and count", async () => {
			setMockDecisions([
				completed({ id: "decided" }),
				completed({ id: "archived", archived_at: "2026-11-02T00:00:00Z" }),
				completed({ id: "deleted", deleted_at: "2026-11-02T00:00:00Z" }),
				{ ...mockVoteDecision, id: "open" },
			]);

			const rows = await getCompletedDecisions(COUPLE_ID, { limit: 20, offset: 0 });
			const count = await getCompletedDecisionsCount(COUPLE_ID);

			expect(rows.data!.map((d) => d.id).sort()).toEqual(["archived", "decided"]);
			expect(count).toEqual({ data: 2, error: null });
		});

		describe("shipped before migration 024 is applied", () => {
			beforeEach(() => setMockLifecycleColumns(false));

			it("the queue still loads — every decision, since none can be archived yet", async () => {
				setMockDecisions([{ ...mockVoteDecision, id: "live" }, completed({ id: "decided" })]);

				const result = await getActiveDecisions(COUPLE_ID);

				expect(result.error).toBeNull();
				expect(result.data!.map((d) => d.id).sort()).toEqual(["decided", "live"]);
			});

			it("History and its count still load", async () => {
				setMockDecisions([completed({ id: "decided" })]);

				const rows = await getCompletedDecisions(COUPLE_ID, { limit: 20, offset: 0 });
				const count = await getCompletedDecisionsCount(COUPLE_ID);

				expect(rows).toMatchObject({ error: null, data: [{ id: "decided" }] });
				expect(count).toEqual({ data: 1, error: null });
			});

			it("archive / delete fail with the database's message, and change nothing", async () => {
				setMockDecisions([completed()]);

				const result = await archiveDecision(ID);

				expect(result.data).toBeNull();
				expect(result.error).toMatch(/Could not find the function public.archive_decision/);
				expect(getMockDecisions()[0].archived_at).toBeUndefined();
			});
		});

		it("createDecision's clean-up after a failed options insert is a soft delete", async () => {
			const from = supabase.from as unknown as (table: string) => unknown;
			const spy = jest.spyOn(supabase, "from").mockImplementation(((table: string) => {
				const real = from(table) as Record<string, unknown>;
				if (table !== "decision_options") return real;
				return {
					...real,
					insert: () => Promise.resolve({ data: null, error: { message: "options failed" } }),
				};
			}) as never);

			const result = await createDecision(
				{
					couple_id: COUPLE_ID,
					creator_id: USER_1_ID,
					partner_id: USER_2_ID,
					title: "Half made",
					type: "vote",
				},
				[{ decision_id: "", title: "A" }],
			);
			spy.mockRestore();

			expect(result.error).toBe("options failed");
			const made = getMockDecisions().find((d) => d.title === "Half made");
			expect(made?.deleted_at).toBeTruthy();
		});
	});

	describe("isMissingLifecycleColumn / isOffQueue", () => {
		it("recognises PostgREST's undefined-column error and nothing else", () => {
			expect(isMissingLifecycleColumn({ code: "42703", message: "x" })).toBe(true);
			expect(isMissingLifecycleColumn({ message: "column decisions.deleted_at does not exist" })).toBe(
				true,
			);
			expect(isMissingLifecycleColumn({ code: "42501", message: "permission denied" })).toBe(false);
		});

		it("is off the queue when archived or deleted, and not when the columns are absent", () => {
			expect(isOffQueue({ archived_at: "2026-11-01" })).toBe(true);
			expect(isOffQueue({ deleted_at: "2026-11-01" })).toBe(true);
			expect(isOffQueue({ archived_at: null, deleted_at: null })).toBe(false);
			expect(isOffQueue({})).toBe(false);
			expect(isOffQueue(null)).toBe(false);
		});
	});

	describe("getDecisionById", () => {
		beforeEach(() => {
			// Reset mock data fresh for these tests
			resetMockData();
			setMockCouples([mockCouple]);
			setMockProfiles(mockProfiles);
		});

		it("should return decision with its options", async () => {
			// Arrange - Create fresh copies of the data
			setMockDecisions([{ ...mockVoteDecision }]);
			setMockDecisionOptions(mockVoteOptions.map((o) => ({ ...o })));

			// Act
			const result = await getDecisionById(DECISION_VOTE_ID);

			// Assert
			expect(result.error).toBeNull();
			expect(result.data?.id).toBe(DECISION_VOTE_ID);
			expect(result.data?.options).toHaveLength(2);
		});

		it("should return error when decision not found", async () => {
			// Act
			const result = await getDecisionById("non-existent-id");

			// Assert
			expect(result.error).not.toBeNull();
			expect(result.data).toBeNull();
		});
	});

	describe("updateDecision", () => {
		it("should update decision fields", async () => {
			// Arrange
			setMockDecisions([mockVoteDecision]);
			setMockDecisionOptions(mockVoteOptions);

			// Act
			const result = await updateDecision(DECISION_VOTE_ID, {
				status: "voted",
			});

			// Assert
			expect(result.error).toBeNull();
			const decisions = getMockDecisions();
			const updated = decisions.find((d) => d.id === DECISION_VOTE_ID);
			expect(updated?.status).toBe("voted");
		});
	});
});
