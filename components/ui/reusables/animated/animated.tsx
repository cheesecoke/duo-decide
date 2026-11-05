import * as React from "react";
import type { StyleProp, ViewStyle } from "react-native";
// This file *is* the interop registration the lint rule points everyone at,
// so it is the one place in components/ that has to reach the raw namespace.
// eslint-disable-next-line no-restricted-imports
import Animated from "react-native-reanimated";
import { cssInterop } from "nativewind";

/**
 * `Animated.View`, with NativeWind's `className` actually connected.
 *
 * NativeWind's JSX transform only rewrites `className` for components it has
 * an interop registration for. React Native's own `View` ships with one;
 * Reanimated's `Animated.View` does not, so a `className` on it is passed
 * straight through to a component that has no idea what to do with a class
 * string — and is silently dropped. The animated `style` still lands, which
 * is what makes the failure so quiet: the layer animates, at zero size, in no
 * colour.
 *
 * `cssInterop` (rather than the lighter `remapProps`) because the classes
 * these layers carry include `bg-person-a-tint`, which resolves to
 * `hsl(var(--person-a-tint))` — that needs the custom property read from the
 * surrounding `PersonPairProvider`, which is the part `cssInterop` does and
 * a plain prop remap does not.
 *
 * **Why the classes land on `classStyle`, not on `style`.** Registered as
 * `{ className: "style" }`, NativeWind's *native* runtime treats the incoming
 * `style` as an inline rule and `Object.assign`s it into the class style —
 * one flat object. When that `style` is a `useAnimatedStyle()` result, the
 * flat object now carries the handle's `viewDescriptors` key, so Reanimated
 * mistakes the whole merged object for the handle and renders only the
 * handle's own values (`PropsFilter.filterNonAnimatedProps`). Every class —
 * position, inset, radius, colour — vanished on iOS and Android, while web
 * (which keeps `[style, {$$css}]` as an array) looked fine. That was the
 * Create Decision segmented toggle's missing thumb on TestFlight build 9.
 *
 * So the classes resolve into their own prop and are composed here as a
 * style *array*, which keeps the animated handle intact as its own entry.
 * The jest suite proves it against NativeWind's real native runtime
 * (`__tests__/animated.native.test.tsx`).
 *
 * Registered once, here, so every animated layer in the design system imports
 * the same connected component instead of each file remembering to register.
 */
type ClassedAnimatedViewProps = React.ComponentProps<typeof Animated.View> & {
	/** Filled by NativeWind from `className`; never pass it by hand. */
	classStyle?: StyleProp<ViewStyle>;
};

const ClassedAnimatedView = React.forwardRef<
	React.ComponentRef<typeof Animated.View>,
	ClassedAnimatedViewProps
>(function ClassedAnimatedView({ classStyle, style, ...rest }, ref) {
	// Classes first and the caller's style after, so inline still wins on
	// native exactly as it did when NativeWind merged the two itself. Spread
	// one level so callers (and tests) still see a flat list of layers.
	const composed = (
		classStyle ? [classStyle, ...(Array.isArray(style) ? style : [style])] : style
	) as ClassedAnimatedViewProps["style"];
	return <Animated.View ref={ref} {...rest} style={composed} />;
});
ClassedAnimatedView.displayName = "AnimatedView";

const AnimatedView = cssInterop(ClassedAnimatedView, { className: "classStyle" });

export { AnimatedView };
