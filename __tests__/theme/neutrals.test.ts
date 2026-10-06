import { NEUTRAL } from "@/theme/neutrals";

/**
 * React Native's own parser, the one every `backgroundColor` goes through.
 * `require` + a cast because the package ships no types, and the point of the
 * test is lost if a hand-written stand-in is what does the parsing.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const normalizeColor = require("@react-native/normalize-colors") as (
	color: string,
) => number | null;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const tailwindConfig = require("@/tailwind.config.js") as {
	theme: { extend: { colors: Record<string, string> } };
};

/**
 * Every colour literal in the system has to be one React Native can read.
 *
 * This is not a formatting nicety. `normalizeColor` returns `null` for a
 * spelling it does not know, and a null colour is silently *no* colour — the
 * view paints nothing and there is no warning anywhere. That is exactly how
 * `scrim`, written in tokens.md's CSS Color 4 form `hsl(220 20% 12% / 0.42)`,
 * shipped a sheet with no backdrop at all, with a green suite.
 *
 * Both halves of the token layer are held to it: `theme/neutrals.ts`, whose
 * values go straight into style props, and `tailwind.config.js`, whose
 * literals NativeWind has to turn into the same style props on native. The
 * config's `hsl(var(--person-*))` entries are skipped — a custom property is
 * resolved by the CSS-var channel, not by this parser.
 */

/** `hsl(var(--person-a-base))` and friends: resolved elsewhere, not here. */
function isCustomProperty(value: string): boolean {
	return value.includes("var(--");
}

const TAILWIND_COLORS = Object.entries(tailwindConfig.theme.extend.colors).filter(
	([, value]) => typeof value === "string" && !isCustomProperty(value),
);

describe("NEUTRAL", () => {
	it.each(Object.entries(NEUTRAL))("%s is a colour React Native can parse", (_name, value) => {
		expect(normalizeColor(value)).not.toBeNull();
	});

	it("keeps the scrim's alpha", () => {
		// 0.42 → 107/255 in the low byte of the packed colour.
		const packed = normalizeColor(NEUTRAL.scrim) as number;
		expect(packed & 0xff).toBe(107);
	});
});

describe("tailwind.config.js colours", () => {
	it("has literals to check", () => {
		// A config refactor that moved the palette elsewhere would otherwise
		// turn every case below into a silent pass.
		expect(TAILWIND_COLORS.length).toBeGreaterThan(10);
	});

	it.each(TAILWIND_COLORS)("%s is a colour React Native can parse", (_name, value) => {
		expect(normalizeColor(value)).not.toBeNull();
	});

	it("spells the scrim the same way the value layer does", () => {
		const fromConfig = tailwindConfig.theme.extend.colors.scrim;
		expect(fromConfig).toBe(NEUTRAL.scrim);
	});

	/**
	 * Same guard for the failure panel (Task 12). It is hand-picked rather
	 * than derived, which is exactly why the two layers can drift: there is no
	 * formula to recompute it from, so the only thing holding them together is
	 * this line.
	 */
	it("spells destructive-tint the same way the value layer does", () => {
		const fromConfig = tailwindConfig.theme.extend.colors["destructive-tint"];
		expect(fromConfig).toBe(NEUTRAL.destructiveTint);
	});
});
