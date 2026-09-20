import * as React from "react";
import { AccessibilityInfo } from "react-native";

/**
 * True when the OS "reduce motion" setting is on.
 *
 * Components use this to jump animated values straight to their end state
 * instead of springing to them (tokens.md §8 motion is decorative, so
 * skipping it never changes what is on screen).
 *
 * `AccessibilityInfo` is absent from some test/web shims, hence the guards.
 */
export function useReducedMotion(): boolean {
	const [reduced, setReduced] = React.useState(false);

	React.useEffect(() => {
		let active = true;

		AccessibilityInfo?.isReduceMotionEnabled?.()
			?.then((value) => {
				if (active) setReduced(value);
			})
			?.catch(() => {
				// A shim without the native module: keep motion on.
			});

		const subscription = AccessibilityInfo?.addEventListener?.(
			"reduceMotionChanged",
			(value: boolean) => setReduced(value),
		);

		return () => {
			active = false;
			subscription?.remove?.();
		};
	}, []);

	return reduced;
}
