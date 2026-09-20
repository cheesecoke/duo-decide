/**
 * Hand-rolled stand-in for react-native-reanimated under jest.
 *
 * The package's own `react-native-reanimated/mock` cannot be used here: it
 * re-exports from `src/`, which reaches for the native Reanimated TurboModule
 * at import time and throws under this repo's `react-native` mock
 * (test-utils/setup.ts). Reanimated's babel plugin is also off in jest, so
 * worklets would not compile anyway.
 *
 * Animation is a no-op: animated values land on their target immediately and
 * `Animated.View` is a plain `View`. Tests assert behaviour and accessibility,
 * never motion.
 *
 * Anything this file does not implement is NOT silently `undefined` — the
 * Proxy in `createReanimatedMock()` throws a named error instead, so a suite
 * that reaches a new Reanimated API gets told which symbol to add here rather
 * than an `undefined is not a function` twenty frames deep.
 */
import * as React from "react";
import { ScrollView as RNScrollView, Text as RNText, View as RNView } from "react-native";

type Mutable<T> = { value: T };

const identity = <T,>(toValue: T): T => toValue;

/* -------------------------------------------------------------------------- */
/* hooks                                                                       */
/* -------------------------------------------------------------------------- */

export function useSharedValue<T>(initial: T): Mutable<T> {
	// Held in a ref, so it survives re-renders the way the real one does. It
	// used to return a fresh object each render, which silently threw away
	// every write: a component that sets a shared value in an effect and reads
	// it in the next render's worklet (Gauge's reveal) would read the initial
	// value forever, and any test of that behaviour would be vacuous.
	const held = React.useRef<Mutable<T> | null>(null);
	if (held.current === null) held.current = { value: initial };
	return held.current;
}

export function useDerivedValue<T>(factory: () => T, _deps?: unknown[]): Mutable<T> {
	return { value: factory() };
}

export function useAnimatedStyle<T>(factory: () => T, _deps?: unknown[]): T {
	return factory();
}

export function useAnimatedRef<T>(): { current: T | null } {
	return { current: null };
}

export function useAnimatedProps<T>(factory: () => T, _deps?: unknown[]): T {
	return factory();
}

/* -------------------------------------------------------------------------- */
/* animation builders                                                          */
/* -------------------------------------------------------------------------- */

export const withSpring = identity;
export const withTiming = identity;
export const withDecay = identity;
export const withDelay = <T,>(_delay: number, animation: T): T => animation;
export const withRepeat = <T,>(animation: T, _count?: number, _reverse?: boolean): T => animation;
/** Real `withSequence` ends on the last animation, so that is what it returns. */
export const withSequence = <T,>(...animations: T[]): T => animations[animations.length - 1];
export const cancelAnimation = (_value: unknown): void => undefined;

export const runOnJS =
	<A extends unknown[]>(fn: (...args: A) => unknown) =>
	(...args: A) =>
		fn(...args);
export const runOnUI = runOnJS;

/* -------------------------------------------------------------------------- */
/* interpolation                                                               */
/* -------------------------------------------------------------------------- */

export const Extrapolation = {
	IDENTITY: "identity",
	CLAMP: "clamp",
	EXTEND: "extend",
} as const;

/** Alias kept because Reanimated 2 code still imports the old spelling. */
export const Extrapolate = Extrapolation;

/** Real linear interpolation, clamped — cheap, and keeps assertions meaningful. */
export function interpolate(
	value: number,
	inputRange: readonly number[],
	outputRange: readonly number[],
): number {
	if (inputRange.length < 2 || outputRange.length < 2) return outputRange[0] ?? 0;
	if (value <= inputRange[0]) return outputRange[0];

	for (let i = 1; i < inputRange.length; i++) {
		if (value > inputRange[i]) continue;
		const span = inputRange[i] - inputRange[i - 1];
		const ratio = span === 0 ? 0 : (value - inputRange[i - 1]) / span;
		return outputRange[i - 1] + ratio * (outputRange[i] - outputRange[i - 1]);
	}

	return outputRange[outputRange.length - 1];
}

/**
 * Colour blending is not worth reimplementing for tests: snap to whichever
 * stop the value sits at or past, so the result is always a real colour from
 * the caller's own output range.
 */
export function interpolateColor<T>(
	value: number,
	inputRange: readonly number[],
	outputRange: readonly T[],
): T {
	let index = 0;
	for (let i = 0; i < inputRange.length; i++) {
		if (value >= inputRange[i]) index = i;
	}
	return outputRange[Math.min(index, outputRange.length - 1)];
}

/* -------------------------------------------------------------------------- */
/* easing                                                                      */
/* -------------------------------------------------------------------------- */

const linear = (t: number) => t;

