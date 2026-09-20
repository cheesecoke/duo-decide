import * as React from "react";
import { Pressable, type PressableProps, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { cva, type VariantProps } from "class-variance-authority";

import { Text, TextClassContext } from "@/components/ui/reusables/text/text";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import { DUR, SPRING } from "@/theme/motion";

/**
 * Chip — the selectable pill used for tags, moods and quick answers
 * (design-refs/tokens.md §7, component 5).
 *
 * Unselected it is a neutral `surface-2` pill; selected it fills with the
 * owning person's tint and its label switches to that person's deep shade.
 * The fill is a separate layer so it can grow from the chip's centre
 * (tokens.md §8: "chip fill grows from its center") without scaling the label.
 */

const chipVariants = cva(
	"relative flex-row items-center justify-center overflow-hidden rounded-chip bg-surface-2",
	{
		variants: {
			size: {
				sm: "h-8 gap-1.5 px-3",
				md: "h-10 gap-2 px-4",
			},
		},
		defaultVariants: { size: "md" },
	},
);

const chipTextVariants = cva("font-medium text-ink", {
	variants: {
		size: {
			// tokens.md §5 — caption 13/18 and body 16/22.
			sm: "text-[13px] leading-[18px]",
			md: "text-[16px] leading-[22px]",
		},
		person: { a: "", b: "" },
		selected: { true: "", false: "" },
	},
	compoundVariants: [
		{ person: "a", selected: true, className: "text-person-a-deep" },
		{ person: "b", selected: true, className: "text-person-b-deep" },
	],
	defaultVariants: { size: "md", person: "a", selected: false },
});

const FILL_CLASS = { a: "bg-person-a-tint", b: "bg-person-b-tint" } as const;
const DOT_CLASS = { a: "bg-person-a-base", b: "bg-person-b-base" } as const;

/** Resting scale of the fill before it springs in. */
const FILL_FROM = 0.92;

type ChipProps = Omit<PressableProps, "children" | "disabled" | "onPress"> &
	VariantProps<typeof chipVariants> & {
		label: string;
		selected?: boolean;
		person?: "a" | "b";
		disabled?: boolean;
		/** Leading 8 px dot, in the person's base colour once selected. */
		dot?: boolean;
		onPress?: () => void;
		className?: string;
	};

function Chip({
	label,
	selected = false,
	person = "a",
	disabled = false,
	dot = false,
	size = "md",
	onPress,
	className,
	...props
}: ChipProps) {
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

	// The dependency array is required, not optional: Reanimated's Babel plugin
	// does not run in Storybook's vite pipeline (see .storybook/main.ts), and
	// without either one `useAnimatedStyle` throws on web.
	// https://docs.swmansion.com/react-native-reanimated/docs/guides/web-support
	const fillStyle = useAnimatedStyle(
		() => ({
			opacity: progress.value,
			transform: [{ scale: scale.value }],
		}),
		[progress, scale],
	);

	return (
		<TextClassContext.Provider value={chipTextVariants({ size, person, selected })}>
			<Pressable
				role="checkbox"
				accessibilityLabel={label}
				accessibilityState={{ checked: selected, disabled }}
				disabled={disabled}
				// Belt and braces: `disabled` stops the press, `pointerEvents`
				// also takes the chip out of the hit-test tree so a disabled
				// chip can never swallow a press meant for something behind it.
				pointerEvents={disabled ? "none" : undefined}
				onPress={onPress}
				className={cn(chipVariants({ size }), disabled && "opacity-40", className)}
				{...props}
			>
				<Animated.View
					pointerEvents="none"
					style={fillStyle}
					className={cn("absolute inset-0 rounded-chip", FILL_CLASS[person])}
				/>
				{dot ? (
					<View className={cn("h-2 w-2 rounded-chip", selected ? DOT_CLASS[person] : "bg-ink-3")} />
				) : null}
				<Text>{label}</Text>
			</Pressable>
		</TextClassContext.Provider>
	);
}

export { Chip, chipTextVariants, chipVariants };
export type { ChipProps };
