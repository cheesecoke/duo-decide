import * as React from "react";
import { Pressable, type PressableProps } from "react-native";
import Svg, { Path } from "react-native-svg";

import { cn } from "@/lib/utils";
import { NEUTRAL } from "@/theme/neutrals";

/**
 * The 30 px circle in `surface-2` that every card header's controls sit in —
 * the mock's `.iconbtn`.
 *
 * It lived in `decision-queue/decision-card/card-header.tsx` and was imported
 * from there by the Options tab and by `CreateDecisionForm`, which made a
 * screen's private component the app's de-facto primitive (PLAN-3 final
 * review M9). It is one now.
 *
 * The button always carries the accessible name; the mark inside it is
 * decorative, so `ChevronGlyph` renders no label of its own.
 */

type IconButtonProps = {
	label: string;
	onPress: () => void;
	children: React.ReactNode;
	className?: string;
	accessibilityState?: PressableProps["accessibilityState"];
};

function IconButton({ label, onPress, children, className, accessibilityState }: IconButtonProps) {
	return (
		<Pressable
			role="button"
			accessibilityLabel={label}
			accessibilityState={accessibilityState}
			onPress={onPress}
			className={cn(
				"h-[30px] w-[30px] items-center justify-center rounded-chip bg-surface-2",
				className,
			)}
		>
			{children}
		</Pressable>
	);
}

/**
 * The expand/collapse mark, drawn here rather than imported for the reason
 * `decision-queue/decision-card/glyphs.tsx` gives: `assets/icons/*` wraps
 * `phosphor-react-native`, and nothing in the design system pulls that in.
 * Same drawing rules as every other glyph — 24 unit grid, stroke 2, round
 * caps, no fill.
 *
 * It travelled with `IconButton` because it is the one glyph both collapsible
 * cards use, and leaving it behind would have kept the Options tab importing
 * out of `decision-queue/`.
 *
 * Points down when collapsed; the card rotates it 180° on expand.
 */
function ChevronGlyph({ size = 18, color = NEUTRAL.ink2 }: { size?: number; color?: string }) {
	return (
		<Svg testID="glyph-chevron" width={size} height={size} viewBox="0 0 24 24" fill="none">
			<Path
				d="M6 9.5 12 15.5 18 9.5"
				stroke={color}
				strokeWidth={2}
				strokeLinecap="round"
				strokeLinejoin="round"
				fill="none"
			/>
		</Svg>
	);
}
ChevronGlyph.displayName = "glyph-chevron";

export { IconButton, ChevronGlyph };
export type { IconButtonProps };
