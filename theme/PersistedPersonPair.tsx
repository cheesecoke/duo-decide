import * as React from "react";

import { usePersonPair } from "@/theme/PersonPairProvider";
import { getPersonPair, setPersonPair } from "@/lib/personPairStorage";
import { DEFAULT_PAIR, type HuePair, isHuePresetId } from "@/theme/pair-choice";

/**
 * The signed-in user's saved pair, pushed into the root provider.
 *
 * It adds nothing to the CSS-var chain — there is still exactly one
 * `PersonPairProvider` in the app and it still sits at the root, outside
 * `AuthProvider`, so the vars reach the header and the drawer as well as the
 * screens. This is the piece that knows *whose* pair that is: it reads the
 * row for `userId` and calls the provider's `setPair`, and writes every later
 * change back. `PersonPairProvider` keeps its stateless contract, which is
 * what lets Storybook and the tests go on using the plain one.
 *
 * ## Why it holds its children
 *
 * The root provider starts on the defaults, because it is mounted before
 * anything knows who is signed in. Rendering the app in sage + blush and then
 * repainting it in the saved pair one tick later is a flash of the wrong
 * theme on every cold start — so the subtree waits for the read, behind the
 * caller's `fallback` (the shell passes the "Loading…" it already shows).
 *
 * ## Why the reset is in the cleanup
 *
 * Signing out does not set `userId` to null here — it unmounts the protected
 * tree this lives in. The root provider is *above* that and survives, still
 * holding the pair. Without the cleanup the next person to sign in on this
 * device would see the last person's colours until their own row loaded.
 */

type PersistedPersonPairProps = {
	/** `null` when nobody is signed in: the pair goes back to the defaults. */
	userId: string | null;
	/** Shown while the stored pair is being read. */
	fallback?: React.ReactNode;
	children?: React.ReactNode;
};

/** Identity of a pair as one string, for "has this already been written?". */
function pairKey(pair: HuePair): string {
	return `${pair.a}+${pair.b}`;
}

function PersistedPersonPair({ userId, fallback = null, children }: PersistedPersonPairProps) {
	const { a, b, setPair } = usePersonPair();
	/** The user whose stored pair is the one currently on screen. */
	const [loadedFor, setLoadedFor] = React.useState<string | null>(null);
	/** What has been written for them, so the load does not echo straight back. */
	const written = React.useRef<string | null>(null);

	React.useEffect(() => {
		if (!userId) {
			written.current = null;
			setPair(DEFAULT_PAIR);
			return;
		}

		let cancelled = false;

		getPersonPair(userId).then((pair) => {
			if (cancelled) return;
			written.current = pairKey(pair);
			setPair(pair);
			setLoadedFor(userId);
		});

		return () => {
			cancelled = true;
			written.current = null;
			// Runs on sign-out (this unmounts, the root provider does not) and
			// on a switch of user, before the next row has been read.
			setPair(DEFAULT_PAIR);
		};
	}, [userId, setPair]);

	React.useEffect(() => {
		// Until the read lands, `a`/`b` are still the defaults the root
		// provider started on — writing them would overwrite the user's pair
		// with the one we have not read yet.
		if (!userId || loadedFor !== userId) return;
		// The provider's ids are deliberately wider than the five presets
		// (`PersonPairIds`), and only a known pair is worth persisting.
		if (!isHuePresetId(a) || !isHuePresetId(b)) return;

		const next = pairKey({ a, b });
		if (written.current === next) return;
		written.current = next;

		void setPersonPair(userId, { a, b });
	}, [userId, loadedFor, a, b]);

	// `loadedFor` is left alone on a user switch on purpose: it still holds the
	// previous id, so the gate closes again until the new row arrives.
	if (userId && loadedFor !== userId) return <>{fallback}</>;

	return <>{children}</>;
}

export { PersistedPersonPair };
export type { PersistedPersonPairProps };
