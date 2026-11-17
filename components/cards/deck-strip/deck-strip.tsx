import * as React from "react";
import { View } from "react-native";
import {
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { Cards } from "phosphor-react-native";

import { AnimatedView } from "@/components/ui/reusables/animated/animated";
import { Caption } from "@/components/ui/reusables/headline/headline";
import { Text } from "@/components/ui/reusables/text/text";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import { DUR, SPRING } from "@/theme/motion";
import { usePersonColors } from "@/theme/usePersonColors";

/**
 * DeckStrip: each person's stack of cards, side by side at the top of the
 * Cards tab. The viewer on the left, as everywhere else.
 *
 * The stack icon and the number are how many cards that person holds. When
 * the number goes **up**, a card has just landed on the stack, and it shows:
 * a small card rises into the icon, the icon pops once, and a ring bursts out
 * from behind it. A card leaving the stack just changes the number; losing
 * one is not a celebration.
 *
 * With no partner linked there is one stack only.
 */

const TILE_CLASS = { a: "bg-person-a-tint", b: "bg-person-b-tint" } as const;
const DEEP_CLASS = { a: "text-person-a-deep", b: "text-person-b-deep" } as const;
const BASE_BG_CLASS = { a: "bg-person-a-base", b: "bg-person-b-base" } as const;
const BASE_BORDER_CLASS = { a: "border-person-a-base", b: "border-person-b-base" } as const;

const ICON = 34;

function Stack({ seat, name, count }: { seat: "a" | "b"; name: string; count: number }) {
	const person = usePersonColors();
	const reducedMotion = useReducedMotion();

	/** 1 at rest; the icon's own scale. */
	const pop = useSharedValue(1);
	/** 0 → 1 over the burst: the ring grows and fades. */
	const burst = useSharedValue(1);
	/** 0 → 1 as the small card rises into the stack. */
	const rise = useSharedValue(1);

	const previous = React.useRef(count);
	React.useEffect(() => {
		const landed = count > previous.current;
		previous.current = count;
		if (!landed || reducedMotion) return;

		rise.value = 0;
		rise.value = withTiming(1, { duration: DUR.base });
		pop.value = withSequence(
			withTiming(1, { duration: DUR.fast }),
			withTiming(1.25, { duration: DUR.fast }),
			withSpring(1, SPRING.gentle),
		);
		burst.value = 0;
		burst.value = withTiming(1, { duration: DUR.reveal });
	}, [count, reducedMotion, pop, burst, rise]);

	const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }), [pop]);
	const ringStyle = useAnimatedStyle(
		() => ({
			opacity: (1 - burst.value) * 0.7,
			transform: [{ scale: 0.6 + burst.value * 1.3 }],
		}),
		[burst],
	);
	const cardStyle = useAnimatedStyle(
		() => ({
			opacity: rise.value >= 1 ? 0 : 1,
			transform: [{ translateY: (1 - rise.value) * 26 }, { rotate: `${(1 - rise.value) * -12}deg` }],
		}),
		[rise],
	);

	const noun = count === 1 ? "card" : "cards";

	return (
		<View
			testID={`deck-${seat}`}
			accessible
			accessibilityLabel={`${name}: ${count} ${noun}`}
			className={cn(
				"min-w-0 flex-1 flex-row items-center gap-3 rounded-card px-4 py-4",
				TILE_CLASS[seat],
			)}
		>
			<View style={{ width: ICON + 14, height: ICON + 14 }} className="items-center justify-center">
				<AnimatedView
					pointerEvents="none"
					style={ringStyle}
					className={cn("absolute inset-0 rounded-chip border-2", BASE_BORDER_CLASS[seat])}
				/>
				<AnimatedView
					pointerEvents="none"
					style={cardStyle}
					className={cn("absolute h-5 w-3.5 rounded-[3px]", BASE_BG_CLASS[seat])}
				/>
				<AnimatedView style={iconStyle}>
					<Cards size={ICON} weight="duotone" color={person[seat].deep} />
				</AnimatedView>
			</View>

			<View className="min-w-0 flex-1">
				<Text numberOfLines={1} className={cn("text-row font-semibold", DEEP_CLASS[seat])}>
					{name}
				</Text>
				<View className="flex-row items-baseline gap-1.5">
					<Text className={cn("text-[28px] font-bold leading-[34px]", DEEP_CLASS[seat])}>{count}</Text>
					<Caption className={DEEP_CLASS[seat]}>{noun}</Caption>
				</View>
			</View>
		</View>
	);
}

function DeckStrip({
	you,
	partner,
	partnerLabel,
}: {
	/** Cards the viewer holds. */
	you: number;
	/** Cards the partner holds. */
	partner: number;
	/** The partner's name. `null` while no partner is linked: their stack is left out. */
	partnerLabel: string | null;
}) {
	return (
		<View testID="deck-strip" className="flex-row gap-3">
			<Stack seat="a" name="You" count={you} />
			{partnerLabel ? <Stack seat="b" name={partnerLabel} count={partner} /> : null}
		</View>
	);
}

export { DeckStrip };
