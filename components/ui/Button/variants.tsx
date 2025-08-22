import { getColor, styled } from "@/lib/styled";
import { Button } from "./Button";
import { useTheme } from "@/context/theme-provider";

export const CircleButton = styled(Button)`
	width: 40px;
	height: 40px;
	border-radius: 20px;
`;

export const CloseButton = styled(CircleButton)<{
	colorMode: "light" | "dark";
}>`
	border: 1px solid ${({ colorMode }) => getColor("border", colorMode)};
`;

export const ActionButton = styled(CircleButton)`
	/* Inherits all CircleButton styles */
`;

export const CollapsedButton = styled(CircleButton)`
	/* Inherits all CircleButton styles */
`;

// Size Variants
export const SmallButton = styled(Button)`
	height: 32px;
	padding-horizontal: 12px;
	border-radius: 16px;
`;

export const LargeButton = styled(Button)`
	height: 56px;
	padding-horizontal: 32px;
	border-radius: 28px;
`;

export const RoundedButton = styled(Button)<{
	borderRadius?: number;
}>`
	border-radius: ${(props) => props.borderRadius || 12}px;
`;

export const FullWidthButton = styled(Button)`
	width: 100%;
`;
