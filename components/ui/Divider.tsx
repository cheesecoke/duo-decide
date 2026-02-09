import React from "react";
import { styled, getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";

const DividerLine = styled.View<{ colorMode: "light" | "dark" }>`
	height: 1px;
	width: 100%;
	background-color: ${({ colorMode }) => getColor("border", colorMode)};
	margin-vertical: 12px;
`;

/**
 * Thin horizontal line using the theme border color. Use between content sections (e.g. description and Round 1).
 */
export function Divider() {
	const { colorMode } = useTheme();
	return <DividerLine colorMode={colorMode} />;
}
