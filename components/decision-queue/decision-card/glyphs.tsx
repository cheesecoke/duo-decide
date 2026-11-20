import * as React from "react";
import Svg, { Path } from "react-native-svg";

import { NEUTRAL } from "@/theme/neutrals";

/**
 * The card's icons, drawn here rather than imported.
 *
 * `assets/icons/*` wraps `phosphor-react-native`, and nothing in the v2
 * design system pulls that in — the TabBar takes its icons as a render prop
 * precisely so the primitives stay free of an icon dependency. A handful of
 * single-stroke marks on a 24 unit grid is less code than teaching
 * Storybook's vite pipeline to transpile a native icon package, and it keeps
 * these glyphs on the same drawing rules as `Character` (stroke 2, round
 * caps, no fill).
 *
 * Every one of them is decorative: the pressable around it always carries the
 * accessible label, so none of these render a label of their own.
 *
 * The chevron is not here: it is the one mark both collapsible cards use, so
 * it travelled with `IconButton` into
 * `components/ui/reusables/icon-button/` rather than leave the Options tab
 * importing out of `decision-queue/` (PLAN-3 final review M9).
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

export const PencilGlyph = stroke(
	["M4 20h4L18.5 9.5l-4-4L4 16v4Z", "M14.5 5.5l4 4"],
	"glyph-pencil",
);

export const CloseGlyph = stroke(["M6.5 6.5 17.5 17.5", "M17.5 6.5 6.5 17.5"], "glyph-close");

export const CheckGlyph = stroke(["M5 12.5 9.5 17 19 7"], "glyph-check");

/**
 * Trash and dots both went to `reusables/card-menu/` (tweak T3): the options
 * tab draws the same delete row now, and it cannot reach into this folder for
 * the mark. The trash is re-exported here because the edit bodies use it for
 * their own remove buttons and there is no second drawing of it.
 */
export { TrashGlyph } from "@/components/ui/reusables/card-menu/card-menu";

export const PlusGlyph = stroke(["M12 5.5v13", "M5.5 12h13"], "glyph-plus");

/**
 * Mode, the way FEATURE-INVENTORY §1.10a signals it: a poll is bars (its
 * rounds narrow down), a vote is one box and one tick (one round, one call).
 */
export const PollGlyph = stroke(["M6 19v-6", "M12 19V5", "M18 19v-9"], "glyph-poll");

export const VoteGlyph = stroke(["M5 5.5h14v13H5z", "M8.5 12l2.5 2.5 4.5-5"], "glyph-vote");

/** The queue's search: a lens and its handle. */
export const SearchGlyph = stroke(
	["M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z", "M15.5 15.5 20 20"],
	"glyph-search",
);

/**
 * The decided card's follow-ups (decision-card.model.ts `resolveFooter`): a
 * calendar page with its two rings, an arrow leaving a box (a link out), and
 * an arrow on (the next decision).
 */
export const CalendarGlyph = stroke(
	["M5 6.5h14v13H5z", "M5 10.5h14", "M9 4v4", "M15 4v4"],
	"glyph-calendar",
);

export const LinkOutGlyph = stroke(
	["M11 6.5H5.5v12h12V13", "M14 5h5v5", "M19 5l-7.5 7.5"],
	"glyph-link-out",
);

export const NextGlyph = stroke(["M5 12h14", "M13.5 6.5 19 12l-5.5 5.5"], "glyph-next");
