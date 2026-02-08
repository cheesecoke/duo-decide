import React from "react";
import { BottomTabBar } from "@react-navigation/bottom-tabs";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { styled } from "@/lib/styled";

const TabBarWrapper = styled.View`
	width: 100%;
	max-width: 786px;
	align-self: center;
`;

/**
 * Wraps the default bottom tab bar in a centered container so it doesn't
 * stretch full width on desktop; matches ContentLayout and FixedFooter max-width.
 */
export function CenteredTabBar(props: BottomTabBarProps) {
	return (
		<TabBarWrapper>
			<BottomTabBar {...props} />
		</TabBarWrapper>
	);
}
