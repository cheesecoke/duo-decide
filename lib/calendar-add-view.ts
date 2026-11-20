/**
 * calendar-add-view — the two partners' calendar rows for one decision, as
 * the one thing the decided card should say about them.
 *
 * Each partner has at most one row per decision (migration 027,
 * `decision_calendar_adds`), in one of three states. That is nine
 * combinations plus a clock, and the card should not be the place that works
 * them out. `calendarAddView` does, and returns a discriminated union the
 * card switches on:
 *
 * | kind              | what happened                               | the card                          |
 * | ----------------- | ------------------------------------------- | --------------------------------- |
 * | `none`            | nobody has started                          | the Add to calendar button         |
 * | `mine-opened`     | I handed off and have not said if it saved  | "Did it save?  Yes · Not yet"      |
 * | `partner-opening` | partner handed off under ten minutes ago    | "Steph is adding this now"         |
 * | `partner-started` | partner handed off longer ago, never said   | the button again (a quiet note)    |
 * | `mine-added`      | I added it                                  | "You added it to the calendar"     |
 * | `partner-added`   | partner added it                            | "Steph added it…", **no button**   |
 * | `both-added`      | each added it to their own calendar         | "You both added it…"               |
 *
 * ## Which one wins
 *
 * - An `added` beats an `opened`, whoever's it is. If my partner has added
 *   it while my own hand-off sits unanswered, the card says it is handled:
 *   "Did it save?" no longer matters, and asking it invites a duplicate.
 * - My own `opened` beats my partner's: the question is mine to answer.
 * - A `removed` row is the same as no row.
 *
 * ## The ten minutes
 *
 * A partner's unfinished hand-off holds the button back so the event does
 * not land on the shared calendar twice. It stops after `OPENED_STALE_MS`
 * (they closed the tab, changed their mind), measured from the row's
 * `updated_at`. That stamp is the *server's* clock and `now` is the phone's,
 * so a phone running behind sees the row as from the future; that counts as
 * fresh. A stamp that cannot be read counts as stale: never block on garbage.
 *
 * My own `opened` never goes stale: the question waits on the card until I
 * answer it.
 *
 * ## `changed`
 *
 * True when a row that is `added` was added with different details from the
 * decision's now (`row.snapshot !== currentSnapshot`): "the details changed
 * since this was added". Only when `currentSnapshot` is given, and only for
 * the added kinds. It is judged on my row when I have one, since that is the
 * one I can add again.
 *
 * Pure: `now` comes in as an argument, and nothing here imports Supabase.
 * Table-tested in __tests__/lib/calendar-add-view.test.ts.
 */

import type { CalendarAdd } from "@/types/database";

/** How long a partner's unfinished hand-off holds the button back. */
export const OPENED_STALE_MS = 10 * 60 * 1000;

/** The fields of a row the view reads. A whole `CalendarAdd` fits. */
export type CalendarAddRow = Pick<
	CalendarAdd,
	"state" | "method" | "confirmed" | "snapshot" | "updated_at"
>;

type Method = CalendarAdd["method"];

export type CalendarAddView =
	| { kind: "none"; changed: false }
	| {
			kind: "mine-opened";
			/** When I handed off (ISO, the row's `updated_at`). */
			openedAt: string;
			method: Method;
			changed: false;
	  }
	| {
			kind: "partner-opening";
			/** When the partner handed off. */
			openedAt: string;
			/** When this stops holding the button back, as ms since the epoch. */
			staleAt: number;
			method: Method;
			changed: false;
	  }
	| {
			kind: "partner-started";
			openedAt: string;
			method: Method;
			changed: false;
	  }
	| {
			kind: "mine-added";
			/** When I added it (ISO, the row's `updated_at`). */
			addedAt: string;
			method: Method;
			/** A person, the system sheet or the API said it saved. */
			confirmed: boolean;
			changed: boolean;
	  }
	| {
			kind: "partner-added";
			addedAt: string;
			method: Method;
			confirmed: boolean;
			changed: boolean;
	  }
	| {
			kind: "both-added";
			/** When I added it. */
			addedAt: string;
			/** When the partner added it. */
			partnerAddedAt: string;
			method: Method;
			partnerMethod: Method;
			confirmed: boolean;
			changed: boolean;
	  };

const NONE: CalendarAddView = { kind: "none", changed: false };

/** A row that still counts: there, and not taken back. */
const live = (row: CalendarAddRow | null | undefined): CalendarAddRow | null =>
	row && row.state !== "removed" ? row : null;

/**
 * What the card should say about the calendar.
 *
 * @param mine            The viewer's row for this decision, if any.
 * @param partner         The partner's.
 * @param now             The phone's clock.
 * @param currentSnapshot `eventSnapshot` of the decision as it stands, to
 *   detect "changed since". Left out, nothing is ever `changed`.
 */
export function calendarAddView(
	mine: CalendarAddRow | null | undefined,
	partner: CalendarAddRow | null | undefined,
	now: Date,
	currentSnapshot?: string | null,
): CalendarAddView {
	const me = live(mine);
	const them = live(partner);
	const differs = (row: CalendarAddRow): boolean =>
		typeof currentSnapshot === "string" && currentSnapshot !== "" && row.snapshot !== currentSnapshot;

	if (me?.state === "added" && them?.state === "added") {
		return {
			kind: "both-added",
			addedAt: me.updated_at,
			partnerAddedAt: them.updated_at,
			method: me.method,
			partnerMethod: them.method,
			confirmed: me.confirmed,
			changed: differs(me),
		};
	}

	if (me?.state === "added") {
		return {
			kind: "mine-added",
			addedAt: me.updated_at,
			method: me.method,
			confirmed: me.confirmed,
			changed: differs(me),
		};
	}

	if (them?.state === "added") {
		return {
			kind: "partner-added",
			addedAt: them.updated_at,
			method: them.method,
			confirmed: them.confirmed,
			// Judged on my own row only. A relative date ("tomorrow") resolves
			// in the viewer's time zone, so two phones can honestly disagree
			// about a partner's fingerprint, and "changed" here would invite a
			// second copy onto a shared calendar.
			changed: false,
		};
	}

	if (me?.state === "opened") {
		return { kind: "mine-opened", openedAt: me.updated_at, method: me.method, changed: false };
	}

	if (them?.state === "opened") {
		const opened = Date.parse(them.updated_at);
		const staleAt = opened + OPENED_STALE_MS;
		if (!Number.isNaN(opened) && now.getTime() < staleAt) {
			return {
				kind: "partner-opening",
				openedAt: them.updated_at,
				staleAt,
				method: them.method,
				changed: false,
			};
		}
		return {
			kind: "partner-started",
			openedAt: them.updated_at,
			method: them.method,
			changed: false,
		};
	}

	return NONE;
}
