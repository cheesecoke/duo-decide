import * as React from "react";
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";

/**
 * The one shape the Reanimated mock's layout-animation builders have to
 * survive: a component that **chains a modifier while rendering**.
 *
 * `FadeOut.duration(275)` is evaluated on every render, so a mock that only
 * stubs the hooks (and hands back a plain object for `FadeOut`) throws
 * "FadeOut.duration is not a function" the moment such a component mounts —
 * not in an animation callback, where it would at least be obvious, but in
 * the render itself.
 *
 * This was proven against `components/ui/Form.tsx`'s `FormMessage` until the
 * old component tree was deleted. Nothing in the v2 tree uses layout
 * animations today — `reusables/form`, `error-strip`, `decision-card` and
 * `option-list-card` each drive their reveal from a shared value instead, and
 * say why in their own comments — so the coverage lives here, in a fixture
 * whose only job is to be that shape, rather than riding on whichever
 * component happens to use one next.
 */
export function LayoutAnimatedMessage({ children }: { children: React.ReactNode }) {
	return (
		<Animated.Text entering={FadeInDown} exiting={FadeOut.duration(275)}>
			{children}
		</Animated.Text>
	);
}