export const Easing = {
	linear,
	ease: linear,
	quad: linear,
	cubic: linear,
	sin: linear,
	circle: linear,
	exp: linear,
	bezier: () => ({ factory: () => linear }),
	bezierFn: () => linear,
	in: (fn: typeof linear = linear) => fn,
	out: (fn: typeof linear = linear) => fn,
	inOut: (fn: typeof linear = linear) => fn,
};

/* -------------------------------------------------------------------------- */
/* layout animations (entering / exiting)                                      */
/* -------------------------------------------------------------------------- */

/**
 * Layout animations are used as builders at render time —
 * `exiting={FadeOut.duration(275)}` in components/ui/Form.tsx — so every
 * modifier has to exist and has to chain. The object carries its name so a
 * test can assert which animation a component picked.
 */
type LayoutAnimationMock = {
	name: string;
	duration: (ms?: number) => LayoutAnimationMock;
	delay: (ms?: number) => LayoutAnimationMock;
	springify: () => LayoutAnimationMock;
	damping: (value?: number) => LayoutAnimationMock;
	stiffness: (value?: number) => LayoutAnimationMock;
	mass: (value?: number) => LayoutAnimationMock;
	easing: (fn?: unknown) => LayoutAnimationMock;
	withInitialValues: (values?: unknown) => LayoutAnimationMock;
	withCallback: (fn?: unknown) => LayoutAnimationMock;
	randomDelay: () => LayoutAnimationMock;
	reduceMotion: (mode?: unknown) => LayoutAnimationMock;
	build: () => () => Record<string, unknown>;
};

function layoutAnimation(name: string): LayoutAnimationMock {
	const self = { name } as LayoutAnimationMock;
	const chain = () => self;

	self.duration = chain;
	self.delay = chain;
	self.springify = chain;
	self.damping = chain;
	self.stiffness = chain;
	self.mass = chain;
	self.easing = chain;
	self.withInitialValues = chain;
	self.withCallback = chain;
	self.randomDelay = chain;
	self.reduceMotion = chain;
	self.build = () => () => ({ initialValues: {}, animations: {} });

	return self;
}

export const FadeIn = layoutAnimation("FadeIn");
export const FadeInDown = layoutAnimation("FadeInDown");
export const FadeInUp = layoutAnimation("FadeInUp");
export const FadeInLeft = layoutAnimation("FadeInLeft");
export const FadeInRight = layoutAnimation("FadeInRight");
export const FadeOut = layoutAnimation("FadeOut");
export const FadeOutDown = layoutAnimation("FadeOutDown");
export const FadeOutUp = layoutAnimation("FadeOutUp");
export const SlideInDown = layoutAnimation("SlideInDown");
export const SlideInUp = layoutAnimation("SlideInUp");
export const SlideOutDown = layoutAnimation("SlideOutDown");
export const SlideOutUp = layoutAnimation("SlideOutUp");
export const Layout = layoutAnimation("Layout");
export const LinearTransition = layoutAnimation("LinearTransition");

/* -------------------------------------------------------------------------- */
/* default export                                                              */
/* -------------------------------------------------------------------------- */

const Animated = {
	View: RNView,
	Text: RNText,
	ScrollView: RNScrollView,
	createAnimatedComponent: <T,>(component: T): T => component,
};

export default Animated;

/* -------------------------------------------------------------------------- */
/* the module object jest hands back                                           */
/* -------------------------------------------------------------------------- */

/**
 * Property names that tooling probes on any object it is handed (module
 * interop, jest's pretty-format, promise unwrapping). They must answer
 * `undefined` rather than throw, or the throw fires on an innocent inspection.
 */
const PROBES = new Set([
	"__esModule",
	"then",
	"catch",
	"finally",
	"$$typeof",
	"constructor",
	"prototype",
	"nodeType",
	"tagName",
	"hasAttribute",
	"toJSON",
	"toString",
	"valueOf",
	"asymmetricMatch",
	"_isMockFunction",
	"default",
]);

/**
 * Wrap the exports so an unimplemented Reanimated symbol fails loudly and by
 * name. Used from test-utils/setup.ts:
 *
 *   jest.mock("react-native-reanimated", () =>
 *     require("./reanimated-mock").createReanimatedMock());
 */
export function createReanimatedMock(): Record<string, unknown> {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const exported = require("./reanimated-mock") as Record<string, unknown>;

	return new Proxy(exported, {
		get(target, property, receiver) {
			if (property in target) return Reflect.get(target, property, receiver);
			if (typeof property === "symbol") return undefined;
			if (PROBES.has(property)) return undefined;

			throw new Error(`reanimated symbol "${property}" not mocked in test-utils/reanimated-mock.tsx`);
		},
	});
}
