// Convenience aliases over the Supabase-shaped `Database` type, plus
// frontend-only composite types. Re-exported from ./database.
import type { Database } from "./database";

type Tables = Database["public"]["Tables"];

export type Profile = Tables["profiles"]["Row"];
export type ProfileInsert = Tables["profiles"]["Insert"];
export type ProfileUpdate = Tables["profiles"]["Update"];

export type Couple = Tables["couples"]["Row"];
export type CoupleInsert = Tables["couples"]["Insert"];
export type CoupleUpdate = Tables["couples"]["Update"];

export type Decision = Tables["decisions"]["Row"];
export type DecisionInsert = Tables["decisions"]["Insert"];
export type DecisionUpdate = Tables["decisions"]["Update"];

export type DecisionOption = Tables["decision_options"]["Row"];
export type DecisionOptionInsert = Tables["decision_options"]["Insert"];
export type DecisionOptionUpdate = Tables["decision_options"]["Update"];

export type Vote = Tables["votes"]["Row"];
export type VoteInsert = Tables["votes"]["Insert"];
export type VoteUpdate = Tables["votes"]["Update"];

export type OptionList = Tables["option_lists"]["Row"];
export type OptionListInsert = Tables["option_lists"]["Insert"];
export type OptionListUpdate = Tables["option_lists"]["Update"];

export type OptionListItem = Tables["option_list_items"]["Row"];
export type OptionListItemInsert = Tables["option_list_items"]["Insert"];
export type OptionListItemUpdate = Tables["option_list_items"]["Update"];

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
