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
 */

interface FixedFooterProps {
	children: React.ReactNode;
	background?: "solid" | "transparent";
}

export function FixedFooter({ children, background = "solid" }: FixedFooterProps) {
	return (
		<View
			pointerEvents="box-none"
			className={cn(
				"absolute bottom-0 left-0 right-0 z-[3] w-full max-w-[786px] items-center self-center px-5 py-2.5",
				background === "solid" && "bg-bg",
			)}
		>
			{children}
		</View>
	);
}
