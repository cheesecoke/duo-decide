import * as React from "react";
import { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { AnimatedView } from "@/components/ui/reusables/animated/animated";
import { Caption } from "@/components/ui/reusables/headline/headline";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { DUR } from "@/theme/motion";

/**
 * The screen-level error banner — the mock's `.strip` (a pill, not the old
 * full-width block) and tokens.md §8's "banners slide from above".
 *
 * Driven from a shared value rather than `entering={FadeIn}` for the reason
 * spelled out in decision-card.tsx: a layout animation that fails to run on a
 * cold web load leaves the element permanently invisible, and an error nobody
 * can see is worse than an error that does not animate.
 *
 * Hoisted out of the Decision Queue screen (PLAN-3 task 10) because Options
 * and History need the same strip. The queue keeps its own `testID` by
 * passing one; anything else gets the generic `"screen-error"`.
 */
function ErrorStrip({ message, testID = "screen-error" }: { message: string; testID?: string }) {
	const reducedMotion = useReducedMotion();
	const progress = useSharedValue(0);

	React.useEffect(() => {
		progress.value = reducedMotion ? 1 : withTiming(1, { duration: DUR.base });
	}, [progress, reducedMotion]);

	const style = useAnimatedStyle(
		() => ({ opacity: progress.value, transform: [{ translateY: (progress.value - 1) * 8 }] }),
		[progress],
	);

	return (
		<AnimatedView
			testID={testID}
			role="alert"
			style={style}
			className="mb-4 rounded-chip bg-destructive px-3.5 py-2"
		>
			<Caption className="text-center text-destructive-foreground">{message}</Caption>
		</AnimatedView>
	);
}

export { ErrorStrip };
