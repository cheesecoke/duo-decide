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

/**
 * Native-vs-web traps, as lint errors (the native audit, Nov 2026). Each one
 * looked right on web and in Storybook and was silently wrong on iOS. See
 * CLAUDE.md > Native-safe checklist.
 *
 * `NON_INTEROP` — components NativeWind has no interop registration for, so a
 * `className` on them never reaches the native view (CLAUDE.md > Components a
 * className does NOT reach). `Image` is registered, so it is not listed.
 *
 * `WEB_ONLY` — Tailwind that native drops or applies without its condition.
 * Allowed inside `Platform.select({ web: ... })` (the `Property[key.name='web']`
 * exemption) or behind a `web:` prefix (which the patterns do not match,
 * since each has to start a class). `components/__tests__/
 * classes.native-runtime.test.tsx` is the other half: it compiles every class
 * the app uses with NativeWind's native compiler and fails on any that
 * produce nothing.
 */
const NON_INTEROP =
	"^(Modal|SectionList|RefreshControl|LinearGradient|Svg|G|Path|Circle|Rect|Line|Defs|Stop|RadialGradient|Polygon|Polyline|Ellipse|Mask|ClipPath)$";
const WEB_ONLY =
	"(^|\\s)(space-[xy]-|divide-|grid\\b|fixed\\b|sticky\\b|cursor-|backdrop-|bg-gradient-|line-clamp-|truncate\\b|select-none\\b|transition|animate-|(first|last|odd|even|focus|focus-visible|focus-within|peer-[a-z-]+|has-\\[[^\\]]*\\]):)";

const NATIVE_SAFE_SYNTAX = [
	{
		selector: `JSXOpeningElement[name.name=/${NON_INTEROP}/] > JSXAttribute[name.name=/[cC]lassName$/]`,
		message:
			"className never reaches this on iOS (no NativeWind interop). Use style or AnimatedView/cssInterop.",
	},
	{
		selector:
			"JSXOpeningElement[name.object.name='Animated'] > JSXAttribute[name.name=/[cC]lassName$/]",
		message: "Use AnimatedView.",
	},
	{
		selector: "JSXOpeningElement[name.name=/Icon$/] > JSXAttribute[name.name='className']",
		message: "Icons take color/size props, not classes.",
	},
	{
		selector: `Literal[value=/${WEB_ONLY}/]:not(Property[key.name='web'] Literal):not(ImportDeclaration Literal)`,
		message:
			"Web-only Tailwind: native drops it or applies it unconditionally. Scope with Platform.select({ web }) or web:.",
	},
	{
		selector: `TemplateElement[value.raw=/${WEB_ONLY}/]:not(Property[key.name='web'] TemplateElement)`,
		message: "Web-only Tailwind (see above).",
	},
	{
		selector: "Literal[value=/(^|\\s)hover:/]:not(Property[key.name='web'] Literal)",
		message: "hover: has no touch equivalent; pair with active: and scope with web:.",
	},
	{
		selector: "MemberExpression[object.name='window'][property.name='location']",
		message: "window.location is undefined in a release iOS build; guard with Platform.OS === 'web'.",
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
	{
		files: [
			"app/**/*.{ts,tsx}",
			"components/**/*.{ts,tsx}",
			"theme/**/*.{ts,tsx}",
			"lib/**/*.ts",
			"hooks/**/*.ts",
			"context/**/*.tsx",
		],
		// Stories are web-only, and tests assert class strings on purpose.
		ignores: ["**/*.stories.tsx", "**/__tests__/**"],
		rules: {
			"no-restricted-syntax": ["error", ...NATIVE_SAFE_SYNTAX],
		},
	},
]);
