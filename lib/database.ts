// Database service for Supabase integration
// This file contains all database operations for the Duo app

import { supabase } from "@/config/supabase";
import type {
	Database,
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
			return { data: null, error: error.message };
		}

		return { data: vote as Vote, error: null };
	} catch (err) {
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
		const { data: vote, error } = await supabase
			.from("votes")
			.select("*")
			.eq("decision_id", decisionId)
			.eq("user_id", userId)
			.eq("round", round)
			.single();

		if (error && error.code !== "PGRST116") {
			return { data: null, error: error.message };
		}

		return { data: (vote || null) as Vote | null, error: null };
	} catch (err) {
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
	callback: (decision: DecisionWithOptions) => void,
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
				// Fetch the complete decision with options when it changes
				const decisionId = (payload.new as any)?.id || (payload.old as any)?.id;
				if (decisionId) {
					const result = await getDecisionById(decisionId);
					if (result.data) {
						callback(result.data);
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

	console.log("✅ Found user context:", { userId, coupleId: coupleResult.data.id, partnerId });
	return {
		userId,
		coupleId: coupleResult.data.id,
		partnerId,
	};
};
