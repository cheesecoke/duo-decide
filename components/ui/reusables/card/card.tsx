import * as React from "react";
import { Pressable, View, type ViewProps } from "react-native";
import Animated, {
	interpolateColor,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import { DUR } from "@/theme/motion";
import { SHADOW } from "@/theme/shadows";
import { usePersonColors } from "@/theme/usePersonColors";

/**
 * Card — the floating white surface a decision sits on (tokens.md §7
 * component 4).
 *
 * tokens.md §3: "cards do NOT use borders". Whose card this is therefore has
 * to be carried by colour, and it is carried twice so it reads both at a
 * glance and up close:
 *
 *   1. a 4 px rail down the left edge, in the owning person's `base`
 *   2. a wash of that person's `tint` over the whole card at 22 %
 *
 * `together` swaps both for the A→B gradient (tokens.md §3 `together` and
 * `together.soft`).
 *
 * Each layer is its own view rather than one blended colour, which is what
 * lets a state change animate over `dur.base` without ever passing through a
 * colour that is in no state: the person layers **interpolate** between A and
 * B in HSV, and the neutral and together layers **cross-fade** underneath and
 * over them.
 *
 * On the colour space. Reanimated 3.17 takes `'RGB' | 'HSV' | 'LAB'`, and its
 * `'LAB'` is in fact **OKLAB** (interpolateColor.js hands the stops to
 * `culori.oklab`), so a perceptual space *is* on offer here. HSV is still the
 * deliberate choice: the default pair is sage at 150° and blush at 355°, which
 * are near-complementary, and a straight line between near-complementary
 * colours in OKLAB — as in RGB — runs close to the neutral axis. That desatu-
 * rated midpoint is precisely the grey-brown tokens.md §8 forbids. HSV
 * interpolates the *hue angle* the short way round instead, so the sweep stays
 * on the colour wheel and every frame is a colour the palette could contain.
 *
 * `className` lands on the outer container, alongside the card's own classes —
 * it is not forwarded to the inner padded content view.
 */

type CardState = "neutral" | "a" | "b" | "together";

type CardProps = Omit<ViewProps, "children"> & {
	state?: CardState;
	children?: React.ReactNode;
	/** Makes the whole card a button. Omit and the card stays inert. */
	onPress?: () => void;
	className?: string;
};

/**
 * tokens.md §10: the wash is a *faint* tint, not a fill. `together` is
 * allowed slightly more of it than a single person — it is the state the
 * round-2 review singled out to keep, and the A→B gradient is lower-contrast
 * against white than either flat tint is.
 */
const PERSON_WASH_OPACITY = 0.22;
const TOGETHER_WASH_OPACITY = 0.25;

/** LinearGradient is not a NativeWind component — it takes a style, not a class. */
const FILL = { flex: 1 } as const;

/** Every rail layer is the same 4 px strip, clipped to the card's corners. */
const RAIL_CLASS = "absolute bottom-0 left-0 top-0 w-1 overflow-hidden rounded-l-card";

function Card({ state = "neutral", children, onPress, className, style, ...props }: CardProps) {
	const reducedMotion = useReducedMotion();
	const person = usePersonColors();

	// `together` keeps the person layers on A, which is the gradient's first
	// stop — so the gradient fading in on top has nothing to reveal.
	const isB = state === "b";
	const personRail = isB ? person.b.base : person.a.base;
	const personWash = isB ? person.b.tint : person.a.tint;

	const railFrom = useSharedValue(personRail);
	const railTo = useSharedValue(personRail);
	const railProgress = useSharedValue(1);

	const washFrom = useSharedValue(personWash);
	const washTo = useSharedValue(personWash);
	const washProgress = useSharedValue(1);

	/** 0 = neutral (bare `line` rail, no wash), 1 = a person owns this card. */
	const owned = useSharedValue(state === "neutral" ? 0 : 1);
	/** 0 = a single person's colour, 1 = the A→B gradient. */
	const together = useSharedValue(state === "together" ? 1 : 0);

	React.useEffect(() => {
		// Restarting from the *target* rather than the live mid-flight value: a
		// second state change inside 220 ms snaps to where the first one was
		// heading and re-runs from there. At this duration an interrupted
		// transition is a rounding error, not a visible jump.
		railFrom.value = railTo.value;
		railTo.value = personRail;
		washFrom.value = washTo.value;
		washTo.value = personWash;

		railProgress.value = 0;
		washProgress.value = 0;
		if (reducedMotion) {
			railProgress.value = 1;
			washProgress.value = 1;
			return;
		}
		railProgress.value = withTiming(1, { duration: DUR.base });
		washProgress.value = withTiming(1, { duration: DUR.base });
	}, [
		personRail,
		personWash,
		reducedMotion,
		railFrom,
		railTo,
		railProgress,
		washFrom,
		washTo,
		washProgress,
	]);

	React.useEffect(() => {
		const nextOwned = state === "neutral" ? 0 : 1;
		const nextTogether = state === "together" ? 1 : 0;

		if (reducedMotion) {
			owned.value = nextOwned;
			together.value = nextTogether;
			return;
		}
		owned.value = withTiming(nextOwned, { duration: DUR.base });
		together.value = withTiming(nextTogether, { duration: DUR.base });
	}, [state, reducedMotion, owned, together]);

	// Explicit dependency arrays throughout: Reanimated's Babel plugin does not
	// run in Storybook's vite pipeline (see .storybook/main.ts), and without
	// either one `useAnimatedStyle` throws on web.
	// https://docs.swmansion.com/react-native-reanimated/docs/guides/web-support
	const personRailStyle = useAnimatedStyle(
		() => ({
			opacity: owned.value,
			backgroundColor: interpolateColor(
				railProgress.value,
				[0, 1],
				[railFrom.value, railTo.value],
				"HSV",
			),
		}),
		[owned, railProgress, railFrom, railTo],
	);

	const gradientRailStyle = useAnimatedStyle(() => ({ opacity: together.value }), [together]);

	const personWashStyle = useAnimatedStyle(
		() => ({
			// The gradient wash fades in over this one and this one fades out
			// as it does, so `together` is never double-tinted.
			opacity: owned.value * (1 - together.value) * PERSON_WASH_OPACITY,
			backgroundColor: interpolateColor(
				washProgress.value,
				[0, 1],
				[washFrom.value, washTo.value],
				"HSV",
			),
		}),
		[owned, together, washProgress, washFrom, washTo],
	);

	const gradientWashStyle = useAnimatedStyle(
		() => ({ opacity: owned.value * together.value * TOGETHER_WASH_OPACITY }),
		[owned, together],
	);

	const Container = onPress ? Pressable : View;

	// `overflow-hidden` clips every layer to the card's 24 px corners, and the
	// padding sits on an inner view so those layers measure against the card's
	// own edges rather than its content box.
	return (
		<Container
			testID={`card-state-${state}`}
			{...(onPress ? { role: "button" as const, onPress } : null)}
			style={[SHADOW.card, style]}
			className={cn("relative overflow-hidden rounded-card bg-surface", className)}
			{...props}
		>
			<Animated.View pointerEvents="none" style={personWashStyle} className="absolute inset-0" />
			<Animated.View pointerEvents="none" style={gradientWashStyle} className="absolute inset-0">
				<LinearGradient
					// tokens.md §3 `together.soft`: the tint steps on the 135°
					// diagonal, which for a box is corner to corner.
					colors={[person.a.tint, person.b.tint]}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
					style={FILL}
				/>
			</Animated.View>

			{/* Neutral's rail is the bare `line` hairline; the person and
			    gradient rails stack on top of it and fade in. */}
			<View pointerEvents="none" className={cn(RAIL_CLASS, "bg-line")} />
			<Animated.View pointerEvents="none" style={personRailStyle} className={RAIL_CLASS} />
			<Animated.View pointerEvents="none" style={gradientRailStyle} className={RAIL_CLASS}>
				<LinearGradient
					// A 4 px rail has no meaningful diagonal, so the gradient
					// runs down its length instead.
					colors={[person.a.base, person.b.base]}
					start={{ x: 0, y: 0 }}
					end={{ x: 0, y: 1 }}
					style={FILL}
				/>
			</Animated.View>

			<View className="p-5">{children}</View>
		</Container>
	);
}

export { Card, PERSON_WASH_OPACITY, TOGETHER_WASH_OPACITY };
export type { CardProps, CardState };
