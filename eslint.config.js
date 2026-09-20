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

const ANIMATED_BAN = {
	name: "react-native",
	importNames: ["Animated"],
	message:
		"React Native's `Animated.View` silently drops `className` — NativeWind only rewrites it for components with an interop registration. Use `AnimatedView` from components/ui/reusables/animated/animated. (BottomDrawer is the one exception; it is inside a native Modal and says why.)",
};

module.exports = defineConfig([
	expoConfig,
	eslintPluginPrettierRecommended,
	{
		ignores: ["dist/*"],
	},
	{
		rules: {
			"no-restricted-imports": ["error", { patterns: [EMOTION_BAN] }],
		},
	},
	{
		files: ["components/**/*.{js,jsx,ts,tsx}"],
		rules: {
			"no-restricted-imports": ["error", { patterns: [EMOTION_BAN], paths: [ANIMATED_BAN] }],
		},
	},
]);
