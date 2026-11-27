// Sentry's wrapper around expo/metro-config: adds debug ids so source maps
// (uploaded at build time and for EAS Update) match the bundle.
const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getSentryExpoConfig(__dirname);

config.transformer = {
	...config.transformer,
	babelTransformerPath: require.resolve("react-native-svg-transformer/expo"),
};

// https://github.com/supabase/supabase-js/issues/1258#issuecomment-2801695478
config.resolver = {
	...config.resolver,
	unstable_conditionNames: ["browser"],
	unstable_enablePackageExports: false,
	extraNodeModules: {
		"@": path.resolve(__dirname),
	},
	assetExts: config.resolver.assetExts.filter((ext) => ext !== "svg"),
	sourceExts: [...config.resolver.sourceExts, "svg"],
};

module.exports = withNativeWind(config, { input: "./global.css" });
