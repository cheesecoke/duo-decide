const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const eslintPluginPrettierRecommended = require("eslint-plugin-prettier/recommended");

/**
 * Two things the v2 design system cannot have creep back in, so they are
 * lint errors rather than review notes (PLAN-3 task 15).
 */
const EMOTION_BAN = {
	group: ["@emotion/*", "@emotion"],
	message:
		"Emotion was removed in PLAN-3 task 15. Style with NativeWind token classes (tailwind.config.js mirrors design-refs/tokens.md); see components/ui/reusables for the pattern.",
};

/**
 * NativeWind's JSX transform swaps a component for its interop-wrapped twin
 * only when one is registered — `interopComponents.get(type) ?? type`. Neither
 * of these two `Animated` namespaces is in that set, so a `className` on
 * `Animated.View` never reaches the DOM at all: the layer animates at zero
 * size in no colour, with nothing logged.
 *
 * Both are banned inside `components/`, `app/` and `theme/` — everywhere a
 * `className` is written, where every animated layer should be `AnimatedView`
 * (registered once, with `cssInterop`). `app/` and `theme/` are clean today
 * and the ban is what keeps them that way: the failure is silent, so the
 * screen that first reaches for `Animated.View` would get no warning at all
 * (PLAN-3 final review M4).
 *
 * The legitimate exceptions, all in `components/`, carry a disable with their
 * reason:
 *
 * - `reusables/animated/animated.tsx` — it *is* the registration
 * - `reusables/gauge/gauge.tsx` — `createAnimatedComponent(Path)`, an SVG
 *   path that takes animated props, not a class
 * - `modals/BottomDrawer.tsx` — RN's own `Animated`, because the sheet is
 *   inside a native `Modal` where `useNativeDriver` has to stay off on web
 * - `reusables/animated/__tests__/animated.test.tsx` and
 *   `reusables/character/__tests__/character.test.tsx` — tests that need the
 *   raw component to prove the registration and the mock
 */
const ANIMATED_BAN = [
	{
		name: "react-native",
		importNames: ["Animated"],
		message:
			"React Native's `Animated.View` silently drops `className` — NativeWind only rewrites it for components with an interop registration. Use `AnimatedView` from components/ui/reusables/animated/animated.",
	},
	{
		name: "react-native-reanimated",
		importNames: ["default"],
		message:
			"Reanimated's `Animated.View` silently drops `className` — NativeWind only rewrites it for components with an interop registration. Use `AnimatedView` from components/ui/reusables/animated/animated. (Named imports — useAnimatedStyle, useSharedValue, withTiming … — are fine.)",
	},
];

module.exports = defineConfig([
	expoConfig,
	eslintPluginPrettierRecommended,
	{
		// Build output. Both are gitignored; `storybook-static/` was not listed
		// here, so `npm run lint` walked a few thousand bundled files and took
		// minutes after any `storybook:build`.
		ignores: ["dist/*", "storybook-static/*"],
	},
	{
		rules: {
			"no-restricted-imports": ["error", { patterns: [EMOTION_BAN] }],
		},
	},
	{
		files: [
			"components/**/*.{js,jsx,ts,tsx}",
			"app/**/*.{js,jsx,ts,tsx}",
			"theme/**/*.{js,jsx,ts,tsx}",
		],
		rules: {
			"no-restricted-imports": ["error", { patterns: [EMOTION_BAN], paths: ANIMATED_BAN }],
		},
	},
]);
