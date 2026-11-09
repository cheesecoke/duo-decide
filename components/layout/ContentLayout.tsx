import * as React from "react";
import { Platform, SafeAreaView, ScrollView, View } from "react-native";

import { KEYBOARD_GAP, useKeyboardLift, useRevealFocused } from "@/components/layout/keyboard";

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
	/**
	 * Extra room under the content for an absolutely-positioned footer
	 * (`FIXED_FOOTER_HEIGHT`). Without it the last row scrolls up *under* the
	 * pill and can never be reached (Chase, 2026-09-20).
	 */
	footerInset?: number;
	/**
	 * For forms with a footer pinned by `mt-auto` (the auth screens): the
	 * content scrolls, the viewport ends at the iOS keyboard's top edge, and a
	 * tap on the footer button while the keyboard is up lands instead of only
	 * dismissing it. Without this, the keyboard covers the submit button and
	 * the lower fields on any iPhone, with no way to scroll to them.
	 *
	 * Assumes the layout runs to the bottom of the window, which every auth
	 * screen does (full screen or page sheet, no tab bar). See
	 * `components/layout/keyboard.ts` for why that, and not a measurement.
	 */
	keyboardAware?: boolean;
}

/** v1: `padding: 18px 30px 24px 30px` — one object so the two branches cannot drift. */
const PADDING = { paddingTop: 18, paddingHorizontal: 30, paddingBottom: 24 } as const;

const ContentLayout = ({
	children,
	scrollable = false,
	footerInset = 0,
	keyboardAware = false,
}: ContentLayoutProps) => {
	const padding = { ...PADDING, paddingBottom: PADDING.paddingBottom + footerInset };

	// iOS: how much of the bottom the keyboard covers, from the keyboard's own
	// frame on every keyboard event (keyboard.ts). It pads the outermost View,
	// which is the one that reaches the bottom of the window, so the viewport
	// ends exactly on the keyboard's top edge — on a page sheet as on a full
	// screen. While lifted, the content's 24 pt bottom padding becomes the
	// 12 pt keyboard gap, so the footer's last row clears the keyboard by
	// that. The SafeAreaView's home-indicator inset is behind the keyboard by
	// then; UIKit drops it once the view no longer touches the bottom edge,
	// and if it lingers for a frame it only adds air — the lift itself never
	// comes up short.
	const lift = useKeyboardLift(keyboardAware);
	const reveal = useRevealFocused();
	const revealsFocus = keyboardAware && Platform.OS === "ios";

	if (keyboardAware) {
		return (
			<View
				testID="content-layout-keyboard"
				className="w-full max-w-[786px] flex-1 self-center"
				style={{ paddingBottom: lift }}
			>
				<SafeAreaView style={{ flex: 1 }}>
					{/* flexGrow keeps a short form full-height, so `mt-auto` still
					    pins the footer to the bottom of what the keyboard leaves.
					    A form too tall for that scrolls: the focused field is kept
					    in view (reveal-on-focus, as in the bottom drawer) and the
					    footer is below the fold, ending 12 pt above the keyboard
					    when scrolled to. `handled`: a tap on a button lands on the
					    first try with the keyboard up. */}
					<ScrollView
						ref={reveal.body}
						className="flex-1"
						contentContainerStyle={{
							...padding,
							paddingBottom: lift > 0 ? KEYBOARD_GAP + footerInset : padding.paddingBottom,
							flexGrow: 1,
						}}
						keyboardShouldPersistTaps="handled"
						onLayout={revealsFocus ? reveal.onBodyLayout : undefined}
						onScroll={revealsFocus ? reveal.onBodyScroll : undefined}
						scrollEventThrottle={revealsFocus ? 16 : undefined}
					>
						{revealsFocus ? (
							// Spread because View's TS props do not list `onFocus`,
							// though iOS's base view config bubbles it to here.
							<View
								ref={reveal.content}
								testID="content-layout-fields"
								style={{ flexGrow: 1 }}
								onLayout={reveal.revealFocused}
								{...{ onFocus: reveal.revealFocused }}
							>
								{children}
							</View>
						) : (
							children
						)}
					</ScrollView>
				</SafeAreaView>
			</View>
		);
	}

	return (
		<View className="w-full max-w-[786px] flex-1 self-center">
			<SafeAreaView style={{ flex: 1 }}>
				{scrollable ? (
					// Padding goes on the *content* container: on a ScrollView's own
					// style it pads the viewport, so the bottom of the content is
					// clipped by exactly the amount meant to protect it.
					//
					// `automaticallyAdjustKeyboardInsets` (iOS) is for the inline
					// edits on the tab screens — a decision card's fields, an option
					// list's rows. There is no avoiding view around these, so the
					// keyboard covered any field in the lower half of the screen; the
					// native scroll view now insets itself by the keyboard and scrolls
					// the focused field above it. It works in UIKit's own coordinates,
					// so none of keyboard.ts's caveats apply. Android and web ignore
					// the prop. `handled`: the card's Save / Done circles take the
					// first tap with the keyboard up instead of only dismissing it.
					<ScrollView
						className="flex-1"
						contentContainerStyle={padding}
						automaticallyAdjustKeyboardInsets
						keyboardShouldPersistTaps="handled"
					>
						{children}
					</ScrollView>
				) : (
					<View className="flex-1" style={padding}>
						{children}
					</View>
				)}
			</SafeAreaView>
		</View>
	);
};

export default ContentLayout;
