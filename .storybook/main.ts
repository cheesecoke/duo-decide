import path from "node:path";

import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";

import type { StorybookConfig } from "@storybook/react-native-web-vite";

const root = path.resolve(__dirname, "..");

const config: StorybookConfig = {
	// Stories live next to the components they document.
	stories: ["../components/ui/reusables/**/*.stories.@(js|jsx|ts|tsx)"],
	addons: ["@storybook/addon-docs"],
	framework: {
		name: "@storybook/react-native-web-vite",
		options: {
			pluginReactOptions: {
				// NativeWind v4 routes JSX through its css-interop runtime.
				jsxImportSource: "nativewind",
				// vite-plugin-rnw only babel-transforms .js/.jsx/.ts/.tsx by
				// default; @rn-primitives ships JSX inside .mjs.
				include: [/\.[tj]sx?$/, /\.mjs$/],
			},
			// @rn-primitives ships untranspiled JSX in its .mjs dist, so it
			// has to go through babel like react-native itself does.
			// (react-native, @react-native, expo and @expo are added for us.)
			modulesToTranspile: ["@rn-primitives", "nativewind"],
		},
	},
	viteFinal: async (viteConfig) => {
		// @rn-primitives publishes raw JSX inside .js/.mjs (both its CJS and
		// ESM builds), which rollup cannot parse. vite-plugin-rnw's babel pass
		// never sees those ids, so strip the JSX here before anything parses
		// it. Also teach the dev-mode dependency optimizer the same trick.
		viteConfig.plugins = [
			{
				name: "duo:jsx-in-node-modules",
				enforce: "pre" as const,
				async transform(code: string, id: string) {
					if (!/node_modules\/@rn-primitives\//.test(id)) return null;
					if (!code.includes("<")) return null;
					const { transform } = await import("esbuild");
					const result = await transform(code, {
						loader: "jsx",
						jsx: "automatic",
						sourcefile: id,
						sourcemap: true,
					});
					return { code: result.code, map: result.map };
				},
			},
			...(viteConfig.plugins ?? []),
		];

		viteConfig.optimizeDeps = {
			...viteConfig.optimizeDeps,
			esbuildOptions: {
				...viteConfig.optimizeDeps?.esbuildOptions,
				loader: {
					...viteConfig.optimizeDeps?.esbuildOptions?.loader,
					".js": "jsx",
					".mjs": "jsx",
				},
			},
		};

		// Tailwind runs through PostCSS here (Metro uses nativewind/metro
		// instead). The config is passed inline rather than via a root
		// postcss.config.js so Expo's own web CSS pipeline is untouched.
		viteConfig.css = {
			...viteConfig.css,
			postcss: {
				plugins: [
					tailwindcss({
						config: path.join(root, "tailwind.config.js"),
					}),
					autoprefixer(),
				],
			},
		};

		viteConfig.resolve = {
			...viteConfig.resolve,
			alias: {
				...(viteConfig.resolve?.alias as Record<string, string>),
				"@": root,
			},
		};

		return viteConfig;
	},
};

export default config;
