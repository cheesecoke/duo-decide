import * as React from "react";
import { Pressable, View } from "react-native";
import {
	interpolateColor,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { AnimatedView } from "@/components/ui/reusables/animated/animated";
import { Text, TextClassContext } from "@/components/ui/reusables/text/text";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import { DUR } from "@/theme/motion";
import { NEUTRAL } from "@/theme/neutrals";
import { usePersonColors, type PersonColorPair } from "@/theme/usePersonColors";

import type { Cta, CtaTone, RoundTone } from "./decision-card.model";

/**
 * The decide button — the bottom of the card's eye flow (tokens.md §10:
 * "eyebrow → headline → round chip → options → lock-in").
 *
 * It is a display of `resolveCta`, nothing more: the label, whether it is
 * pressable and what colour it wears are all decided in the model, so the
 * seven inventory cases are table-tested there and only their *painting*
 * lives here.
 *
 * Two things about the paint:
 *
 * 1. The fill cross-fades over `dur.base` when the tone changes (tokens.md
 *    §10 — "every state change moves"), using the same from/to + progress
 *    trick as `Card` so an interrupted change restarts from its target
 *    instead of snapping.
 * 2. `together` is a gradient, not a colour, so it rides as its own layer
 *    over the flat one and fades in. That is also why the flat layer's
 *    `together` colour is person A's tint: it is the gradient's first stop,
 *    so there is nothing to see through.
 *
 * 3. A live button dips to 80 % while pressed. That is the only feedback a
 *    tinted pill has — the black `Decide` at least looks like a button.
 *
 * The end-cap is the last link in the round-colour thread (tokens.md §10:
 * round label → segment indicator → selected chip fill → lock-in end-cap).
 * Only poll cards have a round, so only poll cards get a cap.
 */

type DecideButtonProps = {
	/**
	 * `resolveCta`'s answer on an open card. On a decided one the card hands in
	 * the footer's follow-up pill in the same three fields, which is what lets
	 * "Waiting for partner" cross-fade into "Add to calendar · Fri, Dec 12" on
	 * the one mounted button.
	 */
	cta: Pick<Cta, "label" | "disabled" | "tone">;
	/** The card's round colour — what the end-cap is painted in. */
	roundTone: RoundTone;
	showEndCap: boolean;
	onPress: () => void;
	/** A decorative mark before the label (the follow-up pill's). */
	glyph?: React.ReactNode;
	/**
	 * Only where the spoken name must say more than the label does — the
	 * follow-up pill's date in full. Left out, the name is the button's text.
	 */
	accessibilityLabel?: string;
	accessibilityHint?: string;
	testID?: string;
};

/** Label colour per tone. Not animated: 220 ms of mid-grey text reads as a bug. */
const TONE_TEXT: Record<CtaTone, string> = {
	a: "text-person-a-deep",
	b: "text-person-b-deep",
	together: "text-ink",
	cta: "text-cta-fg",
	muted: "text-ink-3",
};

const FILL = { flex: 1 } as const;

/** tokens.md §4 `radius.button`, and the mock's 34 px cap on a 48 px pill. */
const CAP_SIZE = 34;

function toneFill(tone: CtaTone, person: PersonColorPair): string {
	switch (tone) {
		case "a":
			return person.a.tint;
		case "b":
			return person.b.tint;
		case "together":
			return person.a.tint;
		case "cta":
			return NEUTRAL.cta;
		default:
			return NEUTRAL.surface2;
	}
}

function EndCap({ tone }: { tone: RoundTone }) {
	const person = usePersonColors();

	if (tone === "together") {
		return (
			<View
				testID="decision-card-cta-cap"
				className="overflow-hidden rounded-chip"
				style={{ width: CAP_SIZE, height: CAP_SIZE }}
			>
				<LinearGradient
					colors={[person.a.base, person.b.base]}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 0 }}
					style={FILL}
				/>
			</View>
		);
	}

	return (
		<View
			testID="decision-card-cta-cap"
			className={cn("rounded-chip", tone === "b" ? "bg-person-b-base" : "bg-person-a-base")}
			style={{ width: CAP_SIZE, height: CAP_SIZE }}
		/>
	);
}

function DecideButton({
	cta,
	roundTone,
	showEndCap,
	onPress,
	glyph,
	accessibilityLabel,
	accessibilityHint,
	testID = "decision-card-cta",
}: DecideButtonProps) {
	const reducedMotion = useReducedMotion();
	const person = usePersonColors();

	const target = toneFill(cta.tone, person);
	const from = useSharedValue(target);
	const to = useSharedValue(target);
	const progress = useSharedValue(1);
	const together = useSharedValue(cta.tone === "together" ? 1 : 0);

	React.useEffect(() => {
		from.value = to.value;
		to.value = target;
		progress.value = 0;

		const nextTogether = cta.tone === "together" ? 1 : 0;
		if (reducedMotion) {
			progress.value = 1;
			together.value = nextTogether;
			return;
		}
		progress.value = withTiming(1, { duration: DUR.base });
		together.value = withTiming(nextTogether, { duration: DUR.base });
	}, [target, cta.tone, reducedMotion, from, to, progress, together]);

	// The dependency array is required, not optional: Reanimated's Babel plugin
	// does not run in Storybook's vite pipeline (see .storybook/main.ts), and
	// without either one `useAnimatedStyle` throws on web.
	const flatStyle = useAnimatedStyle(
		() => ({
			backgroundColor: interpolateColor(progress.value, [0, 1], [from.value, to.value], "HSV"),
		}),
		[progress, from, to],
	);

	const gradientStyle = useAnimatedStyle(() => ({ opacity: together.value }), [together]);

	return (
		<Pressable
			testID={testID}
			role="button"
			// No `accessibilityLabel` by default: the label is the button's own
			// text, and spelling it twice is how a screen reader ends up reading
			// it twice. The follow-up pill passes one because its date is
			// abbreviated on screen ("Fri, Dec 12") and should not be when spoken.
			accessibilityLabel={accessibilityLabel}
			accessibilityHint={accessibilityHint}
			accessibilityState={{ disabled: cta.disabled }}
			disabled={cta.disabled}
			// Belt and braces, as Chip does it: `disabled` stops the press and
			// `pointerEvents` takes the pill out of the hit-test tree entirely.
			pointerEvents={cta.disabled ? "none" : undefined}
			onPress={onPress}
			className={cn(
				"relative mt-4 flex-row items-center overflow-hidden rounded-button",
				showEndCap
					? "justify-between py-[7px] pl-[22px] pr-[7px]"
					: "justify-center gap-2 px-[18px] py-[13px]",
				// The pressed state. On the whole pill rather than the fill, so
				// the label and the glyph dip with it.
				!cta.disabled && "active:opacity-80 web:hover:opacity-90",
			)}
		>
			<AnimatedView pointerEvents="none" style={flatStyle} className="absolute inset-0" />
			<AnimatedView pointerEvents="none" style={gradientStyle} className="absolute inset-0">
				<LinearGradient
					colors={[person.a.tint, person.b.tint]}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 0 }}
					style={FILL}
				/>
			</AnimatedView>

			<TextClassContext.Provider
				value={cn("text-[16px] font-semibold leading-[22px]", TONE_TEXT[cta.tone])}
			>
				{glyph}
				<Text className="shrink">{cta.label}</Text>
			</TextClassContext.Provider>

			{showEndCap ? <EndCap tone={roundTone} /> : null}
		</Pressable>
	);
}

export { DecideButton };
export type { DecideButtonProps };
