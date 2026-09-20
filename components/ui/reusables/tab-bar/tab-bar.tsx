import * as React from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";

import { Text, TextClassContext } from "@/components/ui/reusables/text/text";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import { DUR, SPRING } from "@/theme/motion";
import { NEUTRAL } from "@/theme/neutrals";
import { SHADOW } from "@/theme/shadows";
import { usePersonColors } from "@/theme/usePersonColors";

/**
 * TabBar — the floating white pill the app navigates from (tokens.md §7
 * component 7; ref design-refs/mood-check-in-dark-pastel.webp).
 *
 * The bar does NOT position itself. It is a plain 64 px pill that lays out
 * wherever it is put, so the screen that owns it decides whether it floats
 * over content with a safe-area inset or sits in a column. That is also what
 * lets `ExpoRouterTabBar` hand it to Expo Router's `<Tabs tabBar>` without
 * fighting the navigator over insets — see expo-router-tab-bar.tsx.
 *
 * The selected tab is marked three ways, all of them colour rather than
 * chrome (tokens.md §3 has no borders to spend): a `radius.tab-active` square
 * of `person.a.tint` behind the icon, the icon itself in `person.a.deep`, and
 * the label at 600 in `ink`. It is always person A's hue — the tab bar is the
 * device owner's own navigation, not a shared surface, so it never carries
 * B's colour.
 *
 * Motion (tokens.md §8 and §10): the icon springs 1.0 → 1.1 on `spring.snappy`
 * while the square fades in over `dur.fast` and scales 0.9 → 1. Both are
 * skipped entirely under reduce-motion, which lands the same end state.
 */

type TabBarIconProps = {
	/** Already resolved for the tab's state — `person.a.deep` or `ink.2`. */
	color: string;
	size: number;
};

type TabBarTab = {
	/** Identity of the tab, and what `onChange` is called with. */
	key: string;
	label: string;
	icon: (props: TabBarIconProps) => React.ReactNode;
};

type TabBarProps = {
	tabs: TabBarTab[];
	activeKey: string;
	onChange: (key: string) => void;
	className?: string;
	style?: StyleProp<ViewStyle>;
	/** Names the tablist for a screen reader. */
	accessibilityLabel?: string;
};

/** tokens.md §4 `radius.tab-active` is 14, which is a 40 px square's radius. */
const ACTIVE_SQUARE = "h-10 w-10";
const ICON_SIZE = 24;
/** tokens.md §8: "Tab icon 1.0 → 1.1 on select." */
const ICON_SCALE_SELECTED = 1.1;
/** tokens.md §10: "tab square scale 0.9→1". */
const SQUARE_SCALE_FROM = 0.9;

function TabBarItem({
	tab,
	selected,
	onPress,
}: {
	tab: TabBarTab;
	selected: boolean;
	onPress: () => void;
}) {
	const reducedMotion = useReducedMotion();
	const person = usePersonColors();

	// One value for the square (opacity and scale move together), one for the
	// icon — they are on different curves, a timing and a spring.
	const square = useSharedValue(selected ? 1 : 0);
	const iconScale = useSharedValue(selected ? ICON_SCALE_SELECTED : 1);

	React.useEffect(() => {
		const squareTo = selected ? 1 : 0;
		const iconTo = selected ? ICON_SCALE_SELECTED : 1;

		if (reducedMotion) {
			square.value = squareTo;
			iconScale.value = iconTo;
			return;
		}
		square.value = withTiming(squareTo, { duration: DUR.fast });
		iconScale.value = withSpring(iconTo, SPRING.snappy);
	}, [selected, reducedMotion, square, iconScale]);

	// Explicit dependency arrays: Reanimated's Babel plugin does not run in
	// Storybook's vite pipeline (see .storybook/main.ts), and without either
	// one `useAnimatedStyle` throws on web.
	// https://docs.swmansion.com/react-native-reanimated/docs/guides/web-support
	const squareStyle = useAnimatedStyle(
		() => ({
			opacity: square.value,
			transform: [{ scale: SQUARE_SCALE_FROM + square.value * (1 - SQUARE_SCALE_FROM) }],
		}),
		[square],
	);

	const iconStyle = useAnimatedStyle(
		() => ({ transform: [{ scale: iconScale.value }] }),
		[iconScale],
	);

	return (
		<Pressable
			role="tab"
			accessibilityLabel={tab.label}
			accessibilityState={{ selected }}
			testID={`tab-${tab.key}`}
			onPress={onPress}
			className="flex-1 items-center justify-center px-1"
		>
			{/* The square is a sibling of the icon rather than its background,
			    so scaling the icon never scales the square with it. */}
			<View className={cn(ACTIVE_SQUARE, "items-center justify-center")}>
				<Animated.View
					pointerEvents="none"
					style={squareStyle}
					className="absolute inset-0 rounded-tab-active bg-person-a-tint"
				/>
				<Animated.View pointerEvents="none" style={iconStyle}>
					{tab.icon({
						color: selected ? person.a.deep : NEUTRAL.ink2,
						size: ICON_SIZE,
					})}
				</Animated.View>
			</View>

			<TextClassContext.Provider
				// Caption type (tokens.md §5, 13/18); the selected label steps
				// up to 600 and `ink`, which is the third selected marker.
				value={cn(
					"text-[13px] leading-[18px]",
					selected ? "font-semibold text-ink" : "font-medium text-ink-2",
				)}
			>
				{/* Tabs share the width evenly, so a long label truncates
				    rather than pushing its neighbours off the pill. */}
				<Text numberOfLines={1}>{tab.label}</Text>
			</TextClassContext.Provider>
		</Pressable>
	);
}

function TabBar({
	tabs,
	activeKey,
	onChange,
	className,
	style,
	accessibilityLabel = "Navigation",
}: TabBarProps) {
	return (
		<View
			role="tablist"
			accessibilityLabel={accessibilityLabel}
			testID="tab-bar"
			style={[SHADOW.float, style]}
			className={cn("h-16 flex-row items-center rounded-chip bg-surface px-2", className)}
		>
			{tabs.map((tab) => (
				<TabBarItem
					key={tab.key}
					tab={tab}
					selected={tab.key === activeKey}
					onPress={() => onChange(tab.key)}
				/>
			))}
		</View>
	);
}

export { TabBar, ICON_SIZE };
export type { TabBarIconProps, TabBarProps, TabBarTab };
