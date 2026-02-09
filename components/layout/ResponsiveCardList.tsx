import React from "react";
import { View, useWindowDimensions, Platform } from "react-native";
import { styled } from "@/lib/styled";

/**
 * Breakpoint (px) below which cards are shown in a single-column list.
 * Above this width (web only), cards are shown in a responsive grid.
 */
const LIST_BREAKPOINT = 600;

const GRID_MIN_COLUMN_WIDTH = 300;

const ListContainer = styled.View`
	flex-direction: column;
	gap: 20px;
`;

interface ResponsiveCardListProps {
	children: React.ReactNode;
}

/**
 * Layout container only. Never wraps or clones children.
 * - Below breakpoint OR on native: single-column list (column + gap).
 * - At or above breakpoint on web only: CSS Grid on the container; children are direct grid items.
 */
export function ResponsiveCardList({ children }: ResponsiveCardListProps) {
	const { width } = useWindowDimensions();
	const useGrid = Platform.OS === "web" && width >= LIST_BREAKPOINT;

	if (!useGrid) {
		return <ListContainer>{children}</ListContainer>;
	}

	// Web only: single container with grid layout. Children are not cloned or wrapped.
	return (
		<View
			style={
				{
					display: "grid",
					gridTemplateColumns: `repeat(auto-fill, minmax(${GRID_MIN_COLUMN_WIDTH}px, 1fr))`,
					gap: 20,
				} as Record<string, unknown>
			}
		>
			{children}
		</View>
	);
}
