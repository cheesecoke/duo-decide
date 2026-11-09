import { Platform, type ViewStyle } from "react-native";

/**
 * Elevation tokens — derived from design-refs/tokens.md §3.
 *
 *   shadow.card  = 0 4px 16px hsl(30 18% 24% / 0.10),   cards
 *                  0 1px 3px  hsl(30 18% 24% / 0.06)
 *   shadow.float = 0 8px 24px hsl(220 20% 20% / 0.10)   tab bar, sheets
 *
 * `card` is the app icon's heart shadow, scaled up: a small drop straight
 * down, soft, low-opacity, in a warm dark taken from the surface's own side
 * of the wheel (brand-heart.svg's `feDropShadow` is a darker shade of the
 * heart's hue at 0.28, offset 0.35 of a 24 px box). The old cool slate at
 * 0.06 all but vanished against the cream page on a phone. Web gets a second,
 * tight contact layer that iOS cannot stack; iOS makes up for it with a
 * little more opacity. (Note for tokens.md §3: `card` changed in Nov 2026.)
 *
 * iOS's `shadowRadius` is not CSS's blur radius: Core Animation's radius is
 * roughly half the CSS blur for the same softness, so the 16 px web blur is
 * an 8 pt `shadowRadius`. Spelling 16 on both made the iOS shadow twice as
 * diffuse, which at this opacity is invisible.
 *
 * A shadow is drawn *outside* its view, so the view that carries one must not
 * clip — `overflow: hidden` masks the shadow on iOS. `Card` therefore puts
 * the shadow on an outer view and the clip on an inner one.
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

/**
 * The card shadow's warm dark. Space-separated hsl is fine for a shadow
 * colour on native; the slash-alpha form is not (see neutrals.ts `scrim`),
 * which is why the alpha lives in `shadowOpacity`.
 */
const CARD_SHADOW_COLOR = "hsl(30 18% 24%)";

export const SHADOW = {
	card: Platform.select<ViewStyle>({
		web: {
			boxShadow: "0 4px 16px hsl(30 18% 24% / 0.10), 0 1px 3px hsl(30 18% 24% / 0.06)",
		} as ViewStyle,
		default: {
			shadowColor: CARD_SHADOW_COLOR,
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.12,
			shadowRadius: 8,
			// Android draws its own shadow from this one number (tinted by
			// `shadowColor` on API 28+). 3 is a soft lift, not a material slab.
			elevation: 3,
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
