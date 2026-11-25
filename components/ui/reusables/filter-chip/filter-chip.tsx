import * as React from "react";
import { Pressable, View } from "react-native";
import { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { cva } from "class-variance-authority";

import { AnimatedView } from "@/components/ui/reusables/animated/animated";
import {
	CONTROL_MAX_FONT_SCALE,
	Text,
	TextClassContext,
	TextMaxScaleContext,
} from "@/components/ui/reusables/text/text";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import { DUR, SPRING } from "@/theme/motion";

/**
 * FilterChip — a count chip that narrows a list ("Your turn · 2").
 *
 * Built on `Chip`'s look (the `surface-2` pill, the fill that springs from
 * the centre) but a different control, which is why it is its own piece:
 *
 * - **Role.** `Chip` is a checkbox — several can be ticked. A filter chip is
 *   a *toggle button* in a single-select row that can also be emptied (tap
 *   the selected one again and the list shows everything). Neither a
 *   checkbox nor a radio says that; a button with `selected` does. iOS
 *   reads it as "Your turn, 2 decisions, selected, button".
 * - **Count.** The number is part of the chip, in its own small bubble, and
 *   part of the accessible name.
 * - **Tone.** `a` / `b` fill with that person's tint (whose move it is);
 *   `neutral` fills with the black `cta` — "Decided" belongs to both.
 * - **Leading.** An optional mark before the label — the queue puts the
 *   fish in "Your turn" and the goose in "{Partner}'s turn". It is hidden
 *   from assistive tech: the label already says whose it is.
 *
 * A chip with a count of 0 stays pressable (it shows an empty state that
 * says why) but sits back in `ink-3` so the row reads at a glance.
 */

type FilterChipTone = "a" | "b" | "neutral";

const FILL_CLASS: Record<FilterChipTone, string> = {
	a: "bg-person-a-tint",
	b: "bg-person-b-tint",
	neutral: "bg-cta",
};

const labelVariants = cva("text-[15px] font-medium leading-5", {
	variants: {
		tone: { a: "", b: "", neutral: "" },
		selected: { true: "", false: "text-ink" },
		empty: { true: "", false: "" },
	},
	compoundVariants: [
		{ selected: false, empty: true, className: "text-ink-3" },
		{ tone: "a", selected: true, className: "text-person-a-deep" },
		{ tone: "b", selected: true, className: "text-person-b-deep" },
		{ tone: "neutral", selected: true, className: "text-cta-fg" },
	],
	defaultVariants: { tone: "a", selected: false, empty: false },
});

/** Resting scale of the fill before it springs in — the same as `Chip`'s. */
const FILL_FROM = 0.92;

/** 40 px tall + 2 each side = the 44 pt minimum. */
const FILTER_CHIP_HIT_SLOP = { top: 2, bottom: 2, left: 0, right: 0 };

type FilterChipProps = {
	label: string;
	count: number;
	selected?: boolean;
	tone?: FilterChipTone;
	leading?: React.ReactNode;
	onPress: () => void;
	/** What one item is called, for the accessible name: "2 decisions". */
	noun?: [singular: string, plural: string];
	className?: string;
	testID?: string;
};

function FilterChip({
	label,
	count,
	selected = false,
	tone = "a",
	leading,
	onPress,
	noun = ["decision", "decisions"],
	className,
	testID,
}: FilterChipProps) {
	const reducedMotion = useReducedMotion();
	const progress = useSharedValue(selected ? 1 : 0);
	const scale = useSharedValue(selected ? 1 : FILL_FROM);

	React.useEffect(() => {
		if (reducedMotion) {
			progress.value = selected ? 1 : 0;
			scale.value = selected ? 1 : FILL_FROM;
			return;
		}
		progress.value = withTiming(selected ? 1 : 0, { duration: DUR.fast });
		scale.value = selected
			? withSpring(1, SPRING.snappy)
			: withTiming(FILL_FROM, { duration: DUR.fast });
	}, [selected, reducedMotion, progress, scale]);

	// Dependency array required: see chip.tsx (no Reanimated babel in Storybook).
	const fillStyle = useAnimatedStyle(
		() => ({ opacity: progress.value, transform: [{ scale: scale.value }] }),
		[progress, scale],
	);

	const empty = count === 0;
	const accessibilityLabel = `${label}, ${count} ${count === 1 ? noun[0] : noun[1]}`;

	return (
		<TextMaxScaleContext.Provider value={CONTROL_MAX_FONT_SCALE}>
			<Pressable
				testID={testID}
				role="button"
				accessibilityLabel={accessibilityLabel}
				accessibilityState={{ selected }}
				// react-native-web reads aria-*, not accessibilityState.
				aria-pressed={selected}
				onPress={onPress}
				hitSlop={FILTER_CHIP_HIT_SLOP}
				className={cn(
					"relative min-h-10 flex-row items-center gap-1.5 overflow-hidden rounded-chip bg-surface-2 py-1",
					leading ? "pl-1 pr-1.5" : "pl-3.5 pr-1.5",
					className,
				)}
			>
				<AnimatedView
					pointerEvents="none"
					style={fillStyle}
					className={cn("absolute inset-0 rounded-chip", FILL_CLASS[tone])}
				/>
				{leading ? (
					<View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
						{leading}
					</View>
				) : null}
				<TextClassContext.Provider value={labelVariants({ tone, selected, empty })}>
					<Text numberOfLines={1}>{label}</Text>
				</TextClassContext.Provider>
				{/* `surface` on both the grey and the filled chip: a white bubble
				    reads as "the number" on every fill, the black one included. */}
				<View className="min-w-[26px] items-center rounded-chip bg-surface px-2 py-0.5">
					<TextClassContext.Provider
						value={cn(
							"text-[13px] font-semibold leading-[18px]",
							empty && !selected ? "text-ink-3" : "text-ink-2",
						)}
					>
						<Text>{String(count)}</Text>
					</TextClassContext.Provider>
				</View>
			</Pressable>
		</TextMaxScaleContext.Provider>
	);
}

export { FilterChip, FILTER_CHIP_HIT_SLOP };
export type { FilterChipProps, FilterChipTone };
