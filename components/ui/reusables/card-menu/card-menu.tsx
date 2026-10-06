import * as React from "react";
import { Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { IconButton } from "@/components/ui/reusables/icon-button/icon-button";
import { Text } from "@/components/ui/reusables/text/text";
import { cn } from "@/lib/utils";
import { NEUTRAL } from "@/theme/neutrals";
import { SHADOW } from "@/theme/shadows";

/**
 * CardMenu — the `⋯` overflow every card header hides its destructive
 * actions behind.
 *
 * It was the decision card's private markup. The options tab grew the same
 * need and copied the *other* pattern instead — a bare trash circle at the
 * bottom of the open card — so the app had two delete gestures for the same
 * kind of object. One of them is now this (tweak T3).
 *
 * **Why three exports and not one.** The trigger belongs in the header's
 * control cluster; the panel has to float over everything below it, which on
 * both platforms means being a sibling at the card's own level rather than a
 * child of a 30 px button. They live in different places in the tree, so the
 * open state lives in neither of them: `useCardMenu` holds it and the two
 * halves share it. That also keeps the closing rules in one place — an item
 * press closes, and a second press on the trigger closes.
 *
 * The panel is positioned by the card, not by this file: `className` lands on
 * it, and the default (`right-3.5 top-[52px]`) is the decision card's, which
 * is the measurement every other card header is built to.
 */

type CardMenuItem = {
	/** The row's copy *and* its accessible name — they are the same thing. */
	label: string;
	onPress: () => void;
	/** Paints the row `destructive`. Delete is the only one so far. */
	destructive?: boolean;
	/** Decorative: the row carries the name, so the mark needs none. */
	icon?: React.ReactNode;
};

type CardMenuState = {
	open: boolean;
	toggle: () => void;
	close: () => void;
};

type CardMenuProps = {
	menu: CardMenuState;
	items: readonly CardMenuItem[];
	testID?: string;
	className?: string;
};

type CardMenuTriggerProps = {
	menu: CardMenuState;
	/** Overridable, but "More" is what every card says. */
	label?: string;
};

/**
 * The marks this menu is drawn with, here rather than imported for the reason
 * `icon-button.tsx` gives about its chevron: `assets/icons/*` wraps
 * `phosphor-react-native`, and nothing in the design system pulls that in.
 * Same rules as every other glyph — 24 unit grid, stroke 2, round caps, no
 * fill — and both are decorative, since the control around them is named.
 *
 * `TrashGlyph` is here and not in `decision-queue/decision-card/glyphs.tsx`
 * so that the options tab can draw the identical delete row without importing
 * out of another feature's folder. That file re-exports this one; the edit
 * bodies that use it for their own remove buttons did not have to move.
 */
function glyph(paths: readonly string[], testID: string) {
	function Glyph({ size = 18, color = NEUTRAL.ink2 }: { size?: number; color?: string }) {
		return (
			<Svg testID={testID} width={size} height={size} viewBox="0 0 24 24" fill="none">
				{paths.map((d) => (
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
	Glyph.displayName = testID;
	return Glyph;
}

/** More — the three dots the menu hangs off. */
const DotsGlyph = glyph(["M12 6.5v.01", "M12 12v.01", "M12 17.5v.01"], "glyph-dots");

/** Delete — the one item every card menu has so far. */
const TrashGlyph = glyph(
	["M4.5 7h15", "M10 4.5h4", "M6.5 7 7.5 20h9L17.5 7", "M10.5 11v5.5", "M13.5 11v5.5"],
	"glyph-trash",
);

/** The open state the trigger and the panel share. */
function useCardMenu(): CardMenuState {
	const [open, setOpen] = React.useState(false);

	return React.useMemo(
		() => ({
			open,
			toggle: () => setOpen((current) => !current),
			close: () => setOpen(false),
		}),
		[open],
	);
}

function CardMenuTrigger({ menu, label = "More" }: CardMenuTriggerProps) {
	return (
		<IconButton label={label} accessibilityState={{ expanded: menu.open }} onPress={menu.toggle}>
			<DotsGlyph />
		</IconButton>
	);
}

function CardMenu({ menu, items, testID, className }: CardMenuProps) {
	if (!menu.open) return null;

	return (
		<View
			testID={testID}
			style={SHADOW.float}
			className={cn(
				"absolute right-3.5 top-[52px] z-10 min-w-[172px] rounded-[18px] bg-surface p-1.5",
				className,
			)}
		>
			{items.map((item) => (
				<Pressable
					key={item.label}
					role="button"
					accessibilityLabel={item.label}
					onPress={() => {
						menu.close();
						item.onPress();
					}}
					className="flex-row items-center gap-2.5 rounded-xl px-3 py-2.5"
				>
					{item.icon}
					<Text
						className={cn("text-row font-medium", item.destructive ? "text-destructive" : "text-ink")}
					>
						{item.label}
					</Text>
				</Pressable>
			))}
		</View>
	);
}

export { CardMenu, CardMenuTrigger, useCardMenu, DotsGlyph, TrashGlyph };
export type { CardMenuItem, CardMenuProps, CardMenuState, CardMenuTriggerProps };
