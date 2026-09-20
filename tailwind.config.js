/** @type {import('tailwindcss').Config} */
// Theme is DERIVED from active/sprint-2026-09/design-refs/tokens.md (v0).
// Edit tokens.md first, then regenerate this file.
//
// theme/neutrals.ts mirrors these literals; update both. (It exists because
// react-native-svg strokes, gradient colour arrays and Reanimated's
// interpolateColor take colour *values*, which a class cannot supply.)

// tokens.md §3 — neutral surfaces (light only for v1). Defined once here so
// the shadcn alias block below can reuse the same literals.
const BG = "hsl(40 20% 98%)";
const SURFACE = "#FFFFFF";
const SURFACE_2 = "hsl(40 15% 95%)";
const INK = "hsl(220 15% 14%)";
const INK_2 = "hsl(220 10% 46%)";
const INK_3 = "hsl(220 8% 68%)";
const LINE = "hsl(40 12% 90%)";
// tokens.md §3. Spelled with commas because theme/neutrals.ts mirrors this
// literal as a *value*, and React Native's colour parser rejects the CSS
// Color 4 `h s% l% / a` form (returns null, which paints nothing).
const SCRIM = "hsla(220, 20%, 12%, 0.42)";
const CTA = "hsl(220 15% 14%)";
const CTA_FG = "#FFFFFF";

// tokens.md §3 `destructive`, plus the tint step it was missing — the panel
// behind a failure message.
//
// Hand-picked, NOT derived: tokens.md §2's tint rule is written for the
// person presets, whose `base` sits at ~70% lightness, and it does not
// transfer to a `destructive` at 30%. The rule here is the one the step has
// to satisfy: same hue (4), near-white, and 8.5:1 for `destructive` text on
// it — comfortably past the 7:1 §2 sets for `deep` on `tint`.
// Added 2026-09-20 (Task 12); noted for tokens.md §3.
const DESTRUCTIVE = "hsl(4 66% 30%)";
const DESTRUCTIVE_TINT = "hsl(4 70% 95%)";
const DESTRUCTIVE_FG = "#FFFFFF";

module.exports = {
	content: [
		"./app/**/*.{js,jsx,ts,tsx}",
		"./components/**/*.{js,jsx,ts,tsx}",
		"./theme/**/*.{js,jsx,ts,tsx}",
		"./.storybook/**/*.{js,jsx,ts,tsx}",
		// Class names also show up outside the component tree (variant maps,
		// config tables, copy decks), so scan the rest of the source dirs too.
		"./{hooks,lib,context,constants,config,data}/**/*.{js,jsx,ts,tsx}",
	],
	presets: [require("nativewind/preset")],
	theme: {
		extend: {
			colors: {
				// tokens.md §1/§2 — two-hue system, runtime-swappable via CSS vars
				"person-a-base": "hsl(var(--person-a-base))",
				"person-a-tint": "hsl(var(--person-a-tint))",
				"person-a-deep": "hsl(var(--person-a-deep))",
				"person-b-base": "hsl(var(--person-b-base))",
				"person-b-tint": "hsl(var(--person-b-tint))",
				"person-b-deep": "hsl(var(--person-b-deep))",

				// tokens.md §3 — neutral surfaces
				bg: BG,
				surface: SURFACE,
				"surface-2": SURFACE_2,
				ink: INK,
				"ink-2": INK_2,
				"ink-3": INK_3,
				line: LINE,
				scrim: SCRIM,
				cta: CTA,
				"cta-fg": CTA_FG,

				// shadcn → Duo aliases.
				// React Native Reusables components are written against the
				// shadcn token names. Mapping them here means the vendored
				// files work as published, so a future `rnr add` diff stays
				// clean. Duo code should prefer the token names above.
				primary: CTA,
				"primary-foreground": CTA_FG,
				secondary: SURFACE_2,
				"secondary-foreground": INK,
				accent: SURFACE_2,
				"accent-foreground": INK,
				foreground: INK,
				background: BG,
				muted: SURFACE_2,
				"muted-foreground": INK_2,
				border: LINE,
				input: LINE,
				ring: INK_3,
				destructive: DESTRUCTIVE,
				"destructive-tint": DESTRUCTIVE_TINT,
				"destructive-foreground": DESTRUCTIVE_FG,
			},
			fontSize: {
				// tokens.md §5 `row` — the 15/20 line a list row is set in
				// (the settings sheet's slabs, the hue picker's labels, the
				// create sheet's list rows). Weight and colour stay at the
				// call site: the same line is 500 `ink` for a label and 500
				// `ink-2` for the status beside it.
				//
				// lib/utils.ts teaches tailwind-merge that `text-row` is a
				// size, not a colour — without that, `cn("text-row",
				// "text-ink-2")` would drop it.
				row: ["15px", { lineHeight: "20px" }],
			},
			borderRadius: {
				// tokens.md §4 — shape
				chip: "9999px",
				button: "9999px",
				card: "24px",
				tile: "28px",
				// Text fields. Not in tokens.md §4 yet — it is the round-3
				// mock's `--r-field: 16px` (the inline-edit inputs), which is
				// the only shape on that page §4 does not name.
				field: "16px",
				sheet: "32px",
				"tab-active": "14px",
			},
		},
	},
	plugins: [],
};
