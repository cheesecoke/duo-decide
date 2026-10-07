import { useState } from "react";
import {
	recordVote,
	updateDecision,
	checkRoundCompletion,
	progressToNextRound,
	completeDecision,
	getVoteCountsForDecision,
	getDecisionById,
} from "@/lib/database";
import type { UserContext } from "@/types/database";
import type { UIDecision } from "./useDecisionsData";

export function useDecisionVoting(
	userContext: UserContext | null,
	decisions: UIDecision[],
	setDecisions: React.Dispatch<React.SetStateAction<UIDecision[]>>,
	setPollVotes: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>,
	setError: (error: string | null) => void,
) {
	const [voting, setVoting] = useState<string | null>(null);

	/**
	 * Vote mode: ONE vote, by the partner (the non-creator), decides it.
	 *
	 * The creator proposes the options and their partner picks; the card
	 * blocks the creator from voting (decision-card.model `creator-wait`).
	 * This was the behaviour until PR #10 (Jul 2026) made vote mode wait for
	 * both partners, which, with the creator blocked, left every vote stuck
	 * on "waiting for partner" forever. documents/ROUND_LOGIC.md was wrong
	 * about vote mode and has been corrected.
	 */
	const handleVote = async (decisionId: string, optionId: string) => {
		if (!userContext) return;

		const decision = decisions.find((d) => d.id === decisionId);
		if (!decision) return;

		if (decision.creator_id === userContext.userId) {
			setError("Your partner makes the pick on a decision you created.");
			return;
		}

		const validOption = (decision.options || []).find((opt) => opt.id === optionId);
		if (!validOption) {
			setError("Invalid option selected");
			return;
		}

		setVoting(decisionId);
		setError(null);

		try {
			const voteResult = await recordVote(decisionId, optionId, userContext.userId, 1);

			if (voteResult.error) {
				setError(voteResult.error);
				return;
			}

			const completeResult = await completeDecision(decisionId, optionId, userContext.userId);

			if (completeResult.error) {
				setError(completeResult.error);
				return;
			}

			setDecisions((prev) =>
				prev.map((d) =>
					d.id === decisionId
						? {
								...d,
								status: "completed" as const,
								final_decision: optionId,
								decided_by: userContext.userId,
								decidedBy: userContext.userName,
								decidedAt: new Date().toISOString(),
								options: (d.options || []).map((option) => ({
									...option,
									selected: option.id === optionId,
								})),
							}
						: d,
				),
			);
		} catch (err) {
			console.error("Vote error:", err);
			setError("Failed to submit vote. Please try again.");
		} finally {
			setVoting(null);
		}
	};

	// Poll mode - multi-round voting with elimination
	const handlePollVote = async (decisionId: string) => {
		if (!userContext) return;

		const decision = decisions.find((d) => d.id === decisionId);
		if (!decision) return;

		const selectedOption = (decision.options || []).find((opt) => opt.selected);
		if (!selectedOption) {
			setError("Please select an option first");
			return;
		}

		if (!decision.current_round) {
			setError("Decision data is invalid - missing current round");
			return;
		}

		setVoting(decisionId);
		setError(null);

		try {
			// Record poll vote
			const voteResult = await recordVote(
				decisionId,
				selectedOption.id,
				userContext.userId,
				decision.current_round,
			);

			if (voteResult.error) {
				setError(voteResult.error);
				return;
			}

			// Check if both partners have voted
			const roundCompleteResult = await checkRoundCompletion(
				decisionId,
				decision.current_round,
				userContext.coupleId,
			);

			if (roundCompleteResult.error) {
				setError("Failed to check round completion");
				return;
			}

			if (roundCompleteResult.data) {
				// Both partners voted - check for completion or progression
				const voteCountsResult = await getVoteCountsForDecision(decisionId, decision.current_round);

				if (voteCountsResult.error) {
					setError("Failed to get vote counts");
					return;
				}

				const voteCounts = voteCountsResult.data || {};
				const votedOptions = Object.keys(voteCounts).filter((optionId) => voteCounts[optionId] > 0);
				const isRound3 = decision.current_round === 3;

				// Decision complete if both voted for same option OR Round 3 is done
				if (votedOptions.length === 1 || isRound3) {
					const finalOptionId = votedOptions[0];
					const completeResult = await completeDecision(decisionId, finalOptionId, userContext.userId);

					if (completeResult.error) {
						setError("Failed to complete decision");
						return;
					}

					// Update local state
					setDecisions((prev) =>
						prev.map((d) =>
							d.id === decisionId
								? {
										...d,
										status: "completed" as const,
										final_decision: finalOptionId,
										decided_by: userContext.userId,
									}
								: d,
						),
					);

					// Clear poll votes
					setPollVotes((prev) => {
						const newVotes = { ...prev };
						delete newVotes[decisionId];
						return newVotes;
					});
				} else {
					// Different options - progress to next round
					const progressResult = await progressToNextRound(decisionId, decision.current_round);

					if (progressResult.error) {
						setError("Failed to progress to next round");
						return;
					}

					// Reload decision with updated options and round
					const updatedDecisionResult = await getDecisionById(decisionId);
					if (updatedDecisionResult.data) {
						const uiOptions = (updatedDecisionResult.data.options || []).map((option) => ({
							id: option.id,
							title: option.title,
							selected: false,
						}));

						setDecisions((prev) =>
							prev.map((d) =>
								d.id === decisionId
									? {
											...d,
											...updatedDecisionResult.data,
											options: uiOptions,
											status: "pending" as const,
										}
									: d,
							),
						);

						// Clear poll votes for new round
						setPollVotes((prev) => {
							const newVotes = { ...prev };
							delete newVotes[decisionId];
							return newVotes;
						});
					}
				}
			} else {
				// Only one partner voted
				const result = await updateDecision(decisionId, { status: "voted" });

				if (result.error) {
					setError(result.error);
					return;
				}

				setDecisions((prev) =>
					prev.map((d) => (d.id === decisionId ? { ...d, status: "voted" as const } : d)),
				);

				// Update poll votes state
				setPollVotes((prev) => ({
					...prev,
					[decisionId]: {
						...prev[decisionId],
						[userContext.userName]: selectedOption.id,
					},
				}));
			}
		} catch (err) {
			setError("Failed to submit poll vote. Please try again.");
			console.error("Error voting in poll:", err);
		} finally {
			setVoting(null);
		}
	};

	// UI-only: Update selected option locally (doesn't submit vote)
	const selectOption = (decisionId: string, optionId: string) => {
		setDecisions((prev) =>
			prev.map((decision) =>
				decision.id === decisionId
					? {
							...decision,
							options: (decision.options || []).map((option) =>
								option.id === optionId ? { ...option, selected: true } : { ...option, selected: false },
							),
						}
					: decision,
			),
		);
	};

	return {
		voting,
		handleVote,
		handlePollVote,
		selectOption,
	};
}
