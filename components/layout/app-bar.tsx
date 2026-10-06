import * as React from "react";
import { View, type TextStyle } from "react-native";
import Svg, { Path } from "react-native-svg";

import { HeartMark } from "@/components/ui/reusables/heart-mark/heart-mark";
import { Text } from "@/components/ui/reusables/text/text";
import { cn } from "@/lib/utils";
import { NEUTRAL } from "@/theme/neutrals";
import { usePersonColors } from "@/theme/usePersonColors";

/**
 * AppBar — the global header's chrome, and nothing else
 * (FEATURE-INVENTORY §0.2; the mock's `.appbar` / `.brand` / `.circ`,
 * design-refs/mocks/decision-queue-round-3.html:87-93, :431-437).
 *
 * The bar is **pure**: a brand on the left, whatever node the caller hands it
 * on the right. Deciding *which* node that is — the custom `navButton`, the
 * settings circle, the back circle — is routing and drawer work and stays in
 * `Header.tsx`. Splitting it that way is what lets the bar have stories at
 * all: `Header` reaches expo-router, Supabase and the drawer context, none of
 * which resolve inside Storybook's vite build.
 *
 * The heart is person A's `base`, so the shell picks up the couple's hue the
 * moment the pair changes — the same thread tokens.md §1 runs through the
 * cards and the tab bar. The mark itself is
 * `reusables/heart-mark`: it is the app's brand mark, and the header, Welcome
 * and the auth screens all wear it. It is re-exported from here because this
 * file owned it first and `HeartMark` is the name the header's tests and
 * stories already know.
 */

/** Three rules — the mock's settings button (`#settingsBtn`, :91). */
function MenuGlyph({ color = NEUTRAL.ink2, size = 17 }: { color?: string; size?: number }) {
	return (
		<Svg testID="glyph-menu" width={size} height={size} viewBox="0 0 24 24" fill="none">
			{["M4 7h16", "M4 12h16", "M4 17h16"].map((d) => (
				<Path key={d} d={d} stroke={color} strokeWidth={2} strokeLinecap="round" fill="none" />
			))}
		</Svg>
	);
}

/** The back arrow. The mock has no back route, so this is the system mark. */
function BackGlyph({ color = NEUTRAL.ink2, size = 17 }: { color?: string; size?: number }) {
	return (
		<Svg testID="glyph-back" width={size} height={size} viewBox="0 0 24 24" fill="none">
			{["M19 12H5", "M11 6 5 12l6 6"].map((d) => (
				<Path
					key={d}
					d={d}
					stroke={color}
					strokeWidth={2}
					strokeLinecap="round"
					strokeLinejoin="round"
					fill="none"
				/>
			))}
		</Svg>
	);
}

/**
 * The wordmark keeps Outfit 600 (FEATURE-INVENTORY §0.2). Family and tracking
 * are a real style rather than classes because there is no `fontFamily` scale
 * in tailwind.config.js to hang a token on, and NativeWind has no
 * arbitrary-family class that survives the RN bridge.
 *
 * The family name is the key `app/_layout.tsx` loads the face under — the
 * wordmark is the app's only non-system font, so it is spelled here rather
 * than in a one-entry font table.
 */
const WORDMARK_STYLE: TextStyle = {
	fontFamily: "Outfit_600SemiBold",
	letterSpacing: -0.3,
};

type AppBarProps = {
	/** The right slot. `Header` decides which of §0.2's three it is. */
	right?: React.ReactNode;
	className?: string;
};

function AppBar({ right, className }: AppBarProps) {
	const person = usePersonColors();

	return (
		<View
			testID="app-bar"
			className={cn(
				// §0.2 keeps the 786 cap and the centring; the mock's 20 px
				// gutter replaces the old 30.
				"w-full max-w-[786px] flex-row items-center justify-between self-center px-5 py-2",
				className,
			)}
		>
			<View className="flex-row items-center gap-2">
				<HeartMark color={person.a.base} />
				<Text style={WORDMARK_STYLE} className="text-[20px] font-semibold leading-[26px] text-ink">
					Duo
				</Text>
			</View>

			{right ?? null}
		</View>
	);
}

export { AppBar, BackGlyph, HeartMark, MenuGlyph };
export type { AppBarProps };
