/**
 * Tailwind → NativeWind's native compiler, the way Metro runs it for iOS.
 *
 * `nativewind/metro` forks the Tailwind CLI with `NATIVEWIND_OS=<platform>`
 * on the input CSS (`global.css`) and hands the result to
 * `cssToReactNativeRuntime` with NativeWind's own options plus `inlineRem`.
 * metro.config.js passes no `inlineRem`, so it is `withNativeWind`'s default,
 * 14 (web's rem is 16) — kept on purpose. `METRO_INLINE_REM` is read from
 * those two places rather than written down, so a change to either reaches
 * every native-runtime test (and `theme/rem.ts`'s `NATIVE_REM` has to follow).
 *
 * For the `native-runtime` jest project only (its tests run the real
 * compiler; nothing here is mocked).
 */
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

const NUMBER = String.raw`(\d+(?:\.\d+)?)`;

/**
 * The `inlineRem` Metro compiles with: metro.config.js's own, when it passes
 * one to `withNativeWind`, otherwise `withNativeWind`'s default as the
 * installed NativeWind declares it.
 */
function readMetroInlineRem(): number {
	const metro = fs.readFileSync(path.join(ROOT, "metro.config.js"), "utf8");
	const own = new RegExp(String.raw`inlineRem\s*:\s*` + NUMBER).exec(metro);
	if (own) return Number(own[1]);
	if (/inlineRem/.test(metro)) {
		throw new Error(
			"metro.config.js sets `inlineRem` in a form test-utils/native-css.ts cannot read",
		);
	}
	const nativewind = fs.readFileSync(require.resolve("nativewind/dist/metro/index.js"), "utf8");
	const fallback = new RegExp(String.raw`inlineRem\s*=\s*` + NUMBER).exec(nativewind);
	if (!fallback) throw new Error("could not find `withNativeWind`'s default `inlineRem`");
	return Number(fallback[1]);
}

/** The rem NativeWind inlines on native, as Metro is configured today (14). */
export const METRO_INLINE_REM = readMetroInlineRem();

export type NativeRule = {
	n?: {
		d?: unknown[];
		pseudoClasses?: Record<string, unknown>;
		attrs?: unknown[];
		containerQuery?: unknown[];
		variables?: unknown[];
	}[];
	warnings?: { type: string; property: string; value?: string }[];
	container?: boolean;
};

export type NativeCss = {
	/** The Tailwind CSS the iOS build is compiled from. */
	css: string;
	/** `cssToReactNativeRuntime(css).rules`, keyed by class name. */
	rules: Record<string, NativeRule>;
};

/**
 * Compiles `global.css` for iOS. With no `content`, Tailwind scans the repo's
 * own `content` globs (tailwind.config.js), resolved against the repo root so
 * the result does not depend on jest's cwd.
 */
export async function compileNativeCss(
	options: { content?: { raw: string }[]; platform?: "ios" | "android" } = {},
): Promise<NativeCss> {
	const platform = options.platform ?? "ios";
	const previous = process.env.NATIVEWIND_OS;
	// NativeWind's preset reads this when it loads, to pick the `web:` /
	// `ios:` / `native:` variants, so it is set before anything requires it.
	process.env.NATIVEWIND_OS = platform;
	try {
		/* eslint-disable @typescript-eslint/no-require-imports */
		const postcss = require("postcss");
		const tailwindcss = require("tailwindcss");
		const { cssToReactNativeRuntimeOptions } = require("nativewind/dist/metro/common");
		const { cssToReactNativeRuntime } = require("react-native-css-interop/dist/css-to-rn");
		const config = require(path.join(ROOT, "tailwind.config.js"));
		/* eslint-enable @typescript-eslint/no-require-imports */

		const content =
			options.content ??
			(config.content as string[]).map((glob) => path.join(ROOT, glob.replace(/^\.\//, "")));
		const input = path.join(ROOT, "global.css");
		const { css } = await postcss([tailwindcss({ ...config, content })]).process(
			fs.readFileSync(input, "utf8"),
			{ from: input },
		);

		const selectorPrefix = typeof config.important === "string" ? config.important : undefined;
		const output = cssToReactNativeRuntime(css, {
			...cssToReactNativeRuntimeOptions,
			inlineRem: METRO_INLINE_REM,
			selectorPrefix,
		});
		return { css, rules: output.rules ?? {} };
	} finally {
		if (previous === undefined) delete process.env.NATIVEWIND_OS;
		else process.env.NATIVEWIND_OS = previous;
	}
}

/**
 * The style keys a class string sets on native, merged left to right — enough
 * to ask "does this land a lineHeight", not a full resolver (no variables, no
 * pseudo-class states).
 */
export function nativeStyleOf(rules: Record<string, NativeRule>, classes: string) {
	const style: Record<string, unknown> = {};
	for (const name of classes.split(/\s+/).filter(Boolean)) {
		for (const entry of rules[name]?.n ?? []) {
			if (entry.pseudoClasses && Object.keys(entry.pseudoClasses).length) continue;
			for (const declaration of entry.d ?? []) {
				if (Array.isArray(declaration) && declaration[0] && typeof declaration[0] === "object") {
					Object.assign(style, declaration[0]);
				}
			}
		}
	}
	return style;
}
