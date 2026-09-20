import * as React from "react";
import { View } from "react-native";
import Animated, { useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Line, Path } from "react-native-svg";

import { Caption, Numeral } from "@/components/ui/reusables/headline/headline";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import { DUR } from "@/theme/motion";
import { NEUTRAL } from "@/theme/neutrals";
import { usePersonColors } from "@/theme/usePersonColors";

/**
 * Gauge — the half-ring split of a pair's decisions (tokens.md §7 component 9;
 * ref design-refs/fintech-pill-clusters.webp "Credit Health").
 *
 * A's share grows in from the left in `person.a.base`, B's in from the right
 * in `person.b.base`, and where they meet a 4 px notch of `bg` keeps the two
 * round caps from reading as one continuous ring. The `line` track sits under
 * both, so an empty gauge still has a shape.
 *
 * ## How the arcs are drawn
 *
 * Each arc is the *same* half ring as the track, dashed rather than
 * trimmed — one dash of the share's length followed by a gap longer than the
 * path, so exactly `share × π r` of it is painted and the round cap lands on
 * the real end of the visible run. B's path is the same semicircle written
 * backwards (`M` at the right end, sweep flag flipped) so its dash grows the
 * other way without any second coordinate system.
 *
 * The share therefore lives in `strokeDasharray`, which is a plain prop, and
 * only `strokeDashoffset` is animated. That split is deliberate: the drawn
 * share is assertable in a test that never runs a frame, and the reveal is
 * one number per arc going to zero over `dur.reveal`.
 *
 * Under reduce-motion the arcs are simply there.
 */

type GaugeSize = 160 | 220;

type GaugeProps = {
	/** Person A's count — decisions, votes, whatever the caller is splitting. */
	a: number;
	b: number;
	/** Sits under the numeral, at caption size. */
	label?: string;
	size?: GaugeSize;
	className?: string;
	/** Defaults to the label and the total; override for a fuller sentence. */
	accessibilityLabel?: string;
};

/** tokens.md §7: stroke 14, round caps. */
const STROKE = 14;
/** The bite taken out of the ring where the two shares meet. */
const GAP = 4;

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Shares = {
	/** 0–1 */
	a: number;
	/** 0–1 */
	b: number;
	/** The sanitised sum, which is also what the numeral shows. */
	total: number;
};

/**
 * The gauge's whole arithmetic, kept pure and exported so it can be tested
 * without rendering an SVG.
 *
 * Counts arrive from the database, so they are sanitised rather than trusted:
 * negatives and non-finite values count as zero. A zero total returns zero
 * shares rather than 0.5/0.5 — "nobody has decided anything" is not a tie,
 * and the caller must be able to tell the difference to draw the empty state.
 */
function computeShares(a: number, b: number): Shares {
	const safeA = Number.isFinite(a) ? Math.max(0, a) : 0;
	const safeB = Number.isFinite(b) ? Math.max(0, b) : 0;
	const total = safeA + safeB;

	if (total === 0) return { a: 0, b: 0, total: 0 };
	return { a: safeA / total, b: safeB / total, total };
}

