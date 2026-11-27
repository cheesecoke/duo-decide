import React, {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";

import { useRealtimeStatus } from "@/context/realtime-status-context";
import {
	fetchCalendarAdds,
	markAdded as writeAdded,
	markOpened as writeOpened,
	markRemoved as writeRemoved,
	subscribeToCalendarAdds,
	type CalendarAdd,
	type CalendarAddDetails,
} from "@/lib/calendar-adds";

/** One decision's two rows. A taken-back (`removed`) row is `null` here. */
export interface DecisionCalendarAdds {
	/** The signed-in user's row. */
	mine: CalendarAdd | null;
	/**
	 * The partner's row. Also a row whose `added_by` is `null`: a former
	 * partner who added it and then deleted their account.
	 */
	partner: CalendarAdd | null;
}

interface CalendarAddsContextType {
	/** True until the first fetch for a couple settles. Never raised again. */
	loading: boolean;
	error: string | null;
	/** Every decision that has a live row, by decision id. */
	byDecision: Record<string, DecisionCalendarAdds>;
	/** One decision's rows. Always an object; both `null` when there are none. */
	addsFor: (decisionId: string) => DecisionCalendarAdds;
	/** "I am handing this off now." Call before opening the calendar. True when it was saved. */
	markOpened: (decisionId: string, details: CalendarAddDetails) => Promise<boolean>;
	/** "It is on the calendar." `confirmed` defaults to true. True when it was saved. */
	markAdded: (
		decisionId: string,
		details: CalendarAddDetails & { confirmed?: boolean; externalEventId?: string | null },
	) => Promise<boolean>;
	/** "Not added after all." True when it was saved. */
	markRemoved: (decisionId: string) => Promise<boolean>;
}

const NO_ADDS: DecisionCalendarAdds = Object.freeze({ mine: null, partner: null });

const PENDING = "pending-";

const isPending = (row: CalendarAdd): boolean => row.id.startsWith(PENDING);

/** Same person's row for the same decision (the table's unique key). */
const sameSlot = (a: CalendarAdd, b: CalendarAdd): boolean =>
	a.id === b.id || (a.decision_id === b.decision_id && a.added_by === b.added_by);

/**
 * `incoming` put into `rows` in place of whatever was in its slot. A
 * `removed` row empties the slot. With `onlyIfNewer`, a row that is older
 * than the one already held is ignored (Realtime can deliver out of order);
 * an optimistic row is always replaceable, because its timestamp is this
 * phone's clock, not the server's.
 */
function withRow(rows: CalendarAdd[], incoming: CalendarAdd, onlyIfNewer = false): CalendarAdd[] {
	const held = rows.find((row) => sameSlot(row, incoming));
	if (onlyIfNewer && held && !isPending(held) && held.updated_at > incoming.updated_at) return rows;

	const rest = rows.filter((row) => !sameSlot(row, incoming));
	return incoming.state === "removed" ? rest : [...rest, incoming];
}

const CalendarAddsContext = createContext<CalendarAddsContextType | undefined>(undefined);

/**
 * Who has put which decision on a calendar, kept live for both partners.
 *
 * Same contract as `ResponsibilityCardsProvider`: `loading` is a
 * **first-load** flag, so a later fetch (a reconnect) never tears the queue
 * down under someone.
 *
 * The three writes are optimistic: the card changes at once and is put back
 * if the write fails. `markOpened` in particular runs in the same tap that
 * opens Google Calendar, and the app is in the background a moment later.
 *
 * Unlike the cards, a realtime change is **patched in**, not refetched: the
 * payload is the whole row (REPLICA IDENTITY FULL), and "Steph is adding this
 * now" should appear as fast as it can.
 *
 * A database without migration 028 is not an error state for the screen:
 * `error` is set, everything reads as "nobody has added anything", and the
 * writes resolve `false`.
 */
export function CalendarAddsProvider({
	children,
	coupleId,
	userId,
}: {
	children: ReactNode;
	coupleId: string | null;
	userId: string | null;
}) {
	const [rows, setRows] = useState<CalendarAdd[]>([]);
	const [loading, setLoading] = useState(coupleId != null);
	const [error, setError] = useState<string | null>(null);
	const { setReconnecting } = useRealtimeStatus();
	const refreshRef = useRef<() => Promise<void>>(async () => {});
	/** The channel dropped and has not come back yet. */
	const droppedRef = useRef(false);
	const firstFetchStartedFor = useRef<string | null>(null);
	/** The rows as last rendered, for the optimistic writes below. */
	const rowsRef = useRef<CalendarAdd[]>([]);
	rowsRef.current = rows;

	const loadAdds = useCallback(async () => {
		if (!coupleId) {
			firstFetchStartedFor.current = null;
			setRows([]);
			setLoading(false);
			return;
		}

		const isFirstFetch = firstFetchStartedFor.current !== coupleId;
		if (isFirstFetch) {
			firstFetchStartedFor.current = coupleId;
			setLoading(true);
		}

		try {
			const result = await fetchCalendarAdds(coupleId);
			setError(result.error);
			if (!result.error) {
				const fetched = result.data ?? [];
				// A write still in flight is not in the fetch yet: keep it.
				setRows((prev) => [
					...fetched.filter((row) => !prev.some((held) => isPending(held) && sameSlot(held, row))),
					...prev.filter(isPending),
				]);
			}
		} catch (err) {
			console.error("Error loading calendar adds:", err);
			setError("Failed to load calendar adds");
		} finally {
			if (isFirstFetch) setLoading(false);
		}
	}, [coupleId]);

	refreshRef.current = loadAdds;

	useEffect(() => {
		void loadAdds();
	}, [loadAdds]);

	useEffect(() => {
		if (!coupleId) return;

		droppedRef.current = false;

		const channel = subscribeToCalendarAdds(
			coupleId,
			(row, eventType) => {
				setRows((prev) =>
					eventType === "DELETE" ? prev.filter((held) => held.id !== row.id) : withRow(prev, row, true),
				);
			},
			(status) => {
				if (status === "CLOSED" || status === "CHANNEL_ERROR") {
					droppedRef.current = true;
					setReconnecting(true);
				} else if (status === "SUBSCRIBED") {
					setReconnecting(false);
					// Rows written while the channel was down were never
					// delivered: read them. Done here rather than through
					// `registerRefetch` / `runRefetches`, which only runs while
					// the shared `reconnecting` flag is still up, and the line
					// above has just lowered it.
					if (droppedRef.current) {
						droppedRef.current = false;
						void refreshRef.current();
					}
				}
			},
		);

		return () => {
			void channel.unsubscribe();
		};
	}, [coupleId, setReconnecting]);

	/** Shared by markOpened and markAdded: show it, write it, swap in the saved row or put it back. */
	const write = useCallback(
		async (
			decisionId: string,
			state: "opened" | "added",
			details: CalendarAddDetails & { confirmed?: boolean; externalEventId?: string | null },
		): Promise<boolean> => {
			if (!coupleId || !userId) return false;
			setError(null);

			const before =
				rowsRef.current.find((row) => row.decision_id === decisionId && row.added_by === userId) ??
				null;
			const stamp = new Date().toISOString();
			const optimistic: CalendarAdd = {
				id: `${PENDING}${decisionId}`,
				decision_id: decisionId,
				couple_id: coupleId,
				added_by: userId,
				method: details.method,
				state,
				confirmed: state === "added" ? (details.confirmed ?? true) : false,
				external_event_id: state === "added" ? (details.externalEventId ?? null) : null,
				snapshot: details.snapshot,
				created_at: before?.created_at ?? stamp,
				updated_at: stamp,
			};
			setRows((prev) => withRow(prev, optimistic));

			const target = { decisionId, coupleId, userId };
			const result =
				state === "opened" ? await writeOpened(target, details) : await writeAdded(target, details);

			if (result.error || !result.data) {
				setError(result.error ?? "Failed to save");
				// Back to how it was, unless something newer has landed since.
				setRows((prev) => {
					if (!prev.some((row) => row.id === optimistic.id)) return prev;
					const rest = prev.filter((row) => row.id !== optimistic.id);
					return before ? [...rest, before] : rest;
				});
				return false;
			}

			const saved = result.data;
			setRows((prev) => withRow(prev, saved));
			return true;
		},
		[coupleId, userId],
	);

	const markOpened = useCallback(
		(decisionId: string, details: CalendarAddDetails) => write(decisionId, "opened", details),
		[write],
	);

	const markAdded = useCallback(
		(
			decisionId: string,
			details: CalendarAddDetails & { confirmed?: boolean; externalEventId?: string | null },
		) => write(decisionId, "added", details),
		[write],
	);

	const markRemoved = useCallback(
		async (decisionId: string): Promise<boolean> => {
			if (!userId) return false;
			setError(null);

			setRows((prev) =>
				prev.filter((row) => !(row.decision_id === decisionId && row.added_by === userId)),
			);

			const result = await writeRemoved({ decisionId, userId });
			if (result.error) {
				// Simplest correct recovery: read the truth back. The error is
				// set after, because a successful read clears it.
				await loadAdds();
				setError(result.error);
				return false;
			}
			return true;
		},
		[userId, loadAdds],
	);

	const byDecision = useMemo(() => {
		const map: Record<string, DecisionCalendarAdds> = {};
		for (const row of rows) {
			if (row.state === "removed") continue;
			const entry = (map[row.decision_id] ??= { mine: null, partner: null });
			if (userId != null && row.added_by === userId) entry.mine = row;
			// Two nameless rows can only be two former partners; the newest wins.
			else if (!entry.partner || entry.partner.updated_at < row.updated_at) entry.partner = row;
		}
		return map;
	}, [rows, userId]);

	const addsFor = useCallback(
		(decisionId: string): DecisionCalendarAdds => byDecision[decisionId] ?? NO_ADDS,
		[byDecision],
	);

	const value = useMemo<CalendarAddsContextType>(
		() => ({ loading, error, byDecision, addsFor, markOpened, markAdded, markRemoved }),
		[loading, error, byDecision, addsFor, markOpened, markAdded, markRemoved],
	);

	return <CalendarAddsContext.Provider value={value}>{children}</CalendarAddsContext.Provider>;
}

export function useCalendarAdds() {
	const context = useContext(CalendarAddsContext);
	if (context === undefined) {
		throw new Error("useCalendarAdds must be used within a CalendarAddsProvider");
	}
	return context;
}

export type { CalendarAddsContextType };
