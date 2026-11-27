// Calendar adds (migration 028): who put a decided decision on a calendar.
// Every read and write of `decision_calendar_adds`, kept out of
// lib/database.ts for the reason lib/responsibility-cards.ts is; the result
// types are that file's.
//
// One row per (decision, person). A row moves opened → added → removed and
// back again; it is never deleted, and the writes below are upserts on
// (decision_id, added_by), so "add it again" reuses the row.
//
// What the card should *say* about a pair of rows is lib/calendar-add-view.ts
// (pure, re-exported here). Who the rows belong to, live, is
// context/calendar-adds-provider.tsx.

import { supabase } from "@/config/supabase";
import type { DatabaseListResult, DatabaseResult, RealtimeChannelStatus } from "@/lib/database";
import type { CalendarAdd, CalendarAddMethod, CalendarAddState } from "@/types/database";

export {
	OPENED_STALE_MS,
	calendarAddView,
	type CalendarAddRow,
	type CalendarAddView,
} from "@/lib/calendar-add-view";
export type { CalendarAdd, CalendarAddMethod, CalendarAddState };

const TABLE = "decision_calendar_adds";
const ONE_ROW_EACH = "decision_id,added_by";

/** Shown when the app is ahead of the database (migration 028 not applied). */
export const CALENDAR_NOT_READY =
	"Adding to a calendar isn't ready yet. Try again after the next update.";

/**
 * The table is missing: Postgres's undefined_table (42P01), or PostgREST's
 * "not in the schema cache" (PGRST205). Lets the app ship before the
 * migration is applied and say something a person can read.
 */
export const isMissingCalendarTable = (error: { code?: string; message?: string }): boolean =>
	error.code === "42P01" ||
	error.code === "PGRST205" ||
	/decision_calendar_adds.*(does not exist|schema cache)/i.test(error.message ?? "");

const message = (error: { code?: string; message?: string }): string =>
	isMissingCalendarTable(error) ? CALENDAR_NOT_READY : (error.message ?? "Unknown error");

const thrown = (err: unknown): string => (err instanceof Error ? err.message : "Unknown error");

/** Whose add, on which decision. */
export interface CalendarAddTarget {
	decisionId: string;
	coupleId: string;
	userId: string;
}

/** How it was handed off, and what was handed off. */
export interface CalendarAddDetails {
	method: CalendarAddMethod;
	/** `eventSnapshot` of the decision's prefill (lib/calendar-link.ts). */
	snapshot: string;
}

/**
 * The couple's calendar rows, oldest first. Taken-back rows are left out:
 * to the app a `removed` row is no row. (RLS still shows them, so that
 * Realtime can deliver the removal.)
 */
export const fetchCalendarAdds = async (
	coupleId: string,
): Promise<DatabaseListResult<CalendarAdd>> => {
	try {
		const { data, error } = await supabase
			.from(TABLE)
			.select("*")
			.eq("couple_id", coupleId)
			.neq("state", "removed")
			.order("created_at", { ascending: true });

		if (error) return { data: null, error: message(error) };
		return { data: (data ?? []) as CalendarAdd[], error: null };
	} catch (err) {
		return { data: null, error: thrown(err) };
	}
};

const upsert = async (
	target: CalendarAddTarget,
	details: CalendarAddDetails,
	state: Exclude<CalendarAddState, "removed">,
	confirmed: boolean,
	externalEventId: string | null,
): Promise<DatabaseResult<CalendarAdd>> => {
	try {
		const { data, error } = await supabase
			.from(TABLE)
			.upsert(
				{
					decision_id: target.decisionId,
					couple_id: target.coupleId,
					added_by: target.userId,
					method: details.method,
					state,
					confirmed,
					external_event_id: externalEventId,
					snapshot: details.snapshot,
				},
				{ onConflict: ONE_ROW_EACH },
			)
			.select()
			.single();

		if (error) return { data: null, error: message(error) };
		return { data: data as CalendarAdd, error: null };
	} catch (err) {
		return { data: null, error: thrown(err) };
	}
};

/**
 * "I am handing this off to a calendar now." Written *before* the calendar
 * opens, so the partner's card holds its button back for the next ten
 * minutes (`OPENED_STALE_MS`). Not yet confirmed: a link cannot report back.
 */
export const markOpened = (
	target: CalendarAddTarget,
	details: CalendarAddDetails,
): Promise<DatabaseResult<CalendarAdd>> => upsert(target, details, "opened", false, null);

/**
 * "It is on the calendar." `confirmed` is true by default, for a person's
 * "Yes, added"; pass `false` to record an add nobody vouched for.
 * `externalEventId` is the system sheet's or the API's id, when there is one.
 */
export const markAdded = (
	target: CalendarAddTarget,
	details: CalendarAddDetails & { confirmed?: boolean; externalEventId?: string | null },
): Promise<DatabaseResult<CalendarAdd>> =>
	upsert(target, details, "added", details.confirmed ?? true, details.externalEventId ?? null);

/**
 * "Not added after all" (an unanswered hand-off, or "Mark as not added").
 * Soft: the row stays with `state = 'removed'`. Resolves with the row, or
 * `null` when there was none to take back, which is not an error.
 */
export const markRemoved = async (
	target: Pick<CalendarAddTarget, "decisionId" | "userId">,
): Promise<DatabaseResult<CalendarAdd | null>> => {
	try {
		const { data, error } = await supabase
			.from(TABLE)
			.update({ state: "removed", confirmed: false })
			.eq("decision_id", target.decisionId)
			.eq("added_by", target.userId)
			.select()
			.maybeSingle();

		if (error) return { data: null, error: message(error) };
		return { data: (data as CalendarAdd | null) ?? null, error: null };
	} catch (err) {
		return { data: null, error: thrown(err) };
	}
};

/**
 * Calls `onChange` with each of the couple's calendar rows as it is written,
 * `removed` ones included (that is how a removal arrives). The row is the
 * whole row: the table is REPLICA IDENTITY FULL.
 */
export const subscribeToCalendarAdds = (
	coupleId: string,
	onChange: (row: CalendarAdd, eventType: "INSERT" | "UPDATE" | "DELETE") => void,
	statusCallback?: (status: RealtimeChannelStatus) => void,
) =>
	supabase
		.channel(`decision_calendar_adds_${coupleId}`)
		.on(
			"postgres_changes",
			{ event: "*", schema: "public", table: TABLE, filter: `couple_id=eq.${coupleId}` },
			(payload) => {
				const eventType = payload.eventType as "INSERT" | "UPDATE" | "DELETE";
				const row = (eventType === "DELETE" ? payload.old : payload.new) as CalendarAdd | undefined;
				if (row?.id) onChange(row, eventType);
			},
		)
		.subscribe((status) => {
			statusCallback?.(status as RealtimeChannelStatus);
		});