function Gauge({ a, b, label, size = 160, className, accessibilityLabel }: GaugeProps) {
	const reducedMotion = useReducedMotion();
	const person = usePersonColors();

	const shares = computeShares(a, b);

	// The ring is inset by half a stroke so the painted band sits inside the
	// box rather than half outside it; the box is then the top half plus the
	// stroke's own overhang below the diameter line.
	const radius = (size - STROKE) / 2;
	const cx = size / 2;
	const cy = size / 2;
	const height = size / 2 + STROKE / 2;
	const length = Math.PI * radius;

	const arcA = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;
	// Same semicircle, written from the right end, so its dash grows leftward.
	const arcB = `M ${cx + radius} ${cy} A ${radius} ${radius} 0 0 0 ${cx - radius} ${cy}`;

	const visibleA = length * shares.a;
	const visibleB = length * shares.b;

	// Offset starts at the dash's own length (nothing painted) and animates to
	// zero (the whole share painted).
	const offsetA = useSharedValue(visibleA);
	const offsetB = useSharedValue(visibleB);
	// The reveal is a mount animation. Afterwards a change in the counts moves
	// `strokeDasharray`, and re-running the reveal for it would look like the
	// gauge redrawing itself every time a decision lands.
	const revealed = React.useRef(false);

	React.useEffect(() => {
		if (revealed.current || reducedMotion) {
			revealed.current = true;
			offsetA.value = 0;
			offsetB.value = 0;
			return;
		}
		revealed.current = true;
		offsetA.value = withTiming(0, { duration: DUR.reveal });
		offsetB.value = withTiming(0, { duration: DUR.reveal });
	}, [reducedMotion, offsetA, offsetB]);

	// Explicit dependency arrays: Reanimated's Babel plugin does not run in
	// Storybook's vite pipeline (see .storybook/main.ts), and without either
	// one the worklet throws on web.
	// https://docs.swmansion.com/react-native-reanimated/docs/guides/web-support
	const propsA = useAnimatedProps(() => ({ strokeDashoffset: offsetA.value }), [offsetA]);
	const propsB = useAnimatedProps(() => ({ strokeDashoffset: offsetB.value }), [offsetB]);

	// A round cap on a zero-length dash paints a dot, so an empty share is not
	// drawn at all — which is also what makes 0 / 0 a bare track.
	const showA = shares.a > 0;
	const showB = shares.b > 0;
	// Nothing to separate unless both are actually on the ring.
	const showDivider = showA && showB;

	// Where the two shares meet, measured up from the right-hand end.
	const meeting = Math.PI * (1 - shares.a);
	const reach = STROKE / 2 + 1;

	return (
		<View
			accessible
			accessibilityLabel={accessibilityLabel ?? `${label ? `${label}: ` : ""}${shares.total}`}
			testID="gauge"
			style={{ width: size, height }}
			className={cn("relative", className)}
		>
			<Svg width={size} height={height} viewBox={`0 0 ${size} ${height}`}>
				<Path
					testID="gauge-track"
					d={arcA}
					stroke={NEUTRAL.line}
					strokeWidth={STROKE}
					strokeLinecap="round"
					fill="none"
				/>

				{showA ? (
					<AnimatedPath
						testID="gauge-arc-a"
						d={arcA}
						stroke={person.a.base}
						strokeWidth={STROKE}
						strokeLinecap="round"
						fill="none"
						// One dash of the share, then a gap longer than the path
						// — so the dash pattern never repeats into view.
						strokeDasharray={`${visibleA} ${length}`}
						animatedProps={propsA}
					/>
				) : null}

				{showB ? (
					<AnimatedPath
						testID="gauge-arc-b"
						d={arcB}
						stroke={person.b.base}
						strokeWidth={STROKE}
						strokeLinecap="round"
						fill="none"
						strokeDasharray={`${visibleB} ${length}`}
						animatedProps={propsB}
					/>
				) : null}

				{showDivider ? (
					// Drawn over both arcs rather than subtracted from them:
					// each arc keeps its round cap, and the notch is the same
					// 4 px whatever the split.
					<Line
						testID="gauge-divider"
						x1={cx + (radius - reach) * Math.cos(meeting)}
						y1={cy - (radius - reach) * Math.sin(meeting)}
						x2={cx + (radius + reach) * Math.cos(meeting)}
						y2={cy - (radius + reach) * Math.sin(meeting)}
						stroke={NEUTRAL.bg}
						strokeWidth={GAP}
						strokeLinecap="butt"
					/>
				) : null}
			</Svg>

			{/* The numeral sits in the bowl of the ring, not on the SVG, so it
			    stays real text for a screen reader and for copy. */}
			<View pointerEvents="none" className="absolute inset-x-0 bottom-0 items-center">
				<Numeral>{String(shares.total)}</Numeral>
				{label ? <Caption>{label}</Caption> : null}
			</View>
		</View>
	);
}

export { computeShares, Gauge, GAP, STROKE };
export type { GaugeProps, GaugeSize, Shares };
