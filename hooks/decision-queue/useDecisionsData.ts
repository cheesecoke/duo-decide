import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
	const userContextRef = useRef<UserContext | null>(userContext);
	userContextRef.current = userContext;
	const { setReconnecting, registerRefetch, runRefetches } = useRealtimeStatus();

	// Stable keys so effects don't re-run when provider re-renders and passes new object reference
	const userId = userContext?.userId ?? null;
	const coupleId = userContext?.coupleId ?? null;

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
		// When completed, show the winning option as selected for both partners (creator has no Round 3 vote)
		const completedWinningOptionId =
			decision.status === "completed" && decision.final_decision ? decision.final_decision : null;

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
				selected: option.id === userVotedOptionId || option.id === completedWinningOptionId,
			})),
		};
	};

	// Stable ref for refetch so reconnection can trigger reload
	const loadDataRef = useRef<() => Promise<void>>(async () => {});

	// Initial data load - depends on stable userId/coupleId to avoid max update depth
	// (userContext object is new every provider re-render; we read latest via ref inside)
	const loadData = useCallback(async () => {
		const ctx = userContextRef.current;
		if (!ctx) return;

		setLoading(true);
		setError(null);

		try {
			const decisionsResult = await getActiveDecisions(ctx.coupleId);

			if (decisionsResult.error) {
				setError(decisionsResult.error);
			} else {
				const transformedDecisions = await Promise.all(
					(decisionsResult.data || []).map((d) => transformDecision(d, ctx)),
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
								const userName = vote.user_id === ctx.userId ? ctx.userName : ctx.partnerName || "Partner";
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
	}, []);

	loadDataRef.current = loadData;

	useEffect(() => {
		if (!userId || !coupleId) {
			setLoading(false);
			return;
		}

		loadData();
	}, [userId, coupleId, loadData]);

	// Subscribe to decision changes and register refetch for reconnection
	useEffect(() => {
		if (!coupleId) return;

		const unregisterRefetch = registerRefetch(() => loadDataRef.current());

		const decisionSubscription = subscribeToDecisions(
			coupleId,
			async (updatedDecision, eventType) => {
				const ctx = userContextRef.current;

				// Handle DELETE events synchronously
				if (eventType === "DELETE") {
					setDecisions((prev) => prev.filter((d) => d.id !== updatedDecision?.id));
					return;
				}

				if (!updatedDecision || !ctx) return;

				// For in-progress decisions, fetch user's vote to preserve selected state
				// (mirrors transformDecision behavior during initial load)
				let userVotedOptionId: string | null = null;
				if (updatedDecision.status !== "completed") {
					const voteResult = await getUserVoteForDecision(
						updatedDecision.id,
						ctx.userId,
						updatedDecision.current_round ?? 1,
					);
					userVotedOptionId = voteResult.data?.option_id ?? null;
				}

				setDecisions((prev) => {
					const existingIndex = prev.findIndex((d) => d.id === updatedDecision.id);

					const completedWinningId =
						updatedDecision.status === "completed" && updatedDecision.final_decision
							? updatedDecision.final_decision
							: null;

					if (existingIndex >= 0) {
						const updated = [...prev];
						updated[existingIndex] = {
							...updated[existingIndex],
							...updatedDecision,
							expanded: updated[existingIndex].expanded,
							createdBy:
								updatedDecision.creator_id === ctx.userId ? ctx.userName : ctx.partnerName || "Partner",
							details: updatedDecision.description || "",
							decidedBy: updatedDecision.decided_by
								? updatedDecision.decided_by === ctx.userId
									? ctx.userName
									: ctx.partnerName || "Partner"
								: undefined,
							decidedAt: updatedDecision.decided_at || undefined,
							options: (updatedDecision.options || []).map((option) => ({
								id: option.id,
								title: option.title,
								selected: completedWinningId
									? option.id === completedWinningId
									: option.id === userVotedOptionId,
							})),
						};
						return updated;
					} else {
						const newUIDecision: UIDecision = {
							...updatedDecision,
							expanded: false,
							createdBy:
								updatedDecision.creator_id === ctx.userId ? ctx.userName : ctx.partnerName || "Partner",
							details: updatedDecision.description || "",
							decidedBy: updatedDecision.decided_by
								? updatedDecision.decided_by === ctx.userId
									? ctx.userName
									: ctx.partnerName || "Partner"
								: undefined,
							decidedAt: updatedDecision.decided_at || undefined,
							options: (updatedDecision.options || []).map((option) => ({
								id: option.id,
								title: option.title,
								selected: completedWinningId
									? option.id === completedWinningId
									: option.id === userVotedOptionId,
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
	}, [coupleId, registerRefetch, setReconnecting, runRefetches]);

	// Stable list of poll decision IDs to avoid recreating subscriptions on every decision update
	const pollDecisionIds = useMemo(
		() => decisions.filter((d) => d.type === "poll").map((d) => d.id),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[decisions.map((d) => d.id).join(",")],
	);

	// Subscribe to vote changes for poll decisions (only recreates when poll IDs change)
	useEffect(() => {
		if (!userId) return;

		const voteSubscriptions: ReturnType<typeof subscribeToVotes>[] = [];

		pollDecisionIds.forEach((decisionId) => {
			const sub = subscribeToVotes(decisionId, (votes) => {
				const ctx = userContextRef.current;
				if (!ctx) return;
				const roundVotes: Record<string, string> = {};
				votes.forEach((vote) => {
					const userName = vote.user_id === ctx.userId ? ctx.userName : ctx.partnerName || "Partner";
					roundVotes[userName] = vote.option_id;
				});
				setPollVotes((prev) => ({ ...prev, [decisionId]: roundVotes }));
			});
			voteSubscriptions.push(sub);
		});

		return () => {
			voteSubscriptions.forEach((sub) => sub.unsubscribe());
		};
	}, [userId, pollDecisionIds]);

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
