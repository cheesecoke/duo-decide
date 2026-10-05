// Supabase-shaped database types for the Duo app.
//
// Hand-maintained to match the shape of `supabase gen types typescript` output
// (Tables with Row/Insert/Update/Relationships, plus Views/Functions/Enums/
// CompositeTypes) so supabase-js can infer query result types. Derived from
// supabase/migrations/*.sql, plus the legacy schema.sql tables/columns the app
// still queries (option_list_items, decision_options.votes, couples.updated_at).
// Keep in sync with the migrations when the schema changes.
//
// Convenience aliases (Profile, Decision, ...) live in ./aliases and are
// re-exported below so existing `@/types/database` imports keep working.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	public: {
		Tables: {
			couples: {
				Row: {
					id: string;
					user1_id: string;
					user2_id: string | null;
					pending_partner_email: string | null;
					created_at: string | null;
					updated_at: string | null;
				};
				Insert: {
					id?: string;
					user1_id: string;
					user2_id?: string | null;
					pending_partner_email?: string | null;
					created_at?: string | null;
					updated_at?: string | null;
				};
				Update: {
					id?: string;
					user1_id?: string;
					user2_id?: string | null;
					pending_partner_email?: string | null;
					created_at?: string | null;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "couples_user1_id_fkey";
						columns: ["user1_id"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "couples_user2_id_fkey";
						columns: ["user2_id"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
				];
			};
			decision_options: {
				Row: {
					id: string;
					decision_id: string;
					title: string;
					votes: number | null;
					eliminated_in_round: number | null;
					created_at: string | null;
				};
				Insert: {
					id?: string;
					decision_id: string;
					title: string;
					votes?: number | null;
					eliminated_in_round?: number | null;
					created_at?: string | null;
				};
				Update: {
					id?: string;
					decision_id?: string;
					title?: string;
					votes?: number | null;
					eliminated_in_round?: number | null;
					created_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "decision_options_decision_id_fkey";
						columns: ["decision_id"];
						isOneToOne: false;
						referencedRelation: "decisions";
						referencedColumns: ["id"];
					},
				];
			};
			decisions: {
				Row: {
					id: string;
					couple_id: string;
					/** NULL once the creator deleted their account ("Former partner"). */
					creator_id: string | null;
					/** NULL once the partner deleted their account ("Former partner"). */
					partner_id: string | null;
					title: string;
					description: string | null;
					deadline: string | null;
					type: "vote" | "poll";
					status: "pending" | "voted" | "completed";
					current_round: number | null;
					decided_by: string | null;
					decided_at: string | null;
					final_decision: string | null;
					created_at: string | null;
					updated_at: string | null;
				};
				Insert: {
					id?: string;
					couple_id: string;
					creator_id: string;
					partner_id: string;
					title: string;
					description?: string | null;
					deadline?: string | null;
					type: "vote" | "poll";
					status?: "pending" | "voted" | "completed";
					current_round?: number | null;
					decided_by?: string | null;
					decided_at?: string | null;
					final_decision?: string | null;
					created_at?: string | null;
					updated_at?: string | null;
				};
				Update: {
					id?: string;
					couple_id?: string;
					creator_id?: string;
					partner_id?: string;
					title?: string;
					description?: string | null;
					deadline?: string | null;
					type?: "vote" | "poll";
					status?: "pending" | "voted" | "completed";
					current_round?: number | null;
					decided_by?: string | null;
					decided_at?: string | null;
					final_decision?: string | null;
					created_at?: string | null;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "decisions_couple_id_fkey";
						columns: ["couple_id"];
						isOneToOne: false;
						referencedRelation: "couples";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "decisions_creator_id_fkey";
						columns: ["creator_id"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "decisions_decided_by_fkey";
						columns: ["decided_by"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "decisions_final_decision_fkey";
						columns: ["final_decision"];
						isOneToOne: false;
						referencedRelation: "decision_options";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "decisions_partner_id_fkey";
						columns: ["partner_id"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
				];
			};
			list_options: {
				Row: {
					id: string;
					list_id: string;
					title: string;
					created_at: string | null;
				};
				Insert: {
					id?: string;
					list_id: string;
					title: string;
					created_at?: string | null;
				};
				Update: {
					id?: string;
					list_id?: string;
					title?: string;
					created_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "list_options_list_id_fkey";
						columns: ["list_id"];
						isOneToOne: false;
						referencedRelation: "option_lists";
						referencedColumns: ["id"];
					},
				];
			};
			option_list_items: {
				Row: {
					id: string;
					option_list_id: string;
					title: string;
					created_at: string | null;
				};
				Insert: {
					id?: string;
					option_list_id: string;
					title: string;
					created_at?: string | null;
				};
				Update: {
					id?: string;
					option_list_id?: string;
					title?: string;
					created_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "option_list_items_option_list_id_fkey";
						columns: ["option_list_id"];
						isOneToOne: false;
						referencedRelation: "option_lists";
						referencedColumns: ["id"];
					},
				];
			};
			option_lists: {
				Row: {
					id: string;
					couple_id: string;
					creator_id: string | null;
					title: string;
					description: string | null;
					created_at: string | null;
					updated_at: string | null;
				};
				Insert: {
					id?: string;
					couple_id: string;
					creator_id?: string | null;
					title: string;
					description?: string | null;
					created_at?: string | null;
					updated_at?: string | null;
				};
				Update: {
					id?: string;
					couple_id?: string;
					creator_id?: string | null;
					title?: string;
					description?: string | null;
					created_at?: string | null;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "option_lists_couple_id_fkey";
						columns: ["couple_id"];
						isOneToOne: false;
						referencedRelation: "couples";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "option_lists_creator_id_fkey";
						columns: ["creator_id"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
				];
			};
			profiles: {
				Row: {
					id: string;
					email: string;
					display_name: string | null;
					avatar_url: string | null;
					couple_id: string | null;
					created_at: string | null;
					updated_at: string | null;
				};
				Insert: {
					id: string;
					email: string;
					display_name?: string | null;
					avatar_url?: string | null;
					couple_id?: string | null;
					created_at?: string | null;
					updated_at?: string | null;
				};
				Update: {
					id?: string;
					email?: string;
					display_name?: string | null;
					avatar_url?: string | null;
					couple_id?: string | null;
					created_at?: string | null;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "fk_profiles_couple";
						columns: ["couple_id"];
						isOneToOne: false;
						referencedRelation: "couples";
						referencedColumns: ["id"];
					},
				];
			};
			votes: {
				Row: {
					id: string;
					decision_id: string;
					user_id: string;
					option_id: string;
					round: number;
					created_at: string | null;
				};
				Insert: {
					id?: string;
					decision_id: string;
					user_id: string;
					option_id: string;
					round: number;
					created_at?: string | null;
				};
				Update: {
					id?: string;
					decision_id?: string;
					user_id?: string;
					option_id?: string;
					round?: number;
					created_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "votes_decision_id_fkey";
						columns: ["decision_id"];
						isOneToOne: false;
						referencedRelation: "decisions";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "votes_option_id_fkey";
						columns: ["option_id"];
						isOneToOne: false;
						referencedRelation: "decision_options";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "votes_user_id_fkey";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
				];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			delete_my_account: {
				Args: Record<PropertyKey, never>;
				Returns: undefined;
			};
			cleanup_orphaned_decisions: {
				Args: { p_user_id?: string };
				Returns: {
					deleted_count: number;
					message: string;
				}[];
			};
			get_couple_info: {
				Args: { p_user_id?: string };
				Returns: {
					couple_id: string;
					decision_count: number;
					orphaned_count: number;
					partner_email: string;
					partner_id: string;
					partner_name: string;
					pending_email: string;
					user_email: string;
					user_id: string;
					user_name: string;
				}[];
			};
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

export * from "./aliases";
