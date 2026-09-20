import * as React from "react";
import { Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { cva, type VariantProps } from "class-variance-authority";

import { Text, TextClassContext } from "@/components/ui/reusables/text/text";
import { cn } from "@/lib/utils";
import { NEUTRAL } from "@/theme/neutrals";

/**
 * Tile — the large tinted section block (tokens.md §7 component 5, after
 * design-refs/soft-editorial-bubbles.webp).
 *
 * Where a Card holds one decision, a Tile is a doorway: a whole area of the
 * app, sized so it reads as a destination rather than a row. Hence the 28 px
 * corners, the 160 px floor, and the round arrow button that sits in the
 * bottom-right corner of every one of them.
 *
 * The arrow is drawn, not typed. A "↗" glyph renders at a different weight and
 * baseline on every platform; two stroked paths are the same 1.75 px arrow
 * everywhere and recolour with the token.
 */

const tileVariants = cva("min-h-40 justify-between rounded-tile p-5", {
	variants: {
		tint: {
			a: "bg-person-a-tint",
			b: "bg-person-b-tint",
			"surface-2": "bg-surface-2",
		},
	},
	defaultVariants: { tint: "surface-2" },
});

type TileProps = VariantProps<typeof tileVariants> & {
	title: string;
	subtitle?: string;
	tint: "a" | "b" | "surface-2";
	onPress: () => void;
	/** Bottom-left slot — a character, a count, a stack of avatars. */
	illustration?: React.ReactNode;
	className?: string;
};

/** tokens.md §7: "small round arrow button". 32 px circle on `surface`. */
function ArrowButton() {
	return (
		// Decorative: the whole tile is the button, so the arrow must not
		// become a second touch target or a second thing to read out.
		<View
			pointerEvents="none"
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			className="h-8 w-8 items-center justify-center rounded-chip bg-surface"
		>
			<Svg width={14} height={14} viewBox="0 0 16 16" fill="none">
				{/* shaft, then head — drawn separately so the join stays square */}
				<Path
					d="M5 11L11 5"
					stroke={NEUTRAL.ink}
					strokeWidth={1.75}
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				<Path
					d="M6 5H11V10"
					stroke={NEUTRAL.ink}
					strokeWidth={1.75}
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</Svg>
		</View>
	);
}

function Tile({ title, subtitle, tint, onPress, illustration, className }: TileProps) {
	return (
		<Pressable
			role="button"
			accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
			onPress={onPress}
			className={cn(tileVariants({ tint }), className)}
		>
			<View className="gap-1">
				{/* tokens.md §5 title 20/26 600 and body 16/22 on `ink-2`. */}
				<TextClassContext.Provider value="text-[20px] font-semibold leading-[26px] text-ink">
					<Text>{title}</Text>
				</TextClassContext.Provider>
				{subtitle ? (
					<TextClassContext.Provider value="text-[16px] leading-[22px] text-ink-2">
						<Text>{subtitle}</Text>
					</TextClassContext.Provider>
				) : null}
			</View>

			{/* The slot renders even when empty: `justify-between` with a single
			    child would pull the arrow to the left edge. */}
			<View className="mt-4 flex-row items-end justify-between">
				<View>{illustration}</View>
				<ArrowButton />
			</View>
		</Pressable>
	);
}

export { Tile, tileVariants };
export type { TileProps };
