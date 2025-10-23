const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// https://github.com/supabase/supabase-js/issues/1258#issuecomment-2801695478
config.resolver = {
	...config.resolver,
	unstable_conditionNames: ["browser"],
	unstable_enablePackageExports: false,
	extraNodeModules: {
		"@": path.resolve(__dirname),
	},
};

module.exports = config;
