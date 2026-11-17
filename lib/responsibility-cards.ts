// Responsibility cards (migration 025): every read and write the Cards tab
// makes. Kept out of lib/database.ts, which is already the largest file in
// the repo; the result types are that file's.

import { supabase } from "@/config/supabase";
import type { DatabaseListResult, DatabaseResult, RealtimeChannelStatus } from "@/lib/database";
import { STARTER_DECK, type CardCategory } from "@/lib/responsibility-deck";
import type { CardCompletion, ResponsibilityCard } from "@/types/database";

const TABLE = "responsibility_cards";
const DONE_TABLE = "responsibility_card_completions";

/** Shown when the app is ahead of the database (migrations 025 and 026 not applied). */
export const CARDS_NOT_READY = "Cards aren't ready yet. Try again after the next update.";

/**
 * The table is missing: Postgres's undefined_table (42P01), or PostgREST's
 * "not in the schema cache" (PGRST205). Lets the app ship before the
 * migration is applied and say something a person can read.
 */
export const isMissingCardsTable = (error: { code?: string; message?: string }): boolean =>
	error.code === "42P01" ||
	error.code === "PGRST205" ||
	/responsibility_card(s|_completions).*(does not exist|schema cache)/i.test(error.message ?? "");

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

/**
 * A day as the database stores it (`done_on`): the phone's own calendar day,
 * `YYYY-MM-DD`. Local on purpose. `toISOString` is UTC, and would file a job
 * done at 9pm in Denver under tomorrow.
 */
export const dayKey = (date: Date): string => {
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
};

/** The day `days` before `from`, as a `dayKey`. */
export const daysAgoKey = (days: number, from: Date = new Date()): string => {
	const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() - days);
	return dayKey(date);
};

/** A `dayKey` as a person says it: "Today", "Yesterday", or "Sat, Nov 14". */
export const describeDay = (key: string, today: Date = new Date()): string => {
	if (key === dayKey(today)) return "Today";
	if (key === daysAgoKey(1, today)) return "Yesterday";
	const [year, month, day] = key.split("-").map(Number);
	return new Date(year, month - 1, day).toLocaleDateString(undefined, {
		weekday: "short",
		month: "short",
		day: "numeric",
	});
};

/** How far back the Cards tab reads marks: enough for the card's own log. */
export const COMPLETION_WINDOW_DAYS = 30;

/** The couple's "done" marks since `sinceDay`, newest first. Taken-back marks are left out. */
export const getCardCompletions = async (
	coupleId: string,
	sinceDay: string = daysAgoKey(COMPLETION_WINDOW_DAYS),
): Promise<DatabaseListResult<CardCompletion>> => {
	try {
		const { data, error } = await supabase
			.from(DONE_TABLE)
			.select("*")
			.eq("couple_id", coupleId)
			.is("undone_at", null)
			.gte("done_on", sinceDay)
			.order("done_on", { ascending: false })
			.order("created_at", { ascending: false });

		if (error) return { data: null, error: message(error) };
		return { data: (data ?? []) as CardCompletion[], error: null };
	} catch (err) {
		return { data: null, error: thrown(err) };
	}
};

/**
 * Logs that `userId` did a card on `day` (today or earlier). Only the card's
 * holder may; the database refuses anyone else. A second mark for the same person,
 * card and day is refused by the database (23505) and reported as success
 * with no row: the mark is already there, which is what was asked for.
 */
export const markCardDone = async (mark: {
	cardId: string;
	coupleId: string;
	userId: string;
	day: string;
}): Promise<DatabaseResult<CardCompletion | null>> => {
	try {
		const { data, error } = await supabase
			.from(DONE_TABLE)
			.insert({
				card_id: mark.cardId,
				couple_id: mark.coupleId,
				done_by: mark.userId,
				done_on: mark.day,
			})
			.select()
			.single();

		if (error) {
			if (error.code === "23505") return { data: null, error: null };
			return { data: null, error: message(error) };
		}
		return { data: data as CardCompletion, error: null };
	} catch (err) {
		return { data: null, error: thrown(err) };
	}
};

/** Takes back `userId`'s mark on a card for `day`. Soft: the row stays. */
export const undoCardDone = async (mark: {
	cardId: string;
	userId: string;
	day: string;
}): Promise<DatabaseResult<boolean>> => {
	try {
		const { error } = await supabase
			.from(DONE_TABLE)
			.update({ undone_at: new Date().toISOString() })
			.eq("card_id", mark.cardId)
			.eq("done_by", mark.userId)
			.eq("done_on", mark.day)
			.is("undone_at", null);

		if (error) return { data: null, error: message(error) };
		return { data: true, error: null };
	} catch (err) {
		return { data: null, error: thrown(err) };
	}
};

/** Calls `onRefresh` whenever one of the couple's cards, or a mark on one, changes. */
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
		.on(
			"postgres_changes",
			{ event: "*", schema: "public", table: DONE_TABLE, filter: `couple_id=eq.${coupleId}` },
			() => onRefresh(),
		)
		.subscribe((status) => {
			statusCallback?.(status as RealtimeChannelStatus);
		});
