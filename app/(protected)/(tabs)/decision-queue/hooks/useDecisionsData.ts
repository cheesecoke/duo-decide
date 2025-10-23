import { useState, useEffect } from "react";
import {
	getUserContext,
	getActiveDecisions,
	getUserVoteForDecision,
	subscribeToDecisions,
	subscribeToVotes,
	getVotesForRound,
} from "@/lib/database";
import type { UserContext, DecisionWithOptions } from "@/types/database";

// UI-specific decision type that extends the database type
export type UIDecision = Omit<DecisionWithOptions, "options"> & {
	expanded: boolean;
	createdBy: string;
	details: string;
	decidedBy?: string;
	decidedAt?: string;
	options: {
		id: string;
		title: string;
		selected: boolean;
	}[];
};

export function useDecisionsData() {
	const [decisions, setDecisions] = useState<UIDecision[]>([]);
	const [userContext, setUserContext] = useState<UserContext | null>(null);
	const [pollVotes, setPollVotes] = useState<Record<string, Record<string, string>>>({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Transform database decision to UI decision
	const transformDecision = async (
		decision: DecisionWithOptions,
		context: UserContext,
		preserveExpanded?: boolean,
	): Promise<UIDecision> => {
		// Load user's existing vote for this decision
		const userVoteResult = await getUserVoteForDecision(
			decision.id,
			context.userId,
			(decision as any).current_round || 1,
		);
		const userVotedOptionId = userVoteResult.data?.option_id;

		return {
			...decision,
			expanded: preserveExpanded ? true : false,
			createdBy:
				decision.creator_id === context.userId ? context.userName : context.partnerName || "Partner",
			details: decision.description || "",
			decidedBy: decision.decided_by
				? decision.decided_by === context.userId
					? context.userName
					: context.partnerName || "Partner"
				: undefined,
			decidedAt: decision.decided_at || undefined,
			options: decision.options.map((option) => ({
				id: option.id,
				title: option.title,
				selected: option.id === userVotedOptionId,
			})),
		};
	};

	// Initial data load
	useEffect(() => {
		const loadData = async () => {
			console.log("🚀 useDecisionsData: Starting to load data");
			setLoading(true);
			setError(null);

			try {
				// Get user context first
				const context = await getUserContext();
				if (!context) {
					setError("Unable to load user context. Please sign in again.");
					setLoading(false);
					return;
				}

				setUserContext(context);
				console.log("✅ useDecisionsData: User context loaded");

				// Load decisions for the couple
				const decisionsResult = await getActiveDecisions(context.coupleId);

				if (decisionsResult.error) {
					setError(decisionsResult.error);
				} else {
					// Transform database decisions to UI decisions
					const transformedDecisions = await Promise.all(
						(decisionsResult.data || []).map((d) => transformDecision(d, context)),
					);
					setDecisions(transformedDecisions);

					// Load poll votes for current round
					const newPollVotes: Record<string, Record<string, string>> = {};
					for (const decision of transformedDecisions) {
						if (decision.type === "poll") {
							const currentRound = decision.current_round || 1;
							const votesResult = await getVotesForRound(decision.id, currentRound);

							if (votesResult.data) {
								const roundVotes: Record<string, string> = {};
								for (const vote of votesResult.data) {
									const userName =
										vote.user_id === context.userId ? context.userName : context.partnerName || "Partner";
									roundVotes[userName] = vote.option_id;
								}
								newPollVotes[decision.id] = roundVotes;
							}
						}
					}
					setPollVotes(newPollVotes);
				}
			} catch (err) {
				console.error("❌ useDecisionsData: Error loading data:", err);
				setError(err instanceof Error ? err.message : "Failed to load decisions");
			} finally {
				setLoading(false);
			}
		};

		loadData();
	}, []);

	// Subscribe to decision changes
	useEffect(() => {
		if (!userContext) return;

		console.log("🔔 useDecisionsData: Setting up decision subscriptions");

		const decisionSubscription = subscribeToDecisions(
			userContext.coupleId,
			async (updatedDecision, eventType) => {
				setDecisions((prev) => {
					if (eventType === "DELETE") {
						return prev.filter((d) => d.id !== updatedDecision?.id);
					}

					if (!updatedDecision) return prev;

					const existingIndex = prev.findIndex((d) => d.id === updatedDecision.id);

					if (existingIndex >= 0) {
						// Update existing decision
						const updated = [...prev];
						updated[existingIndex] = {
							...updated[existingIndex],
							...updatedDecision,
							expanded: updated[existingIndex].expanded, // Preserve UI state
							createdBy:
								updatedDecision.creator_id === userContext.userId
									? userContext.userName
									: userContext.partnerName || "Partner",
							details: updatedDecision.description || "",
							decidedBy: updatedDecision.decided_by
								? updatedDecision.decided_by === userContext.userId
									? userContext.userName
									: userContext.partnerName || "Partner"
								: undefined,
							decidedAt: updatedDecision.decided_at || undefined,
							options: updatedDecision.options.map((option) => ({
								id: option.id,
								title: option.title,
								selected: false,
							})),
						};
						return updated;
					} else {
						// Add new decision
						const newUIDecision: UIDecision = {
							...updatedDecision,
							expanded: false,
							createdBy:
								updatedDecision.creator_id === userContext.userId
									? userContext.userName
									: userContext.partnerName || "Partner",
							details: updatedDecision.description || "",
							decidedBy: updatedDecision.decided_by
								? updatedDecision.decided_by === userContext.userId
									? userContext.userName
									: userContext.partnerName || "Partner"
								: undefined,
							decidedAt: updatedDecision.decided_at || undefined,
							options: updatedDecision.options.map((option) => ({
								id: option.id,
								title: option.title,
								selected: false,
							})),
						};
						return [newUIDecision, ...prev];
					}
				});
			},
		);

		return () => {
			console.log("🔕 useDecisionsData: Cleaning up decision subscriptions");
			decisionSubscription.unsubscribe();
		};
	}, [userContext]);

	// Subscribe to vote changes for poll decisions
	useEffect(() => {
		if (!userContext || decisions.length === 0) return;

		console.log("🔔 useDecisionsData: Setting up vote subscriptions");
		const voteSubscriptions: any[] = [];

		decisions.forEach((decision) => {
			if (decision.type === "poll") {
				const voteSubscription = subscribeToVotes(decision.id, (votes) => {
					const roundVotes: Record<string, string> = {};
					votes.forEach((vote) => {
						const userName =
							vote.user_id === userContext.userId
								? userContext.userName
								: userContext.partnerName || "Partner";
						roundVotes[userName] = vote.option_id;
					});

					setPollVotes((prev) => ({
						...prev,
						[decision.id]: roundVotes,
					}));
				});
				voteSubscriptions.push(voteSubscription);
			}
		});

		return () => {
			console.log("🔕 useDecisionsData: Cleaning up vote subscriptions");
			voteSubscriptions.forEach((sub) => sub.unsubscribe());
		};
	}, [decisions, userContext]);

	return {
		decisions,
		setDecisions,
		userContext,
		pollVotes,
		setPollVotes,
		loading,
		error,
		setError,
	};
}
