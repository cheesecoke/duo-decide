import * as React from "react";
import { TextInput, type TextInputProps } from "react-native";
import { styled, getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";

const StyledTextInput = styled.TextInput<{
	colorMode: "light" | "dark";
	editable?: boolean;
}>`
	min-height: 80px;
	width: 100%;
	border-radius: 6px;
	border: 1px solid ${({ colorMode }) => getColor("input", colorMode)};
	background-color: ${({ colorMode }) => getColor("background", colorMode)};
	padding: 8px 12px;
	font-size: 16px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
	text-align-vertical: top;

	${({ editable }) =>
		editable === false &&
		`
		opacity: 0.5;
	`}
`;

const Textarea = React.forwardRef<
	React.ComponentRef<typeof TextInput>,
	TextInputProps & {
		multiline?: boolean;
		numberOfLines?: number;
	}
>(({ multiline = true, numberOfLines = 4, ...props }, ref) => {
	const { colorMode } = useTheme();

	return (
		<StyledTextInput
			ref={ref}
			colorMode={colorMode}
			editable={props.editable}
			placeholderTextColor={getColor("mutedForeground", colorMode)}
			multiline={multiline}
			numberOfLines={numberOfLines}
			textAlignVertical="top"
			{...props}
		/>
	);
});

Textarea.displayName = "Textarea";

export { Textarea };
