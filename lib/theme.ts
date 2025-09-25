export const theme = {
	colors: {
		tertiary: {
			light: "hsl(0, 0%, 26%)", // #424242
			dark: "hsl(0, 0%, 26%)", // #424242
		},
		background: {
			light: "hsl(0, 0%, 100%)", // white
			dark: "hsl(240, 10%, 3.9%)",
		},
		foreground: {
			light: "hsl(0, 0%, 14.5%)", // dark text
			dark: "hsl(0, 0%, 98%)",
		},
		card: {
			light: "hsl(0, 0%, 100%)", // white cards
			dark: "hsl(240, 10%, 3.9%)",
		},
		cardForeground: {
			light: "hsl(0, 0%, 14.5%)",
			dark: "hsl(0, 0%, 98%)",
		},
		popover: {
			light: "hsl(0, 0%, 100%)",
			dark: "hsl(240, 10%, 3.9%)",
		},
		popoverForeground: {
			light: "hsl(0, 0%, 14.5%)",
			dark: "hsl(0, 0%, 98%)",
		},
		primary: {
			light: "hsl(0, 0%, 20.5%)", // dark primary
			dark: "hsl(0, 0%, 98%)",
		},
		primaryForeground: {
			light: "hsl(0, 0%, 98.5%)", // white text on dark
			dark: "hsl(240, 5.9%, 10%)",
		},
		secondary: {
			light: "hsl(0, 0%, 97%)", // light gray
			dark: "hsl(240, 3.7%, 15.9%)",
		},
		secondaryForeground: {
			light: "hsl(0, 0%, 20.5%)",
			dark: "hsl(0, 0%, 98%)",
		},
		muted: {
			light: "hsl(0, 0%, 97%)", // very light gray
			dark: "hsl(240, 3.7%, 15.9%)",
		},
		mutedForeground: {
			light: "hsl(0, 0%, 55.6%)", // medium gray text
			dark: "hsl(240, 5%, 64.9%)",
		},
		accent: {
			light: "hsl(0, 0%, 97%)",
			dark: "hsl(240, 3.7%, 15.9%)",
		},
		accentForeground: {
			light: "hsl(0, 0%, 20.5%)",
			dark: "hsl(0, 0%, 98%)",
		},
		destructive: {
			light: "hsl(4, 66%, 30%)", // #811F1A
			dark: "hsl(4, 66%, 30%)", // #811F1A
		},
		destructiveForeground: {
			light: "hsl(0, 0%, 100%)",
			dark: "hsl(0, 85.7%, 97.3%)",
		},
		border: {
			light: "hsl(0, 0%, 92.2%)", // light border
			dark: "hsl(240, 3.7%, 15.9%)",
		},
		input: {
			light: "hsl(0, 0%, 92.2%)", // light input border
			dark: "hsl(240, 3.7%, 15.9%)",
		},
		ring: {
			light: "hsl(0, 0%, 70.8%)",
			dark: "hsl(240, 4.9%, 83.9%)",
		},
		yellow: {
			light: "hsl(48, 96%, 53%)", // yellow-400 equivalent
			dark: "hsl(48, 96%, 53%)",
		},
		yellowForeground: {
			light: "hsl(0, 0%, 0%)", // black text on yellow
			dark: "hsl(0, 0%, 0%)",
		},
		green: {
			light: "rgba(76, 217, 100, 1)", // Success green #4CD964
			dark: "rgba(76, 217, 100, 1)",
		},
		greenForeground: {
			light: "hsl(0, 0%, 100%)", // white text on green
			dark: "hsl(0, 0%, 100%)",
		},
		round1: {
			light: "rgba(255, 185, 198, 1)", // Salmon #FFB9C6
			dark: "rgba(255, 185, 198, 1)",
		},
		round2: {
			light: "rgba(170, 211, 255, 1)", // Baby blue #AAD3FF
			dark: "rgba(170, 211, 255, 1)",
		},
		round3: {
			light: "rgba(170, 147, 243, 1)", // Purple #AA93F3
			dark: "rgba(170, 147, 243, 1)",
		},
		success: {
			light: "rgba(76, 217, 100, 1)", // Success green #4CD964
			dark: "rgba(76, 217, 100, 1)",
		},
	},
	sizes: {
		xs: 4,
		sm: 8,
		md: 12,
		lg: 16,
		xl: 20,
		"2xl": 24,
		"3xl": 32,
		"4xl": 40,
		"5xl": 48,
		"6xl": 64,
	},
	fontSizes: {
		xs: 12,
		sm: 14,
		base: 16,
		lg: 18,
		xl: 20,
		"2xl": 24,
		"3xl": 30,
		"4xl": 36,
		"5xl": 48,
		"6xl": 60,
	},
	borderRadius: {
		none: 0,
		sm: 2,
		md: 6,
		lg: 8,
		xl: 12,
		"2xl": 16,
		"3xl": 24,
		full: 9999,
	},
};

export type Theme = typeof theme;
export type ColorKey = keyof typeof theme.colors;
export type ColorMode = "light" | "dark";
