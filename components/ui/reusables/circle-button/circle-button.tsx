import * as React from "react";
import { Pressable, type PressableProps } from "react-native";
import { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { AnimatedView } from "@/components/ui/reusables/animated/animated";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import { DUR } from "@/theme/motion";
import { SHADOW } from "@/theme/shadows";

/**
 * CircleButton — the mock's `.circ`
 * (design-refs/mocks/decision-queue-round-3.html:91).
 *
 * A 34 px disc of `surface` floating on `shadow.card` with a single `ink-2`
 * glyph in it. It is the one control the shell uses for a bare icon: the app
 * bar's settings and back buttons, and the close button on every sheet. Which
 * is why it lives here rather than inside either of them — two copies of a
 * pressed-scale animation is exactly the kind of drift the design system is
 * meant to prevent.
 *
 * The glyph is a child, not a prop, and it is decorative: the pressable
 * carries the accessible name, so nothing inside it needs a label of its own.
 *
 * Motion (tokens.md §8): 1.0 → 0.96 over `dur.fast` while held. The mock says
 * 0.92; the brief's shell spec says 0.96, and 0.96 is what a 34 px target can
 * shrink by without reading as a glitch. Reduce-motion skips it — a press is
 * already reported by the touch itself.
 */

type CircleButtonProps = {
	/** The accessible name. Required: the glyph inside says nothing. */
	label: string;
	onPress: () => void;
	children: React.ReactNode;
	className?: string;
	disabled?: boolean;
	accessibilityState?: PressableProps["accessibilityState"];
	testID?: string;
};

const PRESSED_SCALE = 0.96;

function CircleButton({
	label,
	onPress,
	children,
	className,
	disabled,
	accessibilityState,
	testID,
}: CircleButtonProps) {
	const reducedMotion = useReducedMotion();
	const scale = useSharedValue(1);

	const press = (to: number) => {
		if (reducedMotion) return;
		scale.value = withTiming(to, { duration: DUR.fast });
	};

	// Explicit dependency array: Reanimated's Babel plugin does not run in
	// Storybook's vite pipeline (see .storybook/main.ts), and without one
	// `useAnimatedStyle` throws on web.
	const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }), [scale]);

	return (
		<Pressable
			role="button"
			accessibilityLabel={label}
			accessibilityState={{ disabled, ...accessibilityState }}
			testID={testID}
			disabled={disabled}
			onPress={onPress}
			onPressIn={() => press(PRESSED_SCALE)}
			onPressOut={() => press(1)}
		>
			<AnimatedView
				style={[SHADOW.card, scaleStyle]}
				className={cn(
					"h-[34px] w-[34px] shrink-0 items-center justify-center rounded-chip bg-surface",
					disabled && "opacity-50",
					className,
				)}
			>
				{children}
			</AnimatedView>
		</Pressable>
	);
}

export { CircleButton, PRESSED_SCALE };
export type { CircleButtonProps };
