import * as React from "react";
import Svg, { Path } from "react-native-svg";

import { NEUTRAL } from "@/theme/neutrals";

/**
 * The card's icons, drawn here rather than imported.
 *
 * `assets/icons/*` wraps `phosphor-react-native`, and nothing in the v2
 * design system pulls that in — the TabBar takes its icons as a render prop
 * precisely so the primitives stay free of an icon dependency. Seven
 * single-stroke marks on a 24 unit grid is less code than teaching
 * Storybook's vite pipeline to transpile a native icon package, and it keeps
 * these glyphs on the same drawing rules as `Character` (stroke 2, round
 * caps, no fill).
 *
 * Every one of them is decorative: the pressable around it always carries the
 * accessible label, so none of these render a label of their own.
 */

type GlyphProps = {
	size?: number;
	color?: string;
};

const DEFAULT_SIZE = 18;

function stroke(paths: readonly string[], testID: string) {
	function Glyph({ size = DEFAULT_SIZE, color = NEUTRAL.ink2 }: GlyphProps) {
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

/** Points down when collapsed; the card rotates it 180° on expand. */
export const ChevronGlyph = stroke(["M6 9.5 12 15.5 18 9.5"], "glyph-chevron");

export const PencilGlyph = stroke(
	["M4 20h4L18.5 9.5l-4-4L4 16v4Z", "M14.5 5.5l4 4"],
	"glyph-pencil",
);

export const TrashGlyph = stroke(
	["M4.5 7h15", "M10 4.5h4", "M6.5 7 7.5 20h9L17.5 7", "M10.5 11v5.5", "M13.5 11v5.5"],
	"glyph-trash",
);

export const CloseGlyph = stroke(["M6.5 6.5 17.5 17.5", "M17.5 6.5 6.5 17.5"], "glyph-close");

export const CheckGlyph = stroke(["M5 12.5 9.5 17 19 7"], "glyph-check");

export const PlusGlyph = stroke(["M12 5.5v13", "M5.5 12h13"], "glyph-plus");

/** More — the header overflow the delete lives behind. */
export const DotsGlyph = stroke(["M12 6.5v.01", "M12 12v.01", "M12 17.5v.01"], "glyph-dots");

/**
 * Mode, the way FEATURE-INVENTORY §1.10a signals it: a poll is bars (its
 * rounds narrow down), a vote is one box and one tick (one round, one call).
 */
export const PollGlyph = stroke(["M6 19v-6", "M12 19V5", "M18 19v-9"], "glyph-poll");

export const VoteGlyph = stroke(["M5 5.5h14v13H5z", "M8.5 12l2.5 2.5 4.5-5"], "glyph-vote");
