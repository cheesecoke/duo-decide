import * as React from "react";
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, View } from "react-native";

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
	 * content scrolls, the viewport shrinks with the iOS keyboard, and a tap on
	 * the footer button while the keyboard is up lands instead of only
	 * dismissing it. Without this, the keyboard covers the submit button and
	 * the lower fields on any iPhone, with no way to scroll to them.
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

	// KeyboardAvoidingView works out the keyboard overlap from its own
	// `onLayout` frame, which is relative to its parent, not the screen. Every
	// screen with the header (the auth sheets, reset-password) starts well
	// below the top of the window — the sheet's offset plus the bar — so the
	// lift came up short by that much and the keyboard covered the submit
	// button. The offset is where this layout really starts, measured once it
	// is on screen. iOS only: that is the only platform that lifts, and web
	// keeps 0.
	const frame = React.useRef<View>(null);
	const [windowTop, setWindowTop] = React.useState(0);
	const measureWindowTop = React.useCallback(() => {
		if (!keyboardAware || Platform.OS !== "ios") return;
		frame.current?.measureInWindow?.((_x, y) => setWindowTop(y));
	}, [keyboardAware]);

	return (
		<View ref={frame} onLayout={measureWindowTop} className="w-full max-w-[786px] flex-1 self-center">
			<SafeAreaView style={{ flex: 1 }}>
				{keyboardAware ? (
					<KeyboardAvoidingView
						style={{ flex: 1 }}
						behavior={Platform.OS === "ios" ? "padding" : undefined}
						keyboardVerticalOffset={windowTop}
					>
						{/* flexGrow keeps a short form full-height, so `mt-auto`
						    still pins the footer to the bottom. */}
						<ScrollView
							className="flex-1"
							contentContainerStyle={{ ...padding, flexGrow: 1 }}
							keyboardShouldPersistTaps="handled"
						>
							{children}
						</ScrollView>
					</KeyboardAvoidingView>
				) : scrollable ? (
					// Padding goes on the *content* container: on a ScrollView's own
					// style it pads the viewport, so the bottom of the content is
					// clipped by exactly the amount meant to protect it.
					//
					// `automaticallyAdjustKeyboardInsets` (iOS) is for the inline
					// edits on the tab screens — a decision card's fields, an option
					// list's rows. There is no avoiding view around these, so the
					// keyboard covered any field in the lower half of the screen; the
					// native scroll view now insets itself by the keyboard and scrolls
					// the focused field above it. Android and web ignore the prop.
					<ScrollView
						className="flex-1"
						contentContainerStyle={padding}
						automaticallyAdjustKeyboardInsets
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
