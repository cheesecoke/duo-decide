// Responsibility cards (migration 025): every read and write the Cards tab
// makes. Kept out of lib/database.ts, which is already the largest file in
// the repo; the result types are that file's.

import { supabase } from "@/config/supabase";
import type { DatabaseListResult, DatabaseResult, RealtimeChannelStatus } from "@/lib/database";
import { STARTER_DECK, type CardCategory } from "@/lib/responsibility-deck";
import type { ResponsibilityCard } from "@/types/database";

const TABLE = "responsibility_cards";

/** Shown when the app is ahead of the database (migration 025 not applied). */
export const CARDS_NOT_READY = "Cards aren't ready yet. Try again after the next update.";

/**
 * The table is missing: Postgres's undefined_table (42P01), or PostgREST's
 * "not in the schema cache" (PGRST205). Lets the app ship before the
 * migration is applied and say something a person can read.
 */
export const isMissingCardsTable = (error: { code?: string; message?: string }): boolean =>
	error.code === "42P01" ||
	error.code === "PGRST205" ||
	/responsibility_cards.*(does not exist|schema cache)/i.test(error.message ?? "");

const message = (error: { code?: string; message?: string }): string =>
	isMissingCardsTable(error) ? CARDS_NOT_READY : (error.message ?? "Unknown error");

const thrown = (err: unknown): string => (err instanceof Error ? err.message : "Unknown error");

/** The couple's cards, oldest first. Removed cards are left out. */
export const getResponsibilityCards = async (
	coupleId: string,
): Promise<DatabaseListResult<ResponsibilityCard>> => {
	try {
		const { data, error } = await supabase
			.from(TABLE)
			.select("*")
			.eq("couple_id", coupleId)
			.is("removed_at", null)
			.order("created_at", { ascending: true })
			.order("id", { ascending: true });

		if (error) return { data: null, error: message(error) };
		return { data: (data ?? []) as ResponsibilityCard[], error: null };
	} catch (err) {
		return { data: null, error: thrown(err) };
	}
};

/**
 * Adds the starter deck. Safe to call twice, and safe for both partners to
 * call at once: `deck_key` is unique per couple, so a card that is already
 * there, or that the couple removed, is skipped.
 */
export const addStarterDeck = async (
	coupleId: string,
	userId: string,
): Promise<DatabaseResult<boolean>> => {
	try {
		const { error } = await supabase.from(TABLE).upsert(
			STARTER_DECK.map((card) => ({
				couple_id: coupleId,
				title: card.title,
				category: card.category,
				daily: card.daily,
				deck_key: card.key,
				created_by: userId,
			})),
			{ onConflict: "couple_id,deck_key", ignoreDuplicates: true },
		);

		if (error) return { data: null, error: message(error) };
		return { data: true, error: null };
	} catch (err) {
		return { data: null, error: thrown(err) };
	}
};

/** A card the couple wrote themselves. It starts not dealt unless a holder is given. */
export const createResponsibilityCard = async (card: {
	coupleId: string;
	userId: string;
	title: string;
	category: CardCategory;
	daily: boolean;
	holderId: string | null;
}): Promise<DatabaseResult<ResponsibilityCard>> => {
	try {
		const { data, error } = await supabase
			.from(TABLE)
			.insert({
				couple_id: card.coupleId,
				title: card.title.trim(),
				category: card.category,
				daily: card.daily,
				holder_id: card.holderId,
				created_by: card.userId,
			})
			.select()
			.single();

		if (error) return { data: null, error: message(error) };
		return { data: data as ResponsibilityCard, error: null };
	} catch (err) {
		return { data: null, error: thrown(err) };
	}
};

/** Deals the card to one partner, or back to nobody (`null`). */
export const setCardHolder = async (
	cardId: string,
	holderId: string | null,
): Promise<DatabaseResult<ResponsibilityCard>> => {
	try {
		const { data, error } = await supabase
			.from(TABLE)
			.update({ holder_id: holderId })
			.eq("id", cardId)
			.select()
			.single();

		if (error) return { data: null, error: message(error) };
		return { data: data as ResponsibilityCard, error: null };
	} catch (err) {
		return { data: null, error: thrown(err) };
	}
};

/** Soft delete: the row stays with `removed_at` set, and no read returns it. */
export const removeResponsibilityCard = async (
	cardId: string,
	userId: string,
): Promise<DatabaseResult<boolean>> => {
	try {
		const { error } = await supabase
			.from(TABLE)
			.update({ removed_at: new Date().toISOString(), removed_by: userId })
			.eq("id", cardId);

		if (error) return { data: null, error: message(error) };
		return { data: true, error: null };
	} catch (err) {
		return { data: null, error: thrown(err) };
	}
};

/** Calls `onRefresh` whenever one of the couple's cards changes. */
export const subscribeToResponsibilityCards = (
	coupleId: string,
	onRefresh: () => void,
	statusCallback?: (status: RealtimeChannelStatus) => void,
) =>
	supabase
		.channel(`responsibility_cards_${coupleId}`)
		.on(
			"postgres_changes",
			{ event: "*", schema: "public", table: TABLE, filter: `couple_id=eq.${coupleId}` },
			() => onRefresh(),
		)
		.subscribe((status) => {
			statusCallback?.(status as RealtimeChannelStatus);
		});
