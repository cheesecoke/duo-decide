/**
 * Hue presets — derived from design-refs/tokens.md §2.
 *
 * Duo is a two-person app: person A and person B each own a hue preset, and
 * the whole theme derives from the two picks. Adding a preset = adding a row.
 *
 * Values are HSL triplets (no `hsl()` wrapper) so they can be dropped straight
 * into CSS custom properties that `tailwind.config.js` wraps as
 * `hsl(var(--person-a-base))`.
 */

export type HuePresetId = "sage" | "blush" | "butter" | "lavender" | "sky";

export type HuePreset = {
	id: HuePresetId;
	/** Base hue in degrees, kept for the future preset picker. */
	hue: number;
	/** chips, icons, characters */
	base: string;
	/** panels, selected backgrounds */
	tint: string;
	/** text on tint, emphasis */
	deep: string;
};

export const HUE_PRESETS: readonly HuePreset[] = [
	{
		id: "sage",
		hue: 150,
		base: "150 32% 62%",
		tint: "150 45% 92%",
		deep: "150 30% 28%",
	},
	{
		id: "blush",
		hue: 355,
		base: "355 65% 78%",
		tint: "355 80% 94%",
		deep: "355 40% 34%",
	},
	{
		id: "butter",
		hue: 46,
		base: "46 80% 70%",
		tint: "46 90% 92%",
		deep: "46 45% 28%",
	},
	{
		id: "lavender",
		hue: 250,
		base: "250 55% 78%",
		tint: "250 70% 94%",
		deep: "250 35% 34%",
	},
	{
		id: "sky",
		hue: 200,
		base: "200 65% 74%",
		tint: "200 80% 93%",
		deep: "200 40% 30%",
	},
] as const;

/** Defaults from tokens.md §1: sage is person A, blush is person B. */
export const DEFAULT_PERSON_A: HuePresetId = "sage";
export const DEFAULT_PERSON_B: HuePresetId = "blush";

export type PersonVars = {
	"--person-a-base": string;
	"--person-a-tint": string;
	"--person-a-deep": string;
	"--person-b-base": string;
	"--person-b-tint": string;
	"--person-b-deep": string;
};

export function getPreset(id: string): HuePreset {
	const preset = HUE_PRESETS.find((p) => p.id === id);
	if (!preset) {
		throw new Error(
			`Unknown hue preset "${id}". Known presets: ${HUE_PRESETS.map((p) => p.id).join(", ")}.`,
		);
	}
	return preset;
}

/**
 * Build the `--person-*` custom-property map for a pair of presets.
 *
 * Pass the result to NativeWind's `vars()` on native:
 *   <View style={vars(pairVars("sage", "blush"))}>
 * On web the same values ship as the `.theme-sage-blush` class in global.css.
 *
 * Kept free of NativeWind imports so it stays unit-testable under the repo's
 * node test environment.
 */
export function pairVars(a: string = DEFAULT_PERSON_A, b: string = DEFAULT_PERSON_B): PersonVars {
	const personA = getPreset(a);
	const personB = getPreset(b);

	return {
		"--person-a-base": personA.base,
		"--person-a-tint": personA.tint,
		"--person-a-deep": personA.deep,
		"--person-b-base": personB.base,
		"--person-b-tint": personB.tint,
		"--person-b-deep": personB.deep,
	};
}
