import * as React from "react";
import { type LayoutChangeEvent, Pressable, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { Text, TextClassContext } from "@/components/ui/reusables/text/text";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import { SPRING } from "@/theme/motion";

/**
 * SegmentedToggle — a black `cta` pill riding inside a gray `surface-2` track
 * (design-refs/fintech-pill-clusters.webp "Spend | Income"; tokens.md §7
 * component 8).
 *
 * The thumb is one absolutely-positioned view whose x and width are driven by
 * each segment's measured layout, so it slides between segments of unequal
 * label widths instead of assuming equal thirds.
 */

type SegmentedToggleOption = {
	value: string;
	label: string;
};

type SegmentedToggleProps = {
	/** 2–3 options; more than that wants a different control. */
	options: SegmentedToggleOption[];
	value: string;
	onChange: (value: string) => void;
	className?: string;
	accessibilityLabel?: string;
};

type SegmentLayout = { x: number; width: number };

function SegmentedToggle({
	options,
	value,
	onChange,
	className,
	accessibilityLabel,
}: SegmentedToggleProps) {
	const reducedMotion = useReducedMotion();
	const [layouts, setLayouts] = React.useState<Record<string, SegmentLayout>>({});

	const thumbX = useSharedValue(0);
	const thumbWidth = useSharedValue(0);
	// The first measurement is a placement, not a move: springing in from x=0
	// would look like the thumb flying in on mount.
	const placed = React.useRef(false);

	const active = layouts[value];

	React.useEffect(() => {
		if (!active) return;

		if (!placed.current || reducedMotion) {
			placed.current = true;
			thumbX.value = active.x;
			thumbWidth.value = active.width;
			return;
		}

		thumbX.value = withSpring(active.x, SPRING.gentle);
		thumbWidth.value = withSpring(active.width, SPRING.gentle);
	}, [active, reducedMotion, thumbX, thumbWidth]);

	// Explicit dependency array: Reanimated's Babel plugin does not run in
	// Storybook's vite pipeline (see .storybook/main.ts), and without either
	// one `useAnimatedStyle` throws on web.
	// https://docs.swmansion.com/react-native-reanimated/docs/guides/web-support
	const thumbStyle = useAnimatedStyle(
		() => ({
			transform: [{ translateX: thumbX.value }],
			width: thumbWidth.value,
		}),
		[thumbX, thumbWidth],
	);

	const onSegmentLayout = React.useCallback(
		(optionValue: string) => (event: LayoutChangeEvent) => {
			const { x, width } = event.nativeEvent.layout;
			setLayouts((previous) => {
				const existing = previous[optionValue];
				if (existing && existing.x === x && existing.width === width) return previous;
				return { ...previous, [optionValue]: { x, width } };
			});
		},
		[],
	);

	return (
		<View
			role="radiogroup"
			accessibilityLabel={accessibilityLabel}
			className={cn("h-12 w-full rounded-chip bg-surface-2 p-1", className)}
		>
			{/* The padding lives on the track and the measuring happens in this
			    inner box, so a segment's `x` and the thumb's `left` share one
			    origin — no guessing how absolute children resolve padding. */}
			<View className="relative flex-1 flex-row items-stretch">
				{/* Before the segments in tree order, so the labels paint on top. */}
				<Animated.View
					pointerEvents="none"
					style={thumbStyle}
					className="absolute bottom-0 left-0 top-0 rounded-chip bg-cta"
				/>
				{options.map((option) => {
					const selected = option.value === value;
					return (
						<TextClassContext.Provider
							key={option.value}
							value={cn(
								"text-center text-[15px] font-semibold leading-[20px]",
								selected ? "text-cta-fg" : "text-ink-2",
							)}
						>
							<Pressable
								role="radio"
								accessibilityLabel={option.label}
								accessibilityState={{ selected, checked: selected }}
								onLayout={onSegmentLayout(option.value)}
								onPress={() => onChange(option.value)}
								className="flex-1 items-center justify-center rounded-chip px-3"
							>
								<Text>{option.label}</Text>
							</Pressable>
						</TextClassContext.Provider>
					);
				})}
			</View>
		</View>
	);
}

export { SegmentedToggle };
export type { SegmentedToggleOption, SegmentedToggleProps };
