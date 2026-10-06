module.exports = function (api) {
	// NativeWind's babel preset rewrites createElement to the css-interop
	// wrapper, which injects an out-of-scope `_ReactNativeCSSInterop` binding.
	// Jest rejects that inside `jest.mock()` factories (test-utils/setup.ts),
	// so the preset is skipped for jest only. Styling is exercised in
	// Storybook (web) instead.
	//
	// Gate on the caller rather than NODE_ENV: `NODE_ENV=development npx jest`
	// must not be able to switch the preset back on, and Metro/Storybook must
	// never accidentally land in the jest branch.
	const isJest = api.caller((caller) => caller?.name === "babel-jest");

	// Config depends on the caller, so cache on it rather than forever.
	api.cache.using(() => (isJest ? "jest" : "default"));

	return {
		presets: isJest ? ["babel-preset-expo"] : ["babel-preset-expo", "nativewind/babel"],
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
