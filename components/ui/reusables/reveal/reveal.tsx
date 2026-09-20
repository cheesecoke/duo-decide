import * as React from "react";
import { View } from "react-native";
import { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { AnimatedView } from "@/components/ui/reusables/animated/animated";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import { DUR } from "@/theme/motion";

/**
 * A card's body opening and closing — height and opacity together (tokens.md
 * §10: "card expand height + chevron rotate").
 *
 * Both collapsible cards in the app use it: the decision card's body and its
 * edit form, and the option list card's body. It lived twice, once in each,
 * until the PLAN-3 final review (I4).
 *
 * ## Why not `entering={FadeIn}` / `layout={LinearTransition}`
 *
 * Reanimated's layout animations are the one part of the library nothing else
 * in this design system uses, and a cold headless web load was observed
 * painting the header with the body still at opacity 0. A fade that fails to
 * run leaves the body *permanently invisible*, which is a much worse failure
 * than no animation at all. A shared value driven from an effect is the
 * pattern Card, Chip, Gauge and TabBar already use, it lands on its target
 * even with the worklet plugin off, and under reduce-motion it starts there.
 *
 * ## Both directions
 *
 * `open` drives it; the children stay mounted for one `dur.base` after `open`
 * goes false so the close can animate, and then unmount. That is why a card
 * renders `<Reveal open={…}>` unconditionally rather than gating the element
 * itself: a `Reveal` that unmounted with its content could not animate
 * anything on the way out.
 *
 * ## Why the height is borrowed, not held
 *
 * There is no RN equivalent of the mock's `grid-template-rows` transition, so
 * the height is measured off the content and animated to or from it. Holding
 * that number would be a bug — the body really does change size after it
 * opens (a validation line appears when the options drop below two, the voter
 * row rewraps) and a card pinned to its opening height would clip inside
 * `Card`'s `overflow-hidden`. So one `dur.base` after opening, `settled` goes
 * true and the animated style is **detached entirely** (`style={undefined}`).
 *
 * Detaching is the whole point, and it is why the worklet always returns the
 * same two keys rather than dropping `height` when it is not wanted:
 * Reanimated keeps the last value it saw for a key that vanishes from a
 * worklet's result, so a style that stopped mentioning `height` would leave
 * the measured height applied forever. The element is not swapped either —
 * that would remount the `TextInput`s in edit mode and drop what is being
 * typed.
 *
 * `settled` is a plain JS timer, not an animation callback: whatever the
 * animated value is doing — stalled, throttled, never started — the body is
 * fully open, fully opaque and unconstrained 220 ms after it opened.
 */

type RevealProps = {
	testID: string;
	open: boolean;
	children: React.ReactNode;
	/**
	 * Overrides the OS setting. Nothing in the app passes it: it exists so
	 * `reveal.stories.tsx` can render the reduce-motion state, which is
	 * otherwise only reachable by changing a system preference.
	 */
	reducedMotion?: boolean;
};

function Reveal({ testID, open, children, reducedMotion: forced }: RevealProps) {
	const osReducedMotion = useReducedMotion();
	const reducedMotion = forced ?? osReducedMotion;
	const [mounted, setMounted] = React.useState(open);
	const [height, setHeight] = React.useState<number | null>(null);
	const [settled, setSettled] = React.useState(false);
	const progress = useSharedValue(0);

	React.useEffect(() => {
		if (open) setMounted(true);
	}, [open]);

	React.useEffect(() => {
		if (!mounted) return;

		if (reducedMotion) {
			progress.value = open ? 1 : 0;
			setSettled(open);
			if (!open) setMounted(false);
			return;
		}

		setSettled(false);
		progress.value = withTiming(open ? 1 : 0, { duration: DUR.base });

		const done = setTimeout(() => {
			if (open) setSettled(true);
			else setMounted(false);
		}, DUR.base);
		return () => clearTimeout(done);
	}, [open, mounted, reducedMotion, progress]);

	// The dependency array is required, not optional: Reanimated's Babel plugin
	// does not run in Storybook's vite pipeline (see .storybook/main.ts).
	const style = useAnimatedStyle(
		() => ({
			opacity: progress.value,
			// Until the content has been measured the height is `undefined`,
			// which is auto — the body is never clipped to a number nobody has
			// taken yet. The key is always present; see the docblock.
			height: height === null ? undefined : progress.value * height,
		}),
		[height, progress],
	);

	if (!mounted) return null;

	return (
		<AnimatedView
			testID={testID}
			style={settled ? undefined : style}
			className={cn("mt-4", !settled && "overflow-hidden")}
		>
			<View
				testID={`${testID}-content`}
				// Re-measured rather than measured once: the wrapper is what
				// gets clipped, so this view always reports the content's real
				// height, and a close needs the current one, not the opening one.
				onLayout={(event) => {
					const measured = event.nativeEvent.layout.height;
					setHeight((current) => (current === measured ? current : measured));
				}}
			>
				{children}
			</View>
		</AnimatedView>
	);
}

export { Reveal };
export type { RevealProps };
