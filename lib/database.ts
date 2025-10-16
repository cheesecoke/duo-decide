// Database service for Supabase integration
// This file contains all database operations for the Duo app

import { supabase } from "@/config/supabase";
import type {
	Database,
	Profile,
	ProfileInsert,
	ProfileUpdate,
	Couple,
	CoupleInsert,
	Decision,
	DecisionInsert,
	DecisionUpdate,
	DecisionWithOptions,
	DecisionWithVotes,
	DecisionOption,
	DecisionOptionInsert,
	Vote,
	VoteInsert,
	OptionList,
	OptionListInsert,
	OptionListWithItems,
	UserContext,
	PollRound,
	PollDecision,
} from "@/types/database";

// Database operation result types
export interface DatabaseResult<T> {
	data: T | null;
	error: string | null;
}

export interface DatabaseListResult<T> {
	data: T[] | null;
	error: string | null;
}

// Profile management
export const getProfileById = async (userId: string): Promise<DatabaseResult<Profile>> => {
	try {
		const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();

		if (error) {
			return { data: null, error: error.message };
		}

		return { data, error: null };
	} catch (err) {
		return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
	}
};

export const getProfilesByCouple = async (
	coupleId: string,
): Promise<DatabaseListResult<Profile>> => {
	try {
		const { data, error } = await supabase.from("profiles").select("*").eq("couple_id", coupleId);

		if (error) {
			return { data: null, error: error.message };
		}

		return { data: data || [], error: null };
	} catch (err) {
		return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
	}
};

// User and couple management
export const getCoupleByUserId = async (userId: string): Promise<DatabaseResult<Couple>> => {
	try {
		const { data, error } = await supabase
			.from("couples")
			.select("*")
			.or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
			.limit(1);

		if (error) {
			return { data: null, error: error.message };
		}

		if (!data || data.length === 0) {
			return { data: null, error: "No couple found" };
		}

		return { data: data[0], error: null };
	} catch (err) {
		return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
	}
};

export const createCouple = async (coupleData: CoupleInsert): Promise<DatabaseResult<Couple>> => {
	try {
		const { data, error } = await supabase.from("couples").insert(coupleData).select().single();

		if (error) {
			return { data: null, error: error.message };
		}

		return { data, error: null };
	} catch (err) {
		return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
	}
};

// Decision management
export const getDecisionsByCouple = async (
	coupleId: string,
): Promise<DatabaseListResult<DecisionWithOptions>> => {
	try {
		// First get all decisions for the couple
		const { data: decisions, error: decisionsError } = await supabase
			.from("decisions")
			.select("*")
			.eq("couple_id", coupleId)
			.order("created_at", { ascending: false });

		if (decisionsError) {
			return { data: null, error: decisionsError.message };
		}

		if (!decisions || decisions.length === 0) {
			return { data: [], error: null };
		}

		// Then get all options for these decisions
		const decisionIds = decisions.map((d) => d.id);
		const { data: options, error: optionsError } = await supabase
			.from("decision_options")
			.select("*")
			.in("decision_id", decisionIds);

		if (optionsError) {
			return { data: null, error: optionsError.message };
		}

		// Group options by decision_id
		const optionsByDecision = (options || []).reduce(
			(acc, option) => {
				if (!acc[option.decision_id]) {
					acc[option.decision_id] = [];
				}
				acc[option.decision_id].push(option);
				return acc;
			},
			{} as Record<string, any[]>,
		);

		// Transform the data to match our expected format
		const transformedDecisions = decisions.map((decision) => ({
			...decision,
			options: optionsByDecision[decision.id] || [],
		}));

		return { data: transformedDecisions, error: null };
	} catch (err) {
		return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
	}
};

