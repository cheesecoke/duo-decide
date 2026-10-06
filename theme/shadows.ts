import { Platform, type ViewStyle } from "react-native";

/**
 * Elevation tokens — derived from design-refs/tokens.md §3.
 *
 *   shadow.card  = 0 4px 16px hsl(220 20% 20% / 0.06)   cards
 *   shadow.float = 0 8px 24px hsl(220 20% 20% / 0.10)   tab bar, sheets
 *
 * These live here rather than in `tailwind.config.js` because there is no
 * NativeWind class that lands a *matching* shadow on both platforms: the web
 * build wants a `box-shadow`, iOS wants the four `shadow*` props, and Android
 * only has a single `elevation` number. Keeping one object per token means a
 * component says `style={SHADOW.card}` and never spells an HSL itself.
 *
 * The Android `elevation` values are the nearest match to the blur radii, not
 * a derivation — Android's shadow is drawn by the platform and cannot be
 * given an offset or an opacity.
 */

const SHADOW_COLOR = "hsl(220 20% 20%)";

export const SHADOW = {
	card: Platform.select<ViewStyle>({
		web: { boxShadow: "0 4px 16px hsl(220 20% 20% / 0.06)" } as ViewStyle,
		default: {
			shadowColor: SHADOW_COLOR,
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.06,
			shadowRadius: 16,
			elevation: 2,
		},
	}) as ViewStyle,

	float: Platform.select<ViewStyle>({
		web: { boxShadow: "0 8px 24px hsl(220 20% 20% / 0.10)" } as ViewStyle,
		default: {
			shadowColor: SHADOW_COLOR,
			shadowOffset: { width: 0, height: 8 },
			shadowOpacity: 0.1,
			shadowRadius: 24,
			elevation: 6,
		},
	}) as ViewStyle,
} as const;
