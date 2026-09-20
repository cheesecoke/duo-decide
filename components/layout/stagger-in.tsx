import * as React from "react";
import { useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";

import { AnimatedView } from "@/components/ui/reusables/animated/animated";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { DUR, STAGGER_LIST } from "@/theme/motion";

/**
 * One card's entrance — tokens.md §8's 40 ms-per-card stagger.
 *
 * The delay is the card's index, so the list arrives top-down. It runs on
 * mount only: a card that is already on screen when another one is deleted
 * must not replay its entrance.
 *
 * `break-inside-avoid` is what keeps a card whole in the web masonry column
 * layout (`ResponsiveCardList`); it used to live on `CollapsibleCard`'s own
 * outer cell, which this wrapper replaces.
 *
 * Hoisted out of the Decision Queue screen (PLAN-3 task 10): every list
 * screen stages its cards the same way.
 */
function StaggerIn({ index, children }: { index: number; children: React.ReactNode }) {
	const reducedMotion = useReducedMotion();
	const progress = useSharedValue(0);

	React.useEffect(() => {
		progress.value = reducedMotion
			? 1
			: withDelay(index * STAGGER_LIST, withTiming(1, { duration: DUR.base }));
	}, [index, progress, reducedMotion]);

	const style = useAnimatedStyle(
		() => ({ opacity: progress.value, transform: [{ translateY: (1 - progress.value) * 8 }] }),
		[progress],
	);

	return (
		<AnimatedView style={style} className="mb-3 break-inside-avoid">
			{children}
		</AnimatedView>
	);
}

export { StaggerIn };