export const getDecisionById = async (
	decisionId: string,
): Promise<DatabaseResult<DecisionWithOptions>> => {
	try {
		// First get the decision
		const { data: decision, error: decisionError } = await supabase
			.from("decisions")
			.select("*")
			.eq("id", decisionId)
			.single();

		if (decisionError) {
			return { data: null, error: decisionError.message };
		}

		// Then get the options for this decision
		const { data: options, error: optionsError } = await supabase
			.from("decision_options")
			.select("*")
			.eq("decision_id", decisionId);

		if (optionsError) {
			return { data: null, error: optionsError.message };
		}

		const transformedDecision = {
			...decision,
			options: options || [],
		};

		return { data: transformedDecision, error: null };
	} catch (err) {
		return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
	}
};

export const createDecision = async (
	decisionData: DecisionInsert,
	options: DecisionOptionInsert[],
): Promise<DatabaseResult<DecisionWithOptions>> => {
	try {
		// Start a transaction-like operation
		const { data: decision, error: decisionError } = await supabase
			.from("decisions")
			.insert(decisionData)
			.select()
			.single();

		if (decisionError) {
			return { data: null, error: decisionError.message };
		}

		// Insert options
		if (options.length > 0) {
			const optionsWithDecisionId = options.map((option) => ({
				...option,
				decision_id: decision.id,
			}));

			const { error: optionsError } = await supabase
				.from("decision_options")
				.insert(optionsWithDecisionId);

			if (optionsError) {
				// Clean up the decision if options insertion failed
				await supabase.from("decisions").delete().eq("id", decision.id);
				return { data: null, error: optionsError.message };
			}
		}

		// Fetch the complete decision with options
		const result = await getDecisionById(decision.id);
		return result;
	} catch (err) {
		return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
	}
};

export const updateDecision = async (
	decisionId: string,
	updates: Partial<DecisionInsert>,
): Promise<DatabaseResult<DecisionWithOptions>> => {
	try {
		// Update the decision
		const { data: updatedDecision, error: decisionError } = await supabase
			.from("decisions")
			.update(updates)
			.eq("id", decisionId)
			.select()
			.single();

		if (decisionError) {
			return { data: null, error: decisionError.message };
		}

		// Get the updated decision with options
		const result = await getDecisionById(decisionId);
		return result;
	} catch (err) {
		return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
	}
};

// Voting functions
export const recordVote = async (
	decisionId: string,
	optionId: string,
	userId: string,
	round: number = 1,
): Promise<DatabaseResult<Vote>> => {
	try {
		// Check if a vote already exists for this user, decision, and round
		const existingVoteResult = await getUserVoteForDecision(decisionId, userId, round);

		// If there was an error checking for existing vote, return it
		if (existingVoteResult.error) {
			return { data: null, error: existingVoteResult.error };
		}

		if (existingVoteResult.data) {
			// Vote exists, update it
			const { data: updatedVote, error } = await supabase
				.from("votes")
				.update({ option_id: optionId })
				.eq("id", existingVoteResult.data.id)
				.select()
				.single();

			if (error) {
				return { data: null, error: error.message };
			}

			return { data: updatedVote as Vote, error: null };
		} else {
			// Vote doesn't exist, create it
			const { data: vote, error } = await supabase
				.from("votes")
				.insert({
					decision_id: decisionId,
					option_id: optionId,
					user_id: userId,
					round: round,
				} as any)
				.select()
				.single();

			if (error) {
				console.error("❌ Error inserting vote:", error);
				return { data: null, error: error.message };
			}

			return { data: vote as Vote, error: null };
		}
	} catch (err) {
		console.error("❌ Error in recordVote:", err);
		return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
	}
};

export const getVotesForDecision = async (
	decisionId: string,
	round?: number,
): Promise<DatabaseListResult<Vote>> => {
	try {
		let query = supabase.from("votes").select("*").eq("decision_id", decisionId);

		if (round !== undefined) {
			query = query.eq("round", round);
		}

		const { data: votes, error } = await query.order("created_at", { ascending: false });

		if (error) {
			return { data: null, error: error.message };
		}

		return { data: (votes || []) as Vote[], error: null };
	} catch (err) {
		return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
	}
};

