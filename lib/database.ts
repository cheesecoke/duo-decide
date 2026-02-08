// Database service for Supabase integration
// This file contains all database operations for the Duo app

import { supabase } from "@/config/supabase";
import type {
	Profile,
	Couple,
	CoupleInsert,
	DecisionInsert,
	DecisionWithOptions,
	DecisionOptionInsert,
	Vote,
	OptionListInsert,
	OptionListWithItems,
	UserContext,
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

export const invitePartner = async (
	userId: string,
	partnerEmail: string,
): Promise<DatabaseResult<Couple>> => {
	try {
		// Get the couple record for this user
		const coupleResult = await getCoupleByUserId(userId);
		if (coupleResult.error || !coupleResult.data) {
			return { data: null, error: coupleResult.error || "No couple found" };
		}

		// Get user's profile for their name
		const { data: profile, error: profileError } = await supabase
			.from("profiles")
			.select("display_name")
			.eq("id", userId)
			.single();

		if (profileError) {
			return { data: null, error: "Failed to get user profile" };
		}

		const inviterName = profile?.display_name || "Your partner";

		// Determine app URL (production or local)
		const appUrl = typeof window !== "undefined" ? window.location.origin : "https://duo-decide.com";

		// Send invitation email via Edge Function
		const { data: functionData, error: functionError } = await supabase.functions.invoke(
			"send-partner-invite",
			{
				body: {
					partnerEmail: partnerEmail.toLowerCase(),
					inviterName,
					appUrl,
				},
			},
		);

		if (functionError) {
			console.error("Edge function error:", functionError);
			return { data: null, error: "Failed to send invitation email" };
		}

		if (!functionData?.success) {
			console.error("Email send failed:", functionData);
			return { data: null, error: "Failed to send invitation email" };
		}

		// Update the couple record with the pending partner email
		const { data, error } = await supabase
			.from("couples")
			.update({ pending_partner_email: partnerEmail.toLowerCase() })
			.eq("id", coupleResult.data.id)
			.select()
			.single();

		if (error) {
			return { data: null, error: error.message };
		}

		return { data, error: null };
	} catch (err) {
		return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
	}
};

export const cancelPartnerInvitation = async (userId: string): Promise<DatabaseResult<Couple>> => {
	try {
		// Get the couple record for this user
		const coupleResult = await getCoupleByUserId(userId);
		if (coupleResult.error || !coupleResult.data) {
			return { data: null, error: coupleResult.error || "No couple found" };
		}

		// Clear the pending partner email
		const { data, error } = await supabase
			.from("couples")
			.update({ pending_partner_email: null })
			.eq("id", coupleResult.data.id)
			.select()
			.single();

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
	status?: "active" | "completed" | "pending" | "voted",
	options?: {
		limit?: number;
		offset?: number;
		/** For completed decisions, use 'decided_at' to show most recent first */
		orderBy?: "created_at" | "decided_at" | "updated_at";
		orderAscending?: boolean;
	},
): Promise<DatabaseListResult<DecisionWithOptions>> => {
	try {
		// First get all decisions for the couple
		let query = supabase.from("decisions").select("*").eq("couple_id", coupleId);

		// Filter by status if provided
		if (status) {
			query = query.eq("status", status);
		}

		// Apply pagination if provided
		if (options?.limit !== undefined) {
			if (options?.offset !== undefined) {
				// Use range for offset + limit
				query = query.range(options.offset, options.offset + options.limit - 1);
			} else {
				// Just limit
				query = query.limit(options.limit);
			}
		}

		const orderBy = options?.orderBy ?? "created_at";
		const ascending = options?.orderAscending ?? false;
		const { data: decisions, error: decisionsError } = await query.order(orderBy, {
			ascending,
			nullsFirst: false,
		});

		if (decisionsError) {
			return { data: null, error: decisionsError.message };
		}

		if (!decisions || decisions.length === 0) {
			return { data: [], error: null };
		}

		// Then get all options for these decisions
		const decisionIds = decisions.map((d) => d.id);
		const { data: decisionOptionsRows, error: optionsError } = await supabase
			.from("decision_options")
			.select("*")
			.in("decision_id", decisionIds);

		if (optionsError) {
			return { data: null, error: optionsError.message };
		}

		// Group options by decision_id
		const optionsByDecision = (decisionOptionsRows || []).reduce(
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

		// No filtering needed - each round gets fresh options based on previous votes
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
		const { error: decisionError } = await supabase
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
		// Get votes for this round
		const votesResult = await getVotesForRound(decisionId, round);
		if (votesResult.error) {
			return { data: null, error: votesResult.error };
		}

		const votes = votesResult.data || [];

		// Round 3: Only partner votes (creator is blocked), so 1 vote = complete
		if (round === 3) {
			const isComplete = votes.length >= 1;
			console.log(
				`🎯 Round 3 completion check: ${votes.length} vote(s) found = ${isComplete ? "COMPLETE" : "NOT COMPLETE"}`,
			);
			return { data: isComplete, error: null };
		}

		// Rounds 1 & 2: Both partners vote, so 2 votes = complete
		// Get both users in the couple
		const { data: couple, error: coupleError } = await supabase
			.from("couples")
			.select("*")
			.eq("id", coupleId)
			.single();

		if (coupleError) {
			return { data: null, error: coupleError.message };
		}

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
		console.log(`🔄 progressToNextRound: Starting for decision ${decisionId}, round ${currentRound}`);

		// Get votes for current round to see what was actually voted for
		const votesResult = await getVotesForRound(decisionId, currentRound);
		if (votesResult.error) {
			return { data: null, error: votesResult.error };
		}

		const votes = votesResult.data || [];
		console.log(`🔄 Found ${votes.length} votes for round ${currentRound}`);

		if (votes.length !== 2) {
			return { data: null, error: "Expected exactly 2 votes for round progression" };
		}

		// Get the two options that were voted for
		const votedOptionIds = votes.map((vote) => vote.option_id);
		const uniqueVotedOptions = [...new Set(votedOptionIds)];
		console.log(`🔄 Unique voted option IDs:`, uniqueVotedOptions);

		// Get the option details for the voted options
		const { data: votedOptions, error: optionsError } = await supabase
			.from("decision_options")
			.select("*")
			.in("id", uniqueVotedOptions as any);

		if (optionsError || !votedOptions) {
			return { data: null, error: optionsError?.message || "Failed to fetch voted options" };
		}

		console.log(
			`🔄 Voted options:`,
			votedOptions.map((o) => ({ id: o.id, title: o.title })),
		);

		if (votedOptions.length !== 2) {
			return {
				data: null,
				error: `Expected exactly 2 unique voted options, got ${votedOptions.length}`,
			};
		}

		// Delete all existing options for this decision
		console.log(`🔄 Deleting all existing options for decision ${decisionId}`);
		const { error: deleteError } = await supabase
			.from("decision_options")
			.delete()
			.eq("decision_id", decisionId);

		if (deleteError) {
			console.error("❌ Error deleting options:", deleteError);
			return { data: null, error: deleteError.message };
		}

		// Create new options for the next round with the voted options
		const newOptions = votedOptions.map((option) => ({
			decision_id: decisionId,
			title: option.title,
			votes: 0, // Reset vote count for new round
			eliminated_in_round: null, // No elimination in new round
		}));

		console.log(
			`🔄 Creating ${newOptions.length} new options:`,
			newOptions.map((o) => o.title),
		);

		const { error: insertError } = await supabase.from("decision_options").insert(newOptions);

		if (insertError) {
			console.error("❌ Error inserting new options:", insertError);
			return { data: null, error: insertError.message };
		}

		// Update decision to next round
		const nextRound = currentRound + 1;
		console.log(`🔄 Updating decision to round ${nextRound}`);

		await updateDecision(decisionId, {
			current_round: nextRound,
		} as any);

		console.log(`✅ Round progression complete! Now in round ${nextRound} with 2 options`);
		return { data: true, error: null };
	} catch (err) {
		console.error("❌ Error in progressToNextRound:", err);
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

// Helper function to get completed decisions for history page
export const getCompletedDecisions = async (
	coupleId: string,
	options?: { limit?: number; offset?: number },
): Promise<DatabaseListResult<DecisionWithOptions>> => {
	return getDecisionsByCouple(coupleId, "completed", {
		...options,
		orderBy: "decided_at",
		orderAscending: false,
	});
};

// Get total count of completed decisions for stats
export const getCompletedDecisionsCount = async (
	coupleId: string,
): Promise<DatabaseResult<number>> => {
	try {
		const { count, error } = await supabase
			.from("decisions")
			.select("*", { count: "exact", head: true })
			.eq("couple_id", coupleId)
			.eq("status", "completed");

		if (error) {
			return { data: null, error: error.message };
		}

		return { data: count ?? 0, error: null };
	} catch (err) {
		return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
	}
};

// Helper function to get active decisions for decision queue
// Returns ALL decisions (users manually delete when they want)
export const getActiveDecisions = async (
	coupleId: string,
): Promise<DatabaseListResult<DecisionWithOptions>> => {
	// Return all decisions - completed decisions stay visible until manually deleted
	return getDecisionsByCouple(coupleId);
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

export const updateOptionList = async (
	listId: string,
	listData: { title?: string; description?: string },
	items?: { id?: string; title: string }[],
): Promise<DatabaseResult<OptionListWithItems>> => {
	try {
		// Update list metadata
		const { error: listError } = await supabase
			.from("option_lists")
			.update(listData)
			.eq("id", listId);

		if (listError) {
			return { data: null, error: listError.message };
		}

		// Update items if provided
		if (items) {
			// Delete all existing items
			const { error: deleteError } = await supabase
				.from("option_list_items")
				.delete()
				.eq("option_list_id", listId);

			if (deleteError) {
				return { data: null, error: deleteError.message };
			}

			// Insert new items
			if (items.length > 0) {
				const itemsWithListId = items.map((item) => ({
					option_list_id: listId,
					title: item.title,
				}));

				const { error: itemsError } = await supabase.from("option_list_items").insert(itemsWithListId);

				if (itemsError) {
					return { data: null, error: itemsError.message };
				}
			}
		}

		// Fetch the updated list with items
		const { data: updatedList, error: fetchError } = await supabase
			.from("option_lists")
			.select(
				`
        *,
        option_list_items (*)
      `,
			)
			.eq("id", listId)
			.single();

		if (fetchError) {
			return { data: null, error: fetchError.message };
		}

		const transformedList = {
			...updatedList,
			items: updatedList.option_list_items || [],
		};

		return { data: transformedList, error: null };
	} catch (err) {
		return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
	}
};

export const deleteOptionList = async (listId: string): Promise<DatabaseResult<null>> => {
	try {
		const { error } = await supabase.from("option_lists").delete().eq("id", listId);

		if (error) {
			return { data: null, error: error.message };
		}

		return { data: null, error: null };
	} catch (err) {
		return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
	}
};

// Real-time subscriptions
export type RealtimeChannelStatus = "SUBSCRIBED" | "TIMED_OUT" | "CLOSED" | "CHANNEL_ERROR";

export const subscribeToDecisions = (
	coupleId: string,
	callback: (
		decision: DecisionWithOptions | null,
		eventType: "INSERT" | "UPDATE" | "DELETE",
	) => void,
	statusCallback?: (status: RealtimeChannelStatus) => void,
) => {
	const channel = supabase
		.channel(`decisions_${coupleId}`)
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
		.subscribe((status) => {
			statusCallback?.(status as RealtimeChannelStatus);
		});
	return channel;
};

export const subscribeToVotes = (
	decisionId: string,
	callback: (votes: Vote[]) => void,
	statusCallback?: (status: RealtimeChannelStatus) => void,
) => {
	const channel = supabase
		.channel(`votes_${decisionId}`)
		.on(
			"postgres_changes",
			{
				event: "*",
				schema: "public",
				table: "votes",
				filter: `decision_id=eq.${decisionId}`,
			},
			async () => {
				// Get the current round for this decision
				const decisionResult = await getDecisionById(decisionId);
				if (decisionResult.data) {
					const currentRound = decisionResult.data.current_round || 1;

					// Fetch votes for the current round only
					const result = await getVotesForDecision(decisionId, currentRound);
					if (result.data) {
						callback(result.data);
					}
				}
			},
		)
		.subscribe((status) => {
			statusCallback?.(status as RealtimeChannelStatus);
		});
	return channel;
};

/**
 * Subscribe to option_lists and option_list_items for a couple.
 * Calls onRefresh when lists or items change so the UI can refetch.
 * Note: option_lists and option_list_items must be in supabase_realtime publication for events to be received.
 */
export const subscribeToOptionLists = (
	coupleId: string,
	onRefresh: () => void,
	statusCallback?: (status: RealtimeChannelStatus) => void,
) => {
	const channel = supabase
		.channel(`option_lists_${coupleId}`)
		.on(
			"postgres_changes",
			{
				event: "*",
				schema: "public",
				table: "option_lists",
				filter: `couple_id=eq.${coupleId}`,
			},
			() => {
				onRefresh();
			},
		)
		.on(
			"postgres_changes",
			{
				event: "*",
				schema: "public",
				table: "option_list_items",
			},
			() => {
				// Refetch lists; RLS ensures we only get our couple's data
				onRefresh();
			},
		)
		.subscribe((status) => {
			statusCallback?.(status as RealtimeChannelStatus);
		});
	return channel;
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

	// Check if partner is pending (null partner ID)
	if (!partnerId) {
		console.log("⚠️ Partner is pending (not yet signed up)");

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
		}

		const userName =
			userProfileResult.data.display_name || userProfileResult.data.email.split("@")[0];

		return {
			userId,
			userName,
			coupleId: coupleResult.data.id,
			partnerId: null,
			partnerName: null,
			pendingPartnerEmail: coupleResult.data.pending_partner_email || null,
		};
	}

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

	// Fetch partner profile
	let partnerProfileResult = await getProfileById(partnerId);
	if (!partnerProfileResult.data) {
		console.log("⚠️ No profile found for partner:", partnerId);
		console.log("⚠️ Partner may have been deleted - treating as pending");

		// Return context without partner info to allow user to continue
		const userName =
			userProfileResult.data.display_name || userProfileResult.data.email.split("@")[0];

		return {
			userId,
			userName,
			coupleId: coupleResult.data.id,
			partnerId: null,
			partnerName: null,
			pendingPartnerEmail: coupleResult.data.pending_partner_email || null,
		};
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
		pendingPartnerEmail: coupleResult.data.pending_partner_email || null,
	};
};
