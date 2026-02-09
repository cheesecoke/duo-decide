import { getColor, styled } from "@/lib/styled";
import { Pressable } from "react-native";

// Primary Button - Pill shaped with yellow background
export const PrimaryButton = styled(Pressable)<{ colorMode: "light" | "dark" }>`
	background-color: ${({ colorMode }) => getColor("yellow", colorMode)};
	border-radius: 20px;
	height: 40px;
	padding-horizontal: 16px;
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	gap: 8px;
`;

// Circle Button - Perfect circle with border
export const CircleButton = styled(Pressable)<{ colorMode: "light" | "dark" }>`
	width: 40px;
	height: 40px;
	border-radius: 20px;
	border: 1px solid ${({ colorMode }) => getColor("border", colorMode)};
	background-color: ${({ colorMode }) => getColor("background", colorMode)};
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
`;

// Secondary Button - Pill shaped with muted background and border for visibility on gray
export const SecondaryButton = styled(Pressable)<{ colorMode: "light" | "dark" }>`
	background-color: ${({ colorMode }) => getColor("muted", colorMode)};
	border: 1px solid ${({ colorMode }) => getColor("border", colorMode)};
	border-radius: 20px;
	height: 40px;
	padding-horizontal: 16px;
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	gap: 8px;
`;

// Outline Button - Pill shaped with border only
export const OutlineButton = styled(Pressable)<{ colorMode: "light" | "dark" }>`
	background-color: transparent;
	border: 1px solid ${({ colorMode }) => getColor("border", colorMode)};
	border-radius: 20px;
	height: 40px;
	padding-horizontal: 16px;
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	gap: 8px;
`;

// Ghost Button - No background, no border
export const GhostButton = styled(Pressable)<{ colorMode: "light" | "dark" }>`
	background-color: transparent;
	border-radius: 20px;
	height: 40px;
	padding-horizontal: 16px;
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	gap: 8px;
`;
