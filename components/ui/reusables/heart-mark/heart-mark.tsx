import * as React from "react";
import Svg, { Path } from "react-native-svg";

/**
 * HeartMark — the app's brand mark.
 *
 * One drawing, three places: the global header wears it at 20 px beside the
 * wordmark (`components/layout/app-bar.tsx`), Welcome at 64 px as the
 * screen's centrepiece, and the six auth screens at 40 px above their title.
 * It is the application's main icon; the characters (`reusables/character`)
 * are the queue's and the vote rows' vocabulary, not the brand's.
 *
 * It lived inside `app-bar.tsx` while the header was its only caller. Welcome
 * and the auth shell made it the third and fourth, so it is a piece of the
 * system now, on the same `<name>/<name>.tsx` + stories + tests shape as the
 * rest of `reusables/`. `app-bar.tsx` still re-exports the name it used to
 * own, so nothing that imported it from there had to move.
 *
 * ## Colour
 *
 * The mark takes a `color` rather than reading the pair itself, because the
 * two callers that are inside a `PersonPairProvider` pass
 * `usePersonColors().a.base` — person A's hue, the viewer's own — and a
 * story or a screenshot wants to hand it any colour at all. tokens.md §1 is
 * what makes A the right seat: the shell picks up the couple's hue the moment
 * the pair changes, the same thread that runs through the cards and the tab
 * bar.
 *
 * ## One stroke weight, tapered
 *
 * The path is drawn on a 20 × 18 grid, so a fixed stroke in grid units
 * multiplies with the size: the header's 1.9 would land at 6 real px on the
 * 64 px Welcome mark — nearly twice the weight `Character` carries at 160
 * (character.tsx, `STROKE_WIDTH`) and heavy enough to close the notch.
 *
 * `taperedStroke` keeps the rendered line inside the system's band instead:
 * 1.9 px at 20 (the header, unchanged to the decimal), ~2.7 at 40, ~3.4 at
 * 64. A caller that wants a specific weight passes `strokeWidth` in grid
 * units and the taper steps aside.
 */

/** The grid the path is drawn on, and the size the taper is anchored at. */
const VIEW_BOX = { width: 20, height: 18 } as const;
const BASE_SIZE = 20;
const BASE_STROKE = 1.9;

/**
 * Stroke in grid units, such that the rendered weight grows with the square
 * root of the size rather than with the size. Pure and exported so the curve
 * is table-tested rather than eyeballed off a story.
 */
function taperedStroke(size: number): number {
	return BASE_STROKE * Math.sqrt(BASE_SIZE / size);
}

type HeartMarkProps = {
	/** A colour value — the two in-app callers pass `person.a.base`. */
	color: string;
	/** Width in px; the height follows the 20 × 18 grid. */
	size?: number;
	/** Stroke in grid units. Defaults to the tapered weight for `size`. */
	strokeWidth?: number;
};

function HeartMark({ color, size = BASE_SIZE, strokeWidth }: HeartMarkProps) {
	return (
		<Svg
			testID="brand-heart"
			width={size}
			height={(size * VIEW_BOX.height) / VIEW_BOX.width}
			viewBox={`0 0 ${VIEW_BOX.width} ${VIEW_BOX.height}`}
			fill="none"
		>
			<Path
				d="M10 16.2C5.6 13 1.6 10.2 1.6 6.3 1.6 3.7 3.6 2 5.9 2c1.7 0 3.2 1 4.1 2.4C10.9 3 12.4 2 14.1 2c2.3 0 4.3 1.7 4.3 4.3 0 3.9-4 6.7-8.4 9.9Z"
				stroke={color}
				strokeWidth={strokeWidth ?? taperedStroke(size)}
				strokeLinejoin="round"
				fill="none"
			/>
		</Svg>
	);
}

export { HeartMark, taperedStroke };
export type { HeartMarkProps };
