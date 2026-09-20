/**
 * Neutral surfaces as *values* — derived from design-refs/tokens.md §3.
 *
 * `tailwind.config.js` already carries these as classes (`bg-surface`,
 * `text-ink-2`, …), and classes stay the right answer for anything NativeWind
 * styles. This module is the value-layer twin, for the props NativeWind does
 * not reach: react-native-svg's `stroke` and `fill`, gradient colour arrays,
 * Reanimated's `interpolateColor`.
 *
 * Person colours have the same split — classes in tailwind.config.js, values
 * from `theme/usePersonColors`. The difference is that these do not change at
 * runtime, so they are constants rather than a hook.
 */

export const NEUTRAL = {
	/** page background, barely warm */
	bg: "hsl(40 20% 98%)",
	/** cards, sheets */
	surface: "#FFFFFF",
	/** inset areas inside a card, chip track */
	surface2: "hsl(40 15% 95%)",
	/** headlines, body */
	ink: "hsl(220 15% 14%)",
	/** secondary text, eyebrows */
	ink2: "hsl(220 10% 46%)",
	/** placeholders, disabled */
	ink3: "hsl(220 8% 68%)",
	/** hairline dividers only — cards do NOT use borders */
	line: "hsl(40 12% 90%)",
	/** the sheet backdrop — the one neutral with alpha baked in */
	scrim: "hsl(220 20% 12% / 0.42)",
	/** Mirrors `DESTRUCTIVE` in tailwind.config.js — provisional, not in tokens.md yet. */
	destructive: "hsl(4 66% 30%)",
	/** primary button fill (same as ink) */
	cta: "hsl(220 15% 14%)",
	ctaFg: "#FFFFFF",
} as const;
