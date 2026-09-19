module.exports = function (api) {
	// Config depends on NODE_ENV, so cache on it rather than forever.
	api.cache.using(() => process.env.NODE_ENV);

	// NativeWind's babel preset rewrites createElement to the css-interop
	// wrapper, which injects an out-of-scope `_ReactNativeCSSInterop` binding.
	// Jest rejects that inside `jest.mock()` factories (test-utils/setup.ts),
	// so the preset is skipped under NODE_ENV=test. Styling is exercised in
	// Storybook (web) instead.
	const isTest = api.env("test");

	return {
		presets: isTest
			? ["babel-preset-expo"]
			: ["babel-preset-expo", "nativewind/babel"],
		plugins: [
			[
				"module-resolver",
				{
					root: ["."],
					alias: {
						"@": ".",
					},
					extensions: [
						".ios.ts",
						".android.ts",
						".ts",
						".ios.tsx",
						".android.tsx",
						".tsx",
						".jsx",
						".js",
						".json",
					],
				},
			],
		],
	};
};
