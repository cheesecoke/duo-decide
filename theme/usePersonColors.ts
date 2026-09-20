import * as React from "react";

import { DEFAULT_PERSON_A, DEFAULT_PERSON_B, getPreset, type HuePresetId } from "@/theme/presets";

/**
 * Runtime read of the active person pair's colours (tokens.md §1/§2).
 *
 * Tailwind classes (`bg-person-a-tint`) cover everything that is *styled*, and
 * they stay the right answer. This hook exists for the cases that need the
 * colour as a **value**: Reanimated's `interpolateColor` and
 * `expo-linear-gradient`'s `colors` array both take real colour strings and
 * cannot resolve a CSS custom property.
 *
 * The returned strings are `hsl(H S% L%)`. Reanimated's colour parser treats
 * the separating commas as optional (node_modules/react-native-reanimated
 * lib/module/Colors.js, `call()`), so the space-separated form the presets
 * already store round-trips without a second spelling of each value.
 *
 * Nothing sets the pair yet — Task 3 wraps the app in
 * `PersonPairContext.Provider` once the preset picker exists — so the default
 * is the tokens.md §1 default of sage (A) + blush (B), which is also what
 * `.storybook/preview.tsx` renders under.
 */

export type PersonColors = {
	/** chips, icons, characters, the Card rail */
	base: string;
	/** panels, selected backgrounds, the Card wash */
	tint: string;
	/** text on tint, emphasis */
	deep: string;
};

export type PersonColorPair = {
	a: PersonColors;
	b: PersonColors;
};

export type PersonPairIds = {
	a: HuePresetId | (string & {});
	b: HuePresetId | (string & {});
};

const DEFAULT_PAIR: PersonPairIds = { a: DEFAULT_PERSON_A, b: DEFAULT_PERSON_B };

/**
 * The pair the subtree renders under. Kept as preset *ids* rather than
 * resolved colours so a provider only has to persist two strings.
 */
export const PersonPairContext = React.createContext<PersonPairIds>(DEFAULT_PAIR);

/** `"150 32% 62%"` (the shape presets.ts stores) → `"hsl(150 32% 62%)"`. */
function toHsl(triplet: string): string {
	return `hsl(${triplet})`;
}

function colorsFor(id: HuePresetId | (string & {})): PersonColors {
	const preset = getPreset(id);
	return {
		base: toHsl(preset.base),
		tint: toHsl(preset.tint),
		deep: toHsl(preset.deep),
	};
}

export function usePersonColors(): PersonColorPair {
	const { a, b } = React.useContext(PersonPairContext);

	// Memoised on the two ids, so a consumer can put the result straight into a
	// `useAnimatedStyle` dependency array without re-running on every render.
	return React.useMemo(() => ({ a: colorsFor(a), b: colorsFor(b) }), [a, b]);
}