export const getUserVoteForDecision = async (
	decisionId: string,
	userId: string,
	round: number = 1,
): Promise<DatabaseResult<Vote>> => {
	try {
		console.log("🔍 getUserVoteForDecision:", { decisionId, userId, round });
		const { data: vote, error } = await supabase
			.from("votes")
			.select("*")
			.eq("decision_id", decisionId)
			.eq("user_id", userId)
			.eq("round", round)
			.maybeSingle();

		if (error) {
			console.error("❌ getUserVoteForDecision error:", error);
			return { data: null, error: error.message };
		}

		console.log("✅ getUserVoteForDecision result:", vote ? "vote found" : "no vote");
		return { data: (vote || null) as Vote | null, error: null };
	} catch (err) {
		console.error("❌ getUserVoteForDecision exception:", err);
		return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
	}
};

export const deleteDecision = async (decisionId: string): Promise<DatabaseResult<boolean>> => {
	try {
		// Delete options first (foreign key constraint)
		const { error: optionsError } = await supabase
			.from("decision_options")
			.delete()
			.eq("decision_id", decisionId);

		if (optionsError) {
			return { data: null, error: optionsError.message };
		}

		// Delete votes
		const { error: votesError } = await supabase.from("votes").delete().eq("decision_id", decisionId);

		if (votesError) {
			return { data: null, error: votesError.message };
		}

		// Delete decision
		const { error: decisionError } = await supabase.from("decisions").delete().eq("id", decisionId);

		if (decisionError) {
			return { data: null, error: decisionError.message };
		}

		return { data: true, error: null };
	} catch (err) {
		return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
	}
};

// Voting system

export const getVotesForRound = async (
	decisionId: string,
	round: number,
): Promise<DatabaseListResult<Vote>> => {
	try {
		const { data, error } = await supabase
			.from("votes")
			.select("*")
			.eq("decision_id", decisionId)
			.eq("round", round);

		if (error) {
			return { data: null, error: error.message };
		}

		return { data: data || [], error: null };
	} catch (err) {
		return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
	}
};

// Vote counting and round progression
export const getVoteCountsForDecision = async (
	decisionId: string,
	round: number,
): Promise<DatabaseResult<Record<string, number>>> => {
	try {
		const votesResult = await getVotesForRound(decisionId, round);
		if (votesResult.error) {
			return { data: null, error: votesResult.error };
		}

		const votes = votesResult.data || [];
		const voteCounts: Record<string, number> = {};

		votes.forEach((vote) => {
			voteCounts[vote.option_id] = (voteCounts[vote.option_id] || 0) + 1;
		});

		return { data: voteCounts, error: null };
	} catch (err) {
		return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
	}
};

export const checkRoundCompletion = async (
	decisionId: string,
	round: number,
	coupleId: string,
): Promise<DatabaseResult<boolean>> => {
	try {
		// Get both users in the couple
		const { data: couple, error: coupleError } = await supabase
			.from("couples")
			.select("*")
			.eq("id", coupleId)
			.single();

		if (coupleError) {
			return { data: null, error: coupleError.message };
		}

		// Get votes for this round
		const votesResult = await getVotesForRound(decisionId, round);
		if (votesResult.error) {
			return { data: null, error: votesResult.error };
		}

		const votes = votesResult.data || [];
		const voterIds = new Set(votes.map((v) => v.user_id));

		// Check if both partners have voted
		const bothVoted = voterIds.has(couple.user1_id) && voterIds.has(couple.user2_id);

		return { data: bothVoted, error: null };
	} catch (err) {
		return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
	}
};

