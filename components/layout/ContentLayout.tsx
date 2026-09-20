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
			<SafeAreaView className="flex-1">
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
