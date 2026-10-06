import * as React from "react";
import { View } from "react-native";

import { cn } from "@/lib/utils";

/**
 * The row pinned to the bottom of a screen (the "New decision" / "New list"
 * buttons). Same geometry as the v1 Emotion component — absolute, the 786 cap,
 * centred, `z-3` so it sits over the scrolling body — on token classes.
 *
 * `background="solid"` paints the page fill (`bg`, tokens.md §3) so content
 * scrolling underneath does not show through; `"transparent"` is for callers
 * that sit on a surface that already paints itself.
 *
 * `pointerEvents="box-none"` keeps the bar itself untappable: only the buttons
 * inside it take presses, so the strip either side of them does not swallow a
 * tap meant for the list behind.
 *
 * ## Why both `mx-auto` and `self-center`
 *
 * `mx-auto` is what actually centres the 786 cap, and it is what v1 had
 * (`margin-left: auto; margin-right: auto`). On web this box is absolutely
 * positioned with `left: 0` *and* `right: 0` *and* a `max-width` — an
 * over-constrained case CSS resolves by honouring `left` and pushing the bar
 * to the gutter, unless the horizontal margins are `auto`. `align-self` does
 * not rescue it. Yoga takes auto margins too, so native centres the same way.
 *
 * `self-center` stays because it is harmless and says the intent at a glance.
 */

/**
 * The footer's total height: a 56 px pill (`h-14`) inside `py-2.5`. Screens
 * that mount one hand this to `ContentLayout footerInset` so the last card
 * scrolls clear of it — the footer is absolute and reserves no room itself.
 */
export const FIXED_FOOTER_HEIGHT = 56 + 2 * 10;

interface FixedFooterProps {
	children: React.ReactNode;
	background?: "solid" | "transparent";
}

export function FixedFooter({ children, background = "solid" }: FixedFooterProps) {
	return (
		<View
			pointerEvents="box-none"
			className={cn(
				"absolute bottom-0 left-0 right-0 z-[3] mx-auto w-full max-w-[786px] items-center self-center px-5 py-2.5",
				background === "solid" && "bg-bg",
			)}
		>
			{children}
		</View>
	);
}
