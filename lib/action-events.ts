// Action events (migration 027): counting the decided card's next-action
// button. How often it is shown, tapped, completed, dismissed, or picked from
// the ⋮ menu when it was not suggested.
//
// This is a tally in Duo's own database, not analytics: three enums and a
// decision id, no text, no device, no third party. The numbers answer one
// question (are the suggestions any good?) and the last one, menu picks with
// signal `none`, is the miss rate that decides whether smarter suggestions
// are worth building.
//
// The one rule of this file: **counting must never cost the person
// anything.** `logActionEvent` does not return a promise to wait on, never
// throws, never surfaces an error, and is safe to call before migration 027
// is applied (the insert fails, quietly).

import { supabase } from "@/config/supabase";
import type { ActionEventAction, ActionEventName, ActionEventSignal } from "@/types/database";

export type { ActionEventAction, ActionEventName, ActionEventSignal };

export interface ActionEvent {
	decisionId: string;
	/** `plan` is reserved for the Plan feature; nothing sends it yet. */
	action: ActionEventAction;
	event: ActionEventName;
	/** What the app had detected when it happened (`FollowUp.signal`). */
	signal: ActionEventSignal;
}

const TABLE = "action_events";

/** One row per (decision, person, action, event): a second one is dropped. */
const ONCE_EACH = "decision_id,user_id,action,event";

/**
 * Already sent from this phone since launch. Saves a request on every render
 * of a card whose button is `shown`; the database's unique constraint is what
 * actually guarantees "once".
 */
const sent = new Set<string>();
/** Set once the table turns out not to exist (migration 027 not applied yet). */
let unavailable = false;
const isMissingTable = (error: { code?: string }) =>
	error.code === "42P01" || error.code === "PGRST205";

/**
 * Counts one event. Fire and forget.
 *
 * The database fills in who and which couple (trigger `fill_action_event`),
 * and keeps the first row for a given decision, person, action and event, so
 * calling this on every render of a card counts `shown` once.
 */
export function logActionEvent({ decisionId, action, event, signal }: ActionEvent): void {
	try {
		if (!decisionId || unavailable) return;
		const key = `${decisionId}|${action}|${event}`;
		if (sent.has(key)) return;
		sent.add(key);

		const forget = () => {
			// Not counted: let a later call try again.
			sent.delete(key);
		};

		void Promise.resolve(
			supabase
				.from(TABLE)
				.upsert(
					{ decision_id: decisionId, action, event, signal },
					{ onConflict: ONCE_EACH, ignoreDuplicates: true },
				),
		).then(({ error }) => {
			if (!error) return;
			// No table to count in: asking again on every render only fails again.
			if (isMissingTable(error)) unavailable = true;
			else forget();
		}, forget);
	} catch {
		// Counting is never the reason something breaks.
	}
}

/** Test seam: forget what this phone has already sent. */
export function resetActionEventsForTests(): void {
	sent.clear();
	unavailable = false;
}
