import * as React from "react";
import { View } from "react-native";
import {
	cancelAnimation,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withSequence,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";

import { AnimatedView } from "@/components/ui/reusables/animated/animated";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import { SPRING } from "@/theme/motion";
import { NEUTRAL } from "@/theme/neutrals";
import { usePersonColors, type PersonColorPair } from "@/theme/usePersonColors";

/**
 * Characters — Fish is person A, Goose is person B (tokens.md §9).
 *
 * Single-stroke line art: no fill anywhere except the eye dot, drawn in the
 * person's `base` colour so the pair recolours with the theme rather than
 * shipping ten pre-coloured assets. They stand in for avatars — Duo has two
 * people and no photos — and appear on Welcome, the empty queue, the result
 * reveal, and beside each person's vote. Nowhere else.
 *
 * ## One viewBox, three sizes
 *
 * Every size renders the same 96-unit drawing, so the paths are written once
 * and it is the box that grows. The one thing that is not purely scaled is
 * the stroke: 2 units reads as a hairline at 32 px, so the small size draws a
 * proportionally heavier line (the same rule the round-3 mock uses). 96 and
 * 160 share a weight, which is what keeps the mark identical between the
 * empty-queue pair and the Welcome pair.
 *
 * ## Pose and colour are separate axes
 *
 * `pose` is what the character is doing — breathing, hopping, still, sitting
 * a round out — and `muted` is whether it is drawn in its person's colour at
 * all. They are separate because "blocked" and "celebrate" both stay in
 * colour. The exception is baked in as a default rather than a rule: a
 * waiting character is muted unless the caller says otherwise, because
 * waiting in full colour reads as that person having already acted.
 */

type CharacterKind = "fish" | "goose";
type CharacterPerson = "a" | "b";
type CharacterSize = 32 | 96 | 160;
type CharacterPose = "idle" | "celebrate" | "waiting" | "blocked";

type CharacterProps = {
	kind: CharacterKind;
	/** Defaults to the animal's own person: fish → A, goose → B. */
	person?: CharacterPerson;
	size?: CharacterSize;
	pose?: CharacterPose;
	/** Draw in `ink-3` instead of the person colour. Defaults on for "waiting". */
	muted?: boolean;
	/** Who this is. Shows up in the accessible label: "Goose, Sam". */
	name?: string;
	className?: string;
	accessibilityLabel?: string;
};

type AnimalProps = Omit<CharacterProps, "kind">;

/** The single coordinate system every size renders through. */
const VIEW_BOX = 96;

/**
 * The drawings, from design-refs/mocks/decision-queue-round-3.html.
 *
 * Kept here rather than in per-animal files: two marks of six paths each is
 * data, not modules, and splitting them would put the thing a reviewer wants
 * to compare in two places.
 */
type Drawing = {
	/** Every stroke of the mark, in paint order. */
	lines: readonly string[];
	/** The one solid, in viewBox units. */
	eye: { cx: number; cy: number; r: number };
};

const DRAWING: Record<CharacterKind, Drawing> = {
	fish: {
		lines: [
			// body
			"M22 48C22 35 37 27 53 27c14 0 24 8 28 21-4 13-14 21-28 21-16 0-31-8-31-21Z",
			// tail
			"M22 48 9 33l4 15-4 15 13-15Z",
			// top fin
			"M50 27c3-8 11-11 16-7",
			// bottom fin
			"M47 69c2 7 9 9 14 6",
			// gill
			"M66 32c-5 9-5 23 0 32",
			// mouth
			"M79 52c4 1 6 3 6 5",
		],
		eye: { cx: 72, cy: 42, r: 2.6 },
	},
	goose: {
		lines: [
			// body
			"M24 62c0-13 12-22 26-22 13 0 24 8 24 19 0 10-10 16-24 16-16 0-26-5-26-13Z",
			// tail
			"M24 58 11 53l5 10",
			// wing
			"M36 56c8-6 20-4 26 4",
			// neck and head
			"M62 42c-3-13 0-23 8-27 8-4 15 1 15 9 0 5-3 9-8 10",
			// beak
			"M85 22l9 4-9 4",
			// legs and feet
			"M41 76v8M36 84h10M57 76v8M52 84h10",
		],
		eye: { cx: 79, cy: 20, r: 2.4 },
	},
};

/**
 * Stroke weight in viewBox units, so 96 and 160 draw the identical line
 * scaled up. 32 is the exception: a proportional hairline disappears at that
 * size, so the small mark carries a heavier line (~1.5 real px against the
 * large sizes' 2).
 */
const STROKE_WIDTH: Record<CharacterSize, number> = { 32: 4.6, 96: 2, 160: 2 };

/** Badge diameter in real px. 32 and 96 are from the brief; 160 scales 96. */
const BADGE_SIZE: Record<CharacterSize, number> = { 32: 12, 96: 24, 160: 40 };

/** tokens.md §8: a 2 s breathe, so half of it per direction. */
const BREATHE_MS = 1000;
const BREATHE_TO = 1.02;
/** How far a celebrating character jumps, in px, before it springs back. */
const HOP = 8;

/**
 * The colour every line of the drawing is painted in.
 *
 * Pure and exported so the muting rule — the one piece of logic in here — is
 * assertable without rendering an SVG.
 */
function resolveStroke(person: CharacterPerson, muted: boolean, pair: PersonColorPair): string {
	return muted ? NEUTRAL.ink3 : pair[person].base;
}

/**
 * The creator-blocked mark (FEATURE-INVENTORY §3 row 18) — "you are sitting
 * this round out".
 *
 * Its own SVG rather than two more elements in the character's, so the 12 /
 * 24 px in the brief are real px at every character size instead of viewBox
 * units that would scale with the animal. The disc is there because the
 * character's own lines run under the bottom-right corner; without a ground
 * the cross reads as another fin.
 */
function BlockedBadge({ size }: { size: number }) {
	return (
		<View pointerEvents="none" className="absolute bottom-0 right-0">
			<Svg testID="character-blocked-badge" width={size} height={size} viewBox="0 0 24 24">
				<Circle cx={12} cy={12} r={12} fill={NEUTRAL.surface} />
				<Path
					testID="character-blocked-cross"
					d="M8.5 8.5 15.5 15.5M15.5 8.5 8.5 15.5"
					stroke={NEUTRAL.ink2}
					strokeWidth={2.4}
					strokeLinecap="round"
					fill="none"
				/>
			</Svg>
		</View>
	);
}

function Character({
	kind,
	person = kind === "fish" ? "a" : "b",
	size = 96,
	pose = "idle",
	muted = pose === "waiting",
	name = "you",
	className,
	accessibilityLabel,
}: CharacterProps) {
	const reducedMotion = useReducedMotion();
	const pair = usePersonColors();

	const drawing = DRAWING[kind];
	const stroke = resolveStroke(person, muted, pair);
	const strokeWidth = STROKE_WIDTH[size];

	const scale = useSharedValue(1);
	const lift = useSharedValue(0);

	React.useEffect(() => {
		// Back to rest first: a breathe left running under a pose change keeps
		// a "waiting" character quietly pulsing at whatever scale the loop was
		// caught at.
		cancelAnimation(scale);
		cancelAnimation(lift);
		scale.value = 1;
		lift.value = 0;

		if (reducedMotion) return;

		if (pose === "idle") {
			// Reversing repeat, so one leg is half the 2 s loop.
			scale.value = withRepeat(withTiming(BREATHE_TO, { duration: BREATHE_MS }), -1, true);
		}

		if (pose === "celebrate") {
			// Up instantly, down on spring.gentle — the hop is the fall, not
			// the jump, which is what keeps it to one overshoot.
			lift.value = withSequence(withTiming(-HOP, { duration: 0 }), withSpring(0, SPRING.gentle));
		}
	}, [pose, reducedMotion, scale, lift]);

	// The dependency array is required, not optional: Reanimated's Babel plugin
	// does not run in Storybook's vite pipeline (see .storybook/main.ts), and
	// without either one `useAnimatedStyle` throws on web.
	// https://docs.swmansion.com/react-native-reanimated/docs/guides/web-support
	const motionStyle = useAnimatedStyle(
		() => ({ transform: [{ scale: scale.value }, { translateY: lift.value }] }),
		[scale, lift],
	);

	const label = kind === "fish" ? "Fish" : "Goose";

	return (
		<AnimatedView
			accessible
			accessibilityLabel={accessibilityLabel ?? `${label}, ${name}`}
			testID="character"
			style={[{ width: size, height: size }, motionStyle]}
			className={cn("relative", className)}
		>
			<Svg
				testID="character-drawing"
				width={size}
				height={size}
				viewBox={`0 0 ${VIEW_BOX} ${VIEW_BOX}`}
			>
				{drawing.lines.map((d) => (
					<Path
						key={d}
						testID="character-ink"
						d={d}
						stroke={stroke}
						strokeWidth={strokeWidth}
						strokeLinecap="round"
						strokeLinejoin="round"
						fill="none"
					/>
				))}
				{/* The only solid in the drawing, and the reason the mark reads
				    as an animal rather than a shape. */}
				<Circle
					testID="character-eye"
					cx={drawing.eye.cx}
					cy={drawing.eye.cy}
					r={drawing.eye.r}
					fill={stroke}
					stroke="none"
				/>
			</Svg>

			{pose === "blocked" ? <BlockedBadge size={BADGE_SIZE[size]} /> : null}
		</AnimatedView>
	);
}

/** Person A's mark. */
function Fish(props: AnimalProps) {
	return <Character kind="fish" {...props} />;
}

/** Person B's mark. */
function Goose(props: AnimalProps) {
	return <Character kind="goose" {...props} />;
}

export { BREATHE_TO, Character, Fish, Goose, resolveStroke };
export type {
	AnimalProps,
	CharacterKind,
	CharacterPerson,
	CharacterPose,
	CharacterProps,
	CharacterSize,
};
