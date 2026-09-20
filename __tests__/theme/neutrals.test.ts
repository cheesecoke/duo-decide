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

/**
 * The value-layer neutrals have to be colours React Native can actually read.
 *
 * This is not a formatting nicety. `normalizeColor` returns `null` for a
 * spelling it does not know, and a null colour is silently *no* colour — the
 * view paints nothing and there is no warning anywhere. That is exactly how
 * `scrim`, written in tokens.md's CSS Color 4 form `hsl(220 20% 12% / 0.42)`,
 * shipped a sheet with no backdrop at all: the class form is fine, the value
 * form is not, and only the value reaches a style prop.
 */

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
