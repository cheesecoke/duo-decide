/**
 * Hand-rolled stand-in for react-native-reanimated under jest.
 *
 * The package's own `react-native-reanimated/mock` cannot be used here: it
 * re-exports from `src/`, which reaches for the native Reanimated TurboModule
 * at import time and throws under this repo's `react-native` mock
 * (test-utils/setup.ts). Reanimated's babel plugin is also off in jest, so
 * worklets would not compile anyway.
 *
 * Animation is therefore a no-op: animated values land on their target
 * immediately and `Animated.View` is a plain `View`. Tests assert behaviour
 * and accessibility, never motion.
 */
import { Text as RNText, View as RNView } from "react-native";

type Mutable<T> = { value: T };

const identity = <T,>(toValue: T): T => toValue;

export function useSharedValue<T>(initial: T): Mutable<T> {
	// A fresh object per hook call is enough: nothing here re-renders on write.
	return { value: initial };
}

export function useAnimatedStyle<T>(factory: () => T, _deps?: unknown[]): T {
	return factory();
}

export const withSpring = identity;
export const withTiming = identity;
export const withDelay = <T,>(_delay: number, animation: T): T => animation;
export const runOnJS =
	<A extends unknown[]>(fn: (...args: A) => unknown) =>
	(...args: A) =>
		fn(...args);

const Animated = {
	View: RNView,
	Text: RNText,
	createAnimatedComponent: <T,>(component: T): T => component,
};

export default Animated;
