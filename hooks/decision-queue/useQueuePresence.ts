import { useCallback, useRef, useState } from "react";

/**
 * useQueuePresence — which cards the filtered Decision Queue renders, and
 * which of them are on their way out.
 *
 * Two rules on top of the plain filter result (`matched`):
 *
 * 1. **Sticky while you look.** A card that stops matching *without the
 *    filter changing* stays. You tap "Your turn", vote on a card, and it
 *    becomes the partner's turn — it must not vanish under your finger (the
 *    way Mail keeps a just-read message in its Unread view). The same goes
 *    for a partner's vote arriving in real time. New matches still join.
 *    Changing the filter or the search (`resetKey`) starts over from exactly
 *    what matches.
 *
 * 2. **Fade out, don't blink.** A card leaving the shown set is kept
 *    rendered and reported in `exiting` until its exit animation calls
 *    `done(id)`.
 *
 * `allIds` is every decision there is, so a card that was archived or
 * deleted (gone from the data, not just filtered out) is dropped at once
 * rather than left waiting for an exit that has nothing to animate.
 */
export function useQueuePresence(matched: string[], resetKey: string, allIds: string[]) {
	// --- 1. sticky ---------------------------------------------------------
	// Derived during render from the previous render's answer. A ref is enough:
	// the value is a pure function of (previous, matched, resetKey), so a
	// discarded concurrent render recomputes the same set.
	const sticky = useRef<{ key: string; ids: Set<string> }>({ key: resetKey, ids: new Set(matched) });
	const existing = new Set(allIds);

	if (sticky.current.key !== resetKey) {
		sticky.current = { key: resetKey, ids: new Set(matched) };
	} else {
		const next = new Set([...sticky.current.ids].filter((id) => existing.has(id)));
		for (const id of matched) next.add(id);
		sticky.current = { key: resetKey, ids: next };
	}
	const shownSet = sticky.current.ids;

	// --- 2. exits ----------------------------------------------------------
	// State-from-props: when the shown set changes, whatever left it starts
	// exiting *in this same render pass*, so it never unmounts for a frame
	// and remounts (which would replay its entrance).
	const shownKey = allIds.filter((id) => shownSet.has(id)).join("|");
	const [previous, setPrevious] = useState<{ key: string; ids: Set<string> }>({
		key: shownKey,
		ids: shownSet,
	});
	const [exiting, setExiting] = useState<Set<string>>(() => new Set());

	if (previous.key !== shownKey) {
		const next = new Set<string>();
		for (const id of exiting) if (!shownSet.has(id) && existing.has(id)) next.add(id);
		for (const id of previous.ids) if (!shownSet.has(id) && existing.has(id)) next.add(id);
		setPrevious({ key: shownKey, ids: new Set(shownSet) });
		setExiting(next);
	}

	const done = useCallback((id: string) => {
		setExiting((current) => {
			if (!current.has(id)) return current;
			const next = new Set(current);
			next.delete(id);
			return next;
		});
	}, []);

	return { shown: shownSet, exiting, done };
}
