import * as React from "react";
import { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { AnimatedView } from "@/components/ui/reusables/animated/animated";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { DUR } from "@/theme/motion";

/**
 * A card's exit from the queue — archived or deleted.
 *
 * `leaving` fades and settles the card over one `DUR.base`, then calls
 * `onLeft`, which is where the screen actually removes it (the hook's
 * optimistic write). Under reduce-motion `onLeft` runs at once: the motion is
 * decorative, the removal is not.
 *
 * Same shape as `StaggerIn` and `Reveal`: a shared value driven from an
 * effect, not a Reanimated layout animation (`exiting={FadeOut}`), for the
 * reason reveal.tsx gives — a layout animation that fails to run on web
 * leaves the element in a half state, and nothing else here uses them.
 *
 * While leaving, the card is inert and hidden from assistive tech, so a
 * second press cannot land on something that is already going.
 */
type LeaveOutProps = {
	leaving: boolean;
	onLeft: () => void;
	children: React.ReactNode;
	testID?: string;
};

/** How far the card settles as it fades — small, tokens.md §8 says no bounce. */
const SETTLE = 0.04;

function LeaveOut({ leaving, onLeft, children, testID }: LeaveOutProps) {
	const reducedMotion = useReducedMotion();
	const progress = useSharedValue(1);

	// Through a ref so a parent re-render mid-exit cannot restart the timer.
	const onLeftRef = React.useRef(onLeft);
	onLeftRef.current = onLeft;

	React.useEffect(() => {
		if (!leaving) {
			progress.value = 1;
			return;
		}
		if (reducedMotion) {
			onLeftRef.current();
			return;
		}
		progress.value = withTiming(0, { duration: DUR.base });
		const timer = setTimeout(() => onLeftRef.current(), DUR.base);
		return () => clearTimeout(timer);
	}, [leaving, reducedMotion, progress]);

	const style = useAnimatedStyle(
		() => ({
			opacity: progress.value,
			transform: [{ scale: 1 - SETTLE + SETTLE * progress.value }],
		}),
		[progress],
	);

	return (
		<AnimatedView
			testID={testID}
			style={style}
			pointerEvents={leaving ? "none" : "auto"}
			accessibilityElementsHidden={leaving}
			importantForAccessibility={leaving ? "no-hide-descendants" : "auto"}
		>
			{children}
		</AnimatedView>
	);
}

export { LeaveOut };
export type { LeaveOutProps };
