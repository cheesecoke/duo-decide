import * as React from "react";
import { Pressable, View } from "react-native";
import { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";

import { AnimatedView } from "@/components/ui/reusables/animated/animated";
import { Caption } from "@/components/ui/reusables/headline/headline";
import { OptionMark } from "@/components/ui/reusables/option-row/option-row";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import { DUR, SPRING } from "@/theme/motion";

import type { CalendarAnswer, Footer, FooterMark } from "./decision-card.model";

/**
 * The decided card's calendar line — what the footer slot says once somebody
 * has started, or finished, putting the decision on a calendar. It is a line
 * of text, not a pill: a pill asks for a press, and most of these are news.
 *
 *   ◯ Did it save?   Yes · Not yet           (`question`)
 *   ◯ Sam is adding this now                  (`status`, a ring: not added yet)
 *   ● Sam added it to the calendar · Fri, Dec 12   (`status`, a tick: added)
 *   ● Changed since it was added              (`changed`; the pill is the card's)
 *
 * What it says is decided in `resolveFooter` (decision-card.model.ts); this
 * file only draws it.
 *
 * ## The marks
 *
 * One per person the line is about, in that person's hue. **Added** is the
 * option rows' own filled tick (`OptionMark` with its `seat`), so "it is on
 * the calendar" and "this option won" are the same mark. **Started, not
 * added** is a ring of the same size in the seat's `deep`: the same shape,
 * not yet filled. Each scales in on `SPRING.snappy`, and is simply there under
 * Reduce Motion. They are decorative — the sentence says who.
 *
 * ## Presses
 *
 * - A `status` line is one button: a press opens the calendar sheet. It is at
 *   least 44 pt tall, and its accessible name is the sentence with the date
 *   said in full.
 * - A `question` is not a button; its two answers are. Each is a real 44 pt
 *   box rather than a `hitSlop`, because react-native-web's `Pressable` does
 *   not honour `hitSlop` and this line ships on web too.
 * - A `changed` caption is not pressable: the "Add again" pill under it is.
 */

const RING = { a: "border-person-a-deep", b: "border-person-b-deep" } as const;

/** Where a mark starts its scale-in from. Small enough to read as arriving. */
const MARK_FROM = 0.6;

function Mark({ seat, done }: FooterMark) {
	const reducedMotion = useReducedMotion();
	const scale = useSharedValue(MARK_FROM);

	React.useEffect(() => {
		scale.value = reducedMotion ? 1 : withSpring(1, SPRING.snappy);
	}, [reducedMotion, scale]);

	// The dependency array is required: Reanimated's Babel plugin does not run
	// in Storybook's vite pipeline (see .storybook/main.ts).
	const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }), [scale]);

	return (
		<AnimatedView testID={`follow-up-mark-${seat}`} style={style}>
			{done ? (
				<OptionMark checked seat={seat} />
			) : (
				<View
					testID="follow-up-mark-pending"
					className={cn("h-6 w-6 shrink-0 rounded-full border-2", RING[seat])}
				/>
			)}
		</AnimatedView>
	);
}

function Marks({ marks }: { marks: readonly FooterMark[] }) {
	return (
		<View className="flex-row items-center gap-1">
			{marks.map((mark) => (
				// Keyed by state as well as seat: a ring that becomes a tick is a
				// new mark, and arrives like one.
				<Mark key={`${mark.seat}-${mark.done ? "done" : "pending"}`} {...mark} />
			))}
		</View>
	);
}

/** One of the question's two answers: text, in a 44 pt box. */
function Answer({
	label,
	accessibilityLabel,
	testID,
	onPress,
}: {
	label: string;
	accessibilityLabel: string;
	testID: string;
	onPress?: () => void;
}) {
	return (
		<Pressable
			testID={testID}
			role="button"
			accessibilityLabel={accessibilityLabel}
			onPress={onPress}
			className="min-h-[44px] min-w-[44px] items-center justify-center rounded-chip px-1.5 active:opacity-60 web:hover:opacity-80"
		>
			<Caption className="font-semibold text-ink underline">{label}</Caption>
		</Pressable>
	);
}

type FollowUpLineProps = {
	/** `resolveFooter`'s answer, for the three kinds that have a line. */
	footer: Extract<Footer, { kind: "question" | "status" | "changed" }>;
	/** A press on a `status` line. */
	onOpen?: () => void;
	/** One of a `question`'s two answers. */
	onAnswer?: (answer: CalendarAnswer) => void;
};

