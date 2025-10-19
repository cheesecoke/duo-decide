// Database types for Supabase integration
// These interfaces match the database schema for the Duo app

export interface Database {
	public: {
		Tables: {
			profiles: {
				Row: {
					id: string;
					email: string;
					display_name: string | null;
					avatar_url: string | null;
					couple_id: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id: string;
					email: string;
					display_name?: string | null;
					avatar_url?: string | null;
					couple_id?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					email?: string;
					display_name?: string | null;
					avatar_url?: string | null;
					couple_id?: string | null;
					created_at?: string;
					updated_at?: string;
				};
			};
			couples: {
				Row: {
					id: string;
					user1_id: string;
					user2_id: string;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					user1_id: string;
					user2_id: string;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					user1_id?: string;
					user2_id?: string;
					created_at?: string;
					updated_at?: string;
				};
			};
			decisions: {
				Row: {
					id: string;
					title: string;
					description: string | null;
					deadline: string | null;
					creator_id: string;
					partner_id: string;
					couple_id: string;
					type: "vote" | "poll";
					status: "pending" | "voted" | "completed";
					current_round: number;
					decided_by: string | null;
					decided_at: string | null;
					final_decision: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					title: string;
					description?: string | null;
					deadline?: string | null;
					creator_id: string;
					partner_id: string;
					couple_id: string;
					type: "vote" | "poll";
					status?: "pending" | "voted" | "completed";
					current_round?: number;
					decided_by?: string | null;
					decided_at?: string | null;
					final_decision?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					title?: string;
					description?: string | null;
					deadline?: string | null;
					creator_id?: string;
					partner_id?: string;
					couple_id?: string;
					type?: "vote" | "poll";
					status?: "pending" | "voted" | "completed";
					current_round?: number;
					decided_by?: string | null;
					decided_at?: string | null;
					final_decision?: string | null;
					created_at?: string;
					updated_at?: string;
				};
			};
			decision_options: {
				Row: {
					id: string;
					decision_id: string;
					title: string;
					votes: number;
					eliminated_in_round: number | null;
					created_at: string;
				};
				Insert: {
					id?: string;
					decision_id: string;
					title: string;
					votes?: number;
					eliminated_in_round?: number | null;
					created_at?: string;
				};
				Update: {
					id?: string;
					decision_id?: string;
					title?: string;
					votes?: number;
					eliminated_in_round?: number | null;
					created_at?: string;
				};
			};
			votes: {
				Row: {
					id: string;
					decision_id: string;
					user_id: string;
					option_id: string;
					round: number;
					created_at: string;
				};
				Insert: {
					id?: string;
					decision_id: string;
					user_id: string;
					option_id: string;
					round: number;
					created_at?: string;
				};
				Update: {
					id?: string;
					decision_id?: string;
					user_id?: string;
					option_id?: string;
					round?: number;
					created_at?: string;
				};
			};
			option_lists: {
				Row: {
					id: string;
					title: string;
					description: string;
					couple_id: string;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					title: string;
					description: string;
					couple_id: string;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					title?: string;
					description?: string;
					couple_id?: string;
					created_at?: string;
					updated_at?: string;
				};
			};
			option_list_items: {
				Row: {
					id: string;
					option_list_id: string;
					title: string;
					created_at: string;
				};
				Insert: {
					id?: string;
					option_list_id: string;
					title: string;
					created_at?: string;
				};
				Update: {
					id?: string;
					option_list_id?: string;
					title?: string;
					created_at?: string;
				};
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			[_ in never]: never;
		};
		Enums: {
			[_ in never]: never;
		};
	};
}

// Type aliases for easier use
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type Couple = Database["public"]["Tables"]["couples"]["Row"];
export type CoupleInsert = Database["public"]["Tables"]["couples"]["Insert"];
export type CoupleUpdate = Database["public"]["Tables"]["couples"]["Update"];

export type Decision = Database["public"]["Tables"]["decisions"]["Row"];
export type DecisionInsert = Database["public"]["Tables"]["decisions"]["Insert"];
export type DecisionUpdate = Database["public"]["Tables"]["decisions"]["Update"];

export type DecisionOption = Database["public"]["Tables"]["decision_options"]["Row"];
export type DecisionOptionInsert = Database["public"]["Tables"]["decision_options"]["Insert"];
export type DecisionOptionUpdate = Database["public"]["Tables"]["decision_options"]["Update"];

export type Vote = Database["public"]["Tables"]["votes"]["Row"];
export type VoteInsert = Database["public"]["Tables"]["votes"]["Insert"];
export type VoteUpdate = Database["public"]["Tables"]["votes"]["Update"];

export type OptionList = Database["public"]["Tables"]["option_lists"]["Row"];
export type OptionListInsert = Database["public"]["Tables"]["option_lists"]["Insert"];
export type OptionListUpdate = Database["public"]["Tables"]["option_lists"]["Update"];

export type OptionListItem = Database["public"]["Tables"]["option_list_items"]["Row"];
export type OptionListItemInsert = Database["public"]["Tables"]["option_list_items"]["Insert"];
export type OptionListItemUpdate = Database["public"]["Tables"]["option_list_items"]["Update"];

// Extended types for frontend use (combining related data)
export interface DecisionWithOptions extends Decision {
	options: DecisionOption[];
}

export interface DecisionWithVotes extends DecisionWithOptions {
	votes: Vote[];
}

export interface OptionListWithItems extends OptionList {
	items: OptionListItem[];
}

// User context types
export interface UserContext {
	userId: string;
	userName: string;
	coupleId: string;
	partnerId: string | null;
	partnerName: string | null;
	pendingPartnerEmail?: string | null;
}

// Poll-specific types
export interface PollRound {
	round: number;
	options: DecisionOption[];
	votes: Vote[];
	completed: boolean;
}

export interface PollDecision extends Decision {
	type: "poll";
	current_round: number;
	rounds: {
		round1: PollRound;
		round2?: PollRound;
		round3?: PollRound;
	};
}
