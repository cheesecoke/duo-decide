module.exports = function (api) {
	api.cache(true);
	return {
		presets: ["babel-preset-expo"],
		plugins: [
			[
				"@emotion/babel-plugin",
				{
					autoLabel: "dev-only",
					labelFormat: "[local]",
				},
			],
		],
	};
};