export const progressToNextRound = async (
	decisionId: string,
	currentRound: number,
): Promise<DatabaseResult<boolean>> => {
	try {
		// Get current decision with options
		const decisionResult = await getDecisionById(decisionId);
		if (decisionResult.error || !decisionResult.data) {
			return { data: null, error: decisionResult.error || "Decision not found" };
		}

		const decision = decisionResult.data;

		// Get vote counts for current round
		const voteCountsResult = await getVoteCountsForDecision(decisionId, currentRound);
		if (voteCountsResult.error) {
			return { data: null, error: voteCountsResult.error };
		}

		const voteCounts = voteCountsResult.data || {};

		// Get active options (not eliminated)
		const activeOptions = decision.options.filter((opt) => !opt.eliminated_in_round);

		// Sort options by vote count
		const sortedOptions = activeOptions
			.map((opt) => ({
				...opt,
				voteCount: voteCounts[opt.id] || 0,
			}))
			.sort((a, b) => b.voteCount - a.voteCount);

		let optionsToKeep: typeof sortedOptions = [];
		let optionsToEliminate: typeof sortedOptions = [];

		if (currentRound === 1) {
			// Round 1 -> Round 2: Keep top 50%
			const keepCount = Math.ceil(sortedOptions.length / 2);
			optionsToKeep = sortedOptions.slice(0, keepCount);
			optionsToEliminate = sortedOptions.slice(keepCount);
		} else if (currentRound === 2) {
			// Round 2 -> Round 3: Keep top 2
			optionsToKeep = sortedOptions.slice(0, 2);
			optionsToEliminate = sortedOptions.slice(2);
		}

		// Mark eliminated options
		for (const option of optionsToEliminate) {
			await supabase
				.from("decision_options")
				.update({ eliminated_in_round: currentRound })
				.eq("id", option.id);
		}

		// Update decision to next round
		const nextRound = currentRound + 1;
		await updateDecision(decisionId, {
			current_round: nextRound,
		} as any);

		return { data: true, error: null };
	} catch (err) {
		return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
	}
};

// Decision completion
export const completeDecision = async (
	decisionId: string,
	finalOptionId: string,
	decidedBy: string,
): Promise<DatabaseResult<DecisionWithOptions>> => {
	try {
		const result = await updateDecision(decisionId, {
			status: "completed",
			decided_by: decidedBy,
			decided_at: new Date().toISOString(),
			final_decision: finalOptionId,
		});

		return result;
	} catch (err) {
		return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
	}
};

// Option lists management
export const getOptionListsByCouple = async (
	coupleId: string,
): Promise<DatabaseListResult<OptionListWithItems>> => {
	try {
		const { data, error } = await supabase
			.from("option_lists")
			.select(
				`
        *,
        option_list_items (*)
      `,
			)
			.eq("couple_id", coupleId)
			.order("created_at", { ascending: false });

		if (error) {
			return { data: null, error: error.message };
		}

		// Transform the data
		const transformedLists =
			data?.map((list) => ({
				...list,
				items: list.option_list_items || [],
			})) || [];

		return { data: transformedLists, error: null };
	} catch (err) {
		return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
	}
};

export const createOptionList = async (
	listData: OptionListInsert,
	items: { title: string }[],
): Promise<DatabaseResult<OptionListWithItems>> => {
	try {
		const { data: list, error: listError } = await supabase
			.from("option_lists")
			.insert(listData)
			.select()
			.single();

		if (listError) {
			return { data: null, error: listError.message };
		}

		// Insert items
		if (items.length > 0) {
			const itemsWithListId = items.map((item) => ({
				option_list_id: list.id,
				title: item.title,
			}));

			const { error: itemsError } = await supabase.from("option_list_items").insert(itemsWithListId);

			if (itemsError) {
				// Clean up the list if items insertion failed
				await supabase.from("option_lists").delete().eq("id", list.id);
				return { data: null, error: itemsError.message };
			}
		}

		// Fetch the complete list with items
		const { data: completeList, error: fetchError } = await supabase
			.from("option_lists")
			.select(
				`
        *,
        option_list_items (*)
      `,
			)
			.eq("id", list.id)
			.single();

		if (fetchError) {
			return { data: null, error: fetchError.message };
		}

		const transformedList = {
			...completeList,
			items: completeList.option_list_items || [],
		};

		return { data: transformedList, error: null };
	} catch (err) {
		return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
	}
};

