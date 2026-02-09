import * as React from "react";
import { TextInput, TextInputProps } from "react-native";
import { styled, getColor, getFont } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";

const StyledTextInput = styled.TextInput<{
	colorMode: "light" | "dark";
	editable?: boolean;
}>`
	height: 40px;
	border-radius: 6px;
	border: 1px solid ${({ colorMode }) => getColor("input", colorMode)};
	background-color: ${({ colorMode }) => getColor("background", colorMode)};
	padding: 8px 12px;
	font-family: ${getFont("body")};
	font-size: 16px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};

	${({ editable }) =>
		editable === false &&
		`
    opacity: 0.5;
  `}
`;

const Input = React.forwardRef<React.ComponentRef<typeof TextInput>, TextInputProps>(
	({ ...props }, ref) => {
		const { colorMode } = useTheme();

		return (
			<StyledTextInput
				ref={ref}
				colorMode={colorMode}
				editable={props.editable}
				placeholderTextColor={getColor("mutedForeground", colorMode)}
				{...props}
			/>
		);
	},
);

Input.displayName = "Input";

export { Input };