/** `mt-4` is the decide button's own gap from the option rows. */
const LINE = "mt-4 min-h-[44px] flex-row items-center gap-2.5";

function FollowUpLine({ footer, onOpen, onAnswer }: FollowUpLineProps) {
	if (footer.kind === "question") {
		return (
			<View testID="decision-card-follow-up-line" className={cn(LINE, "flex-wrap gap-y-0")}>
				<Marks marks={footer.marks} />
				<Caption className="shrink">{footer.label}</Caption>
				<View className="flex-row items-center">
					<Answer
						testID="follow-up-answer-yes"
						label={footer.yes.label}
						accessibilityLabel={footer.yes.accessibilityLabel}
						onPress={() => onAnswer?.("yes")}
					/>
					<Caption className="text-ink-3">·</Caption>
					<Answer
						testID="follow-up-answer-not-yet"
						label={footer.notYet.label}
						accessibilityLabel={footer.notYet.accessibilityLabel}
						onPress={() => onAnswer?.("not-yet")}
					/>
				</View>
			</View>
		);
	}

	if (footer.kind === "changed") {
		// No floor: the pill under it is the 44 pt target, and a 44 pt caption
		// above it would push the two apart.
		return (
			<View testID="decision-card-follow-up-line" className="mt-4 flex-row items-center gap-2.5">
				<Marks marks={footer.marks} />
				<Caption className="min-w-0 flex-1">{footer.caption}</Caption>
			</View>
		);
	}

	return (
		<Pressable
			testID="decision-card-follow-up-line"
			role="button"
			accessibilityLabel={footer.accessibilityLabel}
			accessibilityHint={footer.accessibilityHint}
			onPress={onOpen}
			className={cn(LINE, "active:opacity-60 web:hover:opacity-80")}
		>
			<Marks marks={footer.marks} />
			<Caption className="min-w-0 flex-1">{footer.label}</Caption>
		</Pressable>
	);
}

/**
 * One half of the footer slot, fading in and out — the pill and the line are
 * each wrapped in one, so when the slot changes hands they cross-fade over
 * `DUR.base` (tokens.md §10: "every state change moves").
 *
 * The half on its way out is taken out of the flow at once (`absolute`,
 * pinned to the slot's bottom edge) and fades over the half coming in, so the
 * card's height changes once, to its new size, instead of growing to hold
 * both and then shrinking. It keeps drawing what it last showed while it
 * fades, is hidden from assistive tech, and takes no presses; one `DUR.base`
 * later it unmounts.
 *
 * The parent must be `relative` and must render this unconditionally — a
 * `FooterFade` that unmounted with its content could not fade it. Under
 * Reduce Motion both directions are instant.
 */
function FooterFade({
	show,
	testID,
	children,
}: {
	show: boolean;
	testID?: string;
	children: React.ReactNode;
}) {
	const reducedMotion = useReducedMotion();
	const [mounted, setMounted] = React.useState(show);
	const opacity = useSharedValue(show ? 1 : 0);

	// What to keep drawing on the way out, when `children` is already gone.
	const last = React.useRef<React.ReactNode>(children);
	if (show) last.current = children;

	React.useEffect(() => {
		if (show) {
			setMounted(true);
			opacity.value = reducedMotion ? 1 : withTiming(1, { duration: DUR.base });
			return;
		}
		if (reducedMotion) {
			opacity.value = 0;
			setMounted(false);
			return;
		}
		opacity.value = withTiming(0, { duration: DUR.base });
		const timer = setTimeout(() => setMounted(false), DUR.base);
		return () => clearTimeout(timer);
	}, [show, reducedMotion, opacity]);

	const style = useAnimatedStyle(() => ({ opacity: opacity.value }), [opacity]);

	if (!show && !mounted) return null;

	return (
		<AnimatedView
			testID={testID}
			style={style}
			pointerEvents={show ? "auto" : "none"}
			accessibilityElementsHidden={!show}
			importantForAccessibility={show ? "auto" : "no-hide-descendants"}
			aria-hidden={!show}
			className={cn(!show && "absolute bottom-0 left-0 right-0")}
		>
			{show ? children : last.current}
		</AnimatedView>
	);
}

export { FollowUpLine, FooterFade };
export type { FollowUpLineProps };
