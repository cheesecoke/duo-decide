import React from "react";
import { useWindowDimensions, Platform } from "react-native";
import { styled } from "@/lib/styled";

/**
 * Breakpoint (px) below which cards are shown in a single-column list.
 * Above this width (web only), cards are shown in a masonry-style column layout.
 */
const LIST_BREAKPOINT = 600;

const ListContainer = styled.View`
	flex-direction: column;
`;

interface ResponsiveCardListProps {
	children: React.ReactNode;
}

/**
 * Layout container only. Never wraps or clones children.
 * - Below breakpoint OR on native: single-column list.
 * - At or above breakpoint on web only: CSS columns for masonry layout.
 */
export function ResponsiveCardList({ children }: ResponsiveCardListProps) {
	const { width } = useWindowDimensions();
	const useColumns = Platform.OS === "web" && width >= LIST_BREAKPOINT;

	if (!useColumns) {
		return <ListContainer>{children}</ListContainer>;
	}

	// Web only: use a raw div with CSS column-count for masonry layout.
	// React Native Web's View strips unknown CSS properties like column-count.
	return (
		<div
			style={{
				columnCount: 2,
				columnGap: 20,
			}}
		>
			{children}
		</div>
	);
}
