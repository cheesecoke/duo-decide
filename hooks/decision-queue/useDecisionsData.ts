import { useState, useEffect, useRef, useCallback } from "react";
import {
	getActiveDecisions,
	getUserVoteForDecision,
	subscribeToDecisions,
	subscribeToVotes,
	getVotesForRound,
} from "@/lib/database";
import type { UserContext, DecisionWithOptions } from "@/types/database";
import { useRealtimeStatus } from "@/context/realtime-status-context";

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

export function useDecisionsData(userContext: UserContext | null) {
	const [decisions, setDecisions] = useState<UIDecision[]>([]);
	const [pollVotes, setPollVotes] = useState<Record<string, Record<string, string>>>({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const decisionsRef = useRef<UIDecision[]>([]);
	const { setReconnecting, registerRefetch, runRefetches } = useRealtimeStatus();

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
			options: (decision.options || []).map((option) => ({
				id: option.id,
				title: option.title,
				selected: option.id === userVotedOptionId,
			})),
		};
	};

	// Stable ref for refetch so reconnection can trigger reload
	const loadDataRef = useRef<() => Promise<void>>(async () => {});

	// Initial data load - depends on userContext being available
	const loadData = useCallback(async () => {
		if (!userContext) return;

		setLoading(true);
		setError(null);

		try {
			const decisionsResult = await getActiveDecisions(userContext.coupleId);

			if (decisionsResult.error) {
				setError(decisionsResult.error);
			} else {
				const transformedDecisions = await Promise.all(
					(decisionsResult.data || []).map((d) => transformDecision(d, userContext)),
				);
				setDecisions(transformedDecisions);
				decisionsRef.current = transformedDecisions;

				const newPollVotes: Record<string, Record<string, string>> = {};
				for (const decision of transformedDecisions) {
					if (decision.type === "poll") {
						const currentRound = decision.current_round || 1;
						const votesResult = await getVotesForRound(decision.id, currentRound);

						if (votesResult.data) {
							const roundVotes: Record<string, string> = {};
							for (const vote of votesResult.data) {
								const userName =
									vote.user_id === userContext.userId
										? userContext.userName
										: userContext.partnerName || "Partner";
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
	}, [userContext]);

	loadDataRef.current = loadData;

	useEffect(() => {
		if (!userContext) {
			setLoading(false);
			return;
		}

		loadData();
	}, [userContext, loadData]);

	// Subscribe to decision changes and register refetch for reconnection
	useEffect(() => {
		if (!userContext) return;

		const unregisterRefetch = registerRefetch(() => loadDataRef.current());

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
						const updated = [...prev];
						updated[existingIndex] = {
							...updated[existingIndex],
							...updatedDecision,
							expanded: updated[existingIndex].expanded,
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
							options: (updatedDecision.options || []).map((option) => ({
								id: option.id,
								title: option.title,
								selected: false,
							})),
						};
						return updated;
					} else {
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
							options: (updatedDecision.options || []).map((option) => ({
								id: option.id,
								title: option.title,
								selected: false,
							})),
						};
						return [newUIDecision, ...prev];
					}
				});
			},
			(status) => {
				if (status === "CLOSED" || status === "CHANNEL_ERROR") {
					setReconnecting(true);
				} else if (status === "SUBSCRIBED") {
					setReconnecting(false);
					runRefetches();
				}
			},
		);

		return () => {
			unregisterRefetch();
			decisionSubscription.unsubscribe();
		};
	}, [userContext, registerRefetch, setReconnecting, runRefetches]);

	// Subscribe to vote changes for poll decisions (runs when decisions load or change)
	useEffect(() => {
		if (!userContext) return;

		const voteSubscriptions: ReturnType<typeof subscribeToVotes>[] = [];
		const pollDecisions = decisions.filter((d) => d.type === "poll");

		pollDecisions.forEach((decision) => {
			const sub = subscribeToVotes(decision.id, (votes) => {
				const roundVotes: Record<string, string> = {};
				votes.forEach((vote) => {
					const userName =
						vote.user_id === userContext.userId
							? userContext.userName
							: userContext.partnerName || "Partner";
					roundVotes[userName] = vote.option_id;
				});
				setPollVotes((prev) => ({ ...prev, [decision.id]: roundVotes }));
			});
			voteSubscriptions.push(sub);
		});

		return () => {
			voteSubscriptions.forEach((sub) => sub.unsubscribe());
		};
	}, [userContext, decisions]);

	// Keep decisionsRef in sync with decisions state
	useEffect(() => {
		decisionsRef.current = decisions;
	}, [decisions]);

	return {
		decisions,
		setDecisions,
		pollVotes,
		setPollVotes,
		loading,
		error,
		setError,
	};
}
