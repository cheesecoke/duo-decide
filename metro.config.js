const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

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

module.exports = config;
