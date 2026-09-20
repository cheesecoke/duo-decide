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
 * only the reveal is animated. That split is deliberate: the drawn share is
 * assertable in a test that never runs a frame.
 *
 * ## Where the two colours actually meet
 *
 * Not at `share × π r`. Both dashes are round-capped, so each paints half a
 * stroke (7 px) *past* its own end, and B is drawn after A — so B's cap lands
 * on top of A's last 7 px and the visible sage→blush seam sits at
 * `visibleA − STROKE / 2`. The notch is placed there, not at the nominal
 * share, or it sits a visible 5 px inside the B arc. This is paint-order
 * dependent: swap the two `<AnimatedPath>` elements below and the seam moves
 * to `visibleA + STROKE / 2`.
 *
 * ## The reveal
 *
 * One `reveal` value, 0 → 1 over `dur.reveal`, with each arc's offset derived
 * from it and from that arc's *current* length. Deriving rather than seeding
 * is what makes a Gauge that mounts before its data behave: the History
 * screen renders 0 / 0 while the counts load, and a reveal that had latched
 * on that first render would snap the arcs in when they arrived. So the
 * reveal waits for the first render that has something to reveal, and a later
 * change in the counts moves `strokeDasharray` underneath a finished reveal
 * rather than replaying it.
 *
 * Under reduce-motion the arcs are simply there.
 */

type GaugeSize = 160 | 220;

type GaugeProps = {
	/** Person A's count — decisions, votes, whatever the caller is splitting. */
	a: number;
	b: number;
	/**
	 * What the numeral says, when that is not `a + b`.
	 *
	 * The History screen's case: the split comes from the rows it has
	 * *loaded*, and the headline number from a separate count query over every
	 * completed decision (FEATURE-INVENTORY §1.12). Six and four on screen
	 * under a "23" is the honest reading of that, and paging does not move the
	 * headline.
	 *
	 * Display only — the arcs, the notch and the reveal latch are driven by
	 * `a` and `b` alone, so a `total` can never change what is drawn. A
	 * non-finite value is ignored and the numeral falls back to `a + b`.
	 */
	total?: number;
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
	/** The sanitised sum — what the numeral shows unless `total` overrides it. */
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

function Gauge({ a, b, total, label, size = 160, className, accessibilityLabel }: GaugeProps) {
	const reducedMotion = useReducedMotion();
	const person = usePersonColors();

	const shares = computeShares(a, b);

	// The numeral's own number. Deliberately kept out of `computeShares`: the
	// geometry has exactly one source of truth (`a` and `b`), and an override
	// that reached the arcs could draw a ring that does not add up to what it
	// says.
	const shown = total !== undefined && Number.isFinite(total) ? total : shares.total;

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

	// 0 = nothing painted, 1 = both shares fully painted. One value for the
	// pair, because the two arcs reveal together.
	const reveal = useSharedValue(0);
	// Latched by the first render that has something to reveal — NOT by the
	// first render. A Gauge whose counts arrive a tick later (the History
	// screen) mounts at 0 / 0, and latching there would spend the animation on
	// an empty ring and then snap the real arcs in. It also makes the effect
	// idempotent, which is what React's StrictMode double-invoke needs.
	const revealed = React.useRef(false);

	React.useEffect(() => {
		if (shares.total === 0) return;

		if (revealed.current) {
			// Reduce-motion resolving mid-reveal (it is read asynchronously)
			// is the only thing left to honour; counts move `strokeDasharray`,
			// never the reveal.
			if (reducedMotion) reveal.value = 1;
			return;
		}

		revealed.current = true;
		reveal.value = reducedMotion ? 1 : withTiming(1, { duration: DUR.reveal });
	}, [shares.total, reducedMotion, reveal]);

	// Deriving the offset from the arc's current length, rather than seeding a
	// per-arc offset once, is what lets the share change under a reveal that
	// has already finished (`reveal` stays 1, so the offset stays 0).
	//
	// Explicit dependency arrays: Reanimated's Babel plugin does not run in
	// Storybook's vite pipeline (see .storybook/main.ts), and without either
	// one the worklet throws on web.
	// https://docs.swmansion.com/react-native-reanimated/docs/guides/web-support
	const propsA = useAnimatedProps(
		() => ({ strokeDashoffset: (1 - reveal.value) * visibleA }),
		[reveal, visibleA],
	);
	const propsB = useAnimatedProps(
		() => ({ strokeDashoffset: (1 - reveal.value) * visibleB }),
		[reveal, visibleB],
	);

	// A round cap on a zero-length dash paints a dot, so an empty share is not
	// drawn at all — which is also what makes 0 / 0 a bare track.
	const showA = shares.a > 0;
	const showB = shares.b > 0;
	// Nothing to separate unless both are actually on the ring.
	const showDivider = showA && showB;

	// Where the two colours actually meet — see the docblock. B's round cap
	// paints over A's last half-stroke, so the seam is half a stroke short of
	// A's nominal end. Clamped at the ring's start for the case where A's
	// whole share is shorter than the cap that covers it.
	const seam = Math.max(0, visibleA - STROKE / 2);
	const meeting = Math.PI * (1 - seam / length);
	const reach = STROKE / 2 + 1;

	return (
		<View
			accessible
			accessibilityLabel={accessibilityLabel ?? `${label ? `${label}: ` : ""}${shown}`}
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

				{/* After both arcs, and B after A: the notch has to paint over
				    whatever ends up on top, and the seam it is placed at is
				    computed from that same order. */}
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
				<Numeral>{String(shown)}</Numeral>
				{label ? <Caption>{label}</Caption> : null}
			</View>
		</View>
	);
}

export { computeShares, Gauge, GAP, STROKE };
export type { GaugeProps, GaugeSize, Shares };
