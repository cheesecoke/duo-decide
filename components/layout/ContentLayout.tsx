import * as React from "react";
import { SafeAreaView, ScrollView, View } from "react-native";

/**
 * Centered content container — transparent; the protected shell paints the
 * page `bg` in the body area. Cards and content elements have their own
 * opaque backgrounds.
 *
 * The spacing is the v1 Emotion component's, class-for-value: the 786 cap and
 * the centring on the outer `View`, `18px / 30px / 24px` inside. Only the
 * styling system changed.
 *
 * ## Why the SafeAreaView takes a style and not a class
 *
 * NativeWind's JSX transform swaps a component for its interop-wrapped twin
 * only when one is registered (`interopComponents.get(type) ?? type`); for
 * anything else the `className` is handed to a component that does not know
 * the prop, and is silently dropped. React Native's own `SafeAreaView` is not
 * registered — only `react-native-safe-area-context`'s is, and this app has
 * no `SafeAreaProvider` to mount that one under. So the middle layer's
 * `flex: 1` is a real style, exactly as it was in v1.
 *
 * The registered set is: View, Text, Pressable, ScrollView, TextInput, Image,
 * Switch, ActivityIndicator, StatusBar, the three Touchables, and (as prop
 * remaps) FlatList, VirtualizedList, ImageBackground, KeyboardAvoidingView.
 * Anything else — `Modal`, this `SafeAreaView`, Reanimated's `Animated.View`
 * — needs a style, or its own `cssInterop` registration the way
 * `reusables/animated` does.
 */

interface ContentLayoutProps {
	children: React.ReactNode;
	scrollable?: boolean;
}

/** `padding: 18px 30px 24px 30px` — shared so the two branches cannot drift. */
const CONTENT_PADDING = "px-[30px] pb-6 pt-[18px]";

const ContentLayout = ({ children, scrollable = false }: ContentLayoutProps) => {
	return (
		<View className="w-full max-w-[786px] flex-1 self-center">
			<SafeAreaView style={{ flex: 1 }}>
				{scrollable ? (
					<ScrollView className={`flex-1 ${CONTENT_PADDING}`}>{children}</ScrollView>
				) : (
					<View className={`flex-1 ${CONTENT_PADDING}`}>{children}</View>
				)}
			</SafeAreaView>
		</View>
	);
};

export default ContentLayout;