// Real-time subscriptions
export const subscribeToDecisions = (
	coupleId: string,
	callback: (
		decision: DecisionWithOptions | null,
		eventType: "INSERT" | "UPDATE" | "DELETE",
	) => void,
) => {
	return supabase
		.channel("decisions_changes")
		.on(
			"postgres_changes",
			{
				event: "*",
				schema: "public",
				table: "decisions",
				filter: `couple_id=eq.${coupleId}`,
			},
			async (payload) => {
				const eventType = payload.eventType as "INSERT" | "UPDATE" | "DELETE";
				const decisionId = (payload.new as any)?.id || (payload.old as any)?.id;

				if (eventType === "DELETE") {
					// For DELETE events, pass null decision with the ID from old
					callback({ id: decisionId } as any, eventType);
				} else if (decisionId) {
					// For INSERT and UPDATE, fetch the complete decision
					const result = await getDecisionById(decisionId);
					if (result.data) {
						callback(result.data, eventType);
					}
				}
			},
		)
		.subscribe();
};

export const subscribeToVotes = (decisionId: string, callback: (votes: Vote[]) => void) => {
	return supabase
		.channel("votes_changes")
		.on(
			"postgres_changes",
			{
				event: "*",
				schema: "public",
				table: "votes",
				filter: `decision_id=eq.${decisionId}`,
			},
			async () => {
				// Fetch all votes for the decision when votes change
				const result = await getVotesForDecision(decisionId);
				if (result.data) {
					callback(result.data);
				}
			},
		)
		.subscribe();
};

// Helper functions
export const getCurrentUser = async (): Promise<string | null> => {
	const {
		data: { user },
	} = await supabase.auth.getUser();
	console.log("🔍 getCurrentUser called, user:", user?.id || "null");
	return user?.id || null;
};

export const getUserContext = async (): Promise<UserContext | null> => {
	console.log("🔍 getUserContext called");
	const userId = await getCurrentUser();
	if (!userId) {
		console.log("❌ No user ID found");
		return null;
	}

	console.log("🔍 Looking for couple for user:", userId);
	const coupleResult = await getCoupleByUserId(userId);
	if (!coupleResult.data) {
		console.log("❌ No couple found for user:", userId);
		return null;
	}

	const partnerId =
		coupleResult.data.user1_id === userId ? coupleResult.data.user2_id : coupleResult.data.user1_id;

	// Fetch user profile - create if doesn't exist
	let userProfileResult = await getProfileById(userId);
	if (!userProfileResult.data) {
		console.log("⚠️ No profile found for user:", userId, "- attempting to create");

		// Get user email from auth
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user || !user.email) {
			console.log("❌ Cannot create profile - no email found");
			return null;
		}

		// Create profile
		const { error: createError } = await supabase.from("profiles").insert({
			id: userId,
			email: user.email,
			couple_id: coupleResult.data.id,
		});

		if (createError) {
			console.log("❌ Failed to create profile:", createError.message);
			return null;
		}

		// Fetch the newly created profile
		userProfileResult = await getProfileById(userId);
		if (!userProfileResult.data) {
			console.log("❌ Failed to fetch newly created profile");
			return null;
		}
		console.log("✅ Profile created successfully");
	}

	// Fetch partner profile - create if doesn't exist
	let partnerProfileResult = await getProfileById(partnerId);
	if (!partnerProfileResult.data) {
		console.log("⚠️ No profile found for partner:", partnerId);
		// Partner profile should exist, but we can't create it without their email
		// This is a data integrity issue that should be fixed in the database
		return null;
	}

	const userName = userProfileResult.data.display_name || userProfileResult.data.email.split("@")[0];
	const partnerName =
		partnerProfileResult.data.display_name || partnerProfileResult.data.email.split("@")[0];

	console.log("✅ Found user context:", {
		userId,
		userName,
		coupleId: coupleResult.data.id,
		partnerId,
		partnerName,
	});
	return {
		userId,
		userName,
		coupleId: coupleResult.data.id,
		partnerId,
		partnerName,
	};
};
