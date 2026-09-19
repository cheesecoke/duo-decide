/** @type {import('tailwindcss').Config} */
// Theme is DERIVED from active/sprint-2026-09/design-refs/tokens.md (v0).
// Edit tokens.md first, then regenerate this file.
module.exports = {
	content: [
		"./app/**/*.{js,jsx,ts,tsx}",
		"./components/**/*.{js,jsx,ts,tsx}",
		"./theme/**/*.{js,jsx,ts,tsx}",
		"./.storybook/**/*.{js,jsx,ts,tsx}",
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

				// tokens.md §3 — neutral surfaces (light only for v1), literal values
				bg: "hsl(40 20% 98%)",
				surface: "#FFFFFF",
				"surface-2": "hsl(40 15% 95%)",
				ink: "hsl(220 15% 14%)",
				"ink-2": "hsl(220 10% 46%)",
				"ink-3": "hsl(220 8% 68%)",
				line: "hsl(40 12% 90%)",
				cta: "hsl(220 15% 14%)",
				"cta-fg": "#FFFFFF",
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
