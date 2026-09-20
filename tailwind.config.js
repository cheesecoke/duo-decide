/** @type {import('tailwindcss').Config} */
// Theme is DERIVED from active/sprint-2026-09/design-refs/tokens.md (v0).
// Edit tokens.md first, then regenerate this file.

// tokens.md §3 — neutral surfaces (light only for v1). Defined once here so
// the shadcn alias block below can reuse the same literals.
const BG = "hsl(40 20% 98%)";
const SURFACE = "#FFFFFF";
const SURFACE_2 = "hsl(40 15% 95%)";
const INK = "hsl(220 15% 14%)";
const INK_2 = "hsl(220 10% 46%)";
const INK_3 = "hsl(220 8% 68%)";
const LINE = "hsl(40 12% 90%)";
const CTA = "hsl(220 15% 14%)";
const CTA_FG = "#FFFFFF";

// Not in tokens.md — there is no destructive token yet. Provisional, and the
// only value on this page that tokens.md does not own.
const DESTRUCTIVE = "hsl(4 66% 30%)";
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
				"destructive-foreground": DESTRUCTIVE_FG,
			},
			borderRadius: {
				// tokens.md §4 — shape
				chip: "9999px",
				button: "9999px",
				card: "24px",
				tile: "28px",
				sheet: "32px",
				"tab-active": "14px",
			},
		},
	},
	plugins: [],
};
