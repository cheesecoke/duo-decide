import React from "react";
import { View, Platform, useWindowDimensions, StyleSheet } from "react-native";

import FishSvg from "@/assets/illustrations/Fish.svg";
import GooseSvg from "@/assets/illustrations/Goose.svg";

/**
 * Decorative fish and goose illustrations anchored to the bottom corners.
 * Only visible on desktop (web) at wide viewports, hidden on mobile and narrow screens.
 *
 * z-index: 1 so illustrations sit above body but behind content (2) and cards (10).
 *
 * Where to see them: Sign in, then view the Decision Queue/Options/History on web
 * with a window at least 900px wide. Fish = bottom-left, Goose = bottom-right.
 */
const DESKTOP_BREAKPOINT = 768;
const ILLUSTRATION_SIZE = 140;

export function CornerIllustrations() {
	const { width } = useWindowDimensions();
	const showOnDesktop = Platform.OS === "web" && width >= DESKTOP_BREAKPOINT;

	if (!showOnDesktop) {
		return null;
	}

	return (
		<>
			<View style={[styles.corner, styles.bottomLeft]} pointerEvents="none">
				<FishSvg width={ILLUSTRATION_SIZE} height={ILLUSTRATION_SIZE} style={styles.illustration} />
			</View>
			<View style={[styles.corner, styles.bottomRight]} pointerEvents="none">
				<GooseSvg width={ILLUSTRATION_SIZE} height={ILLUSTRATION_SIZE} style={styles.illustration} />
			</View>
		</>
	);
}

const styles = StyleSheet.create({
	corner: {
		position: "absolute",
		bottom: 0,
		zIndex: 1,
		alignItems: "center",
		justifyContent: "flex-end",
	},
	bottomLeft: {
		left: 0,
		paddingLeft: 20,
		paddingBottom: 72,
	},
	bottomRight: {
		right: 0,
		paddingRight: 20,
		paddingBottom: 72,
	},
	illustration: {
		opacity: 0.85,
	},
});
