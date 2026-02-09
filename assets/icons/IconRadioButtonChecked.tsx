import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { RadioButtonIcon } from "phosphor-react-native";

export interface IconProps {
	size?: number;
	color?: string;
	className?: string;
	style?: StyleProp<ViewStyle>;
}

export function IconRadioButtonChecked({
	size = 18,
	color = "currentColor",
	className: _className,
	style,
	...props
}: IconProps & Record<string, unknown>) {
	return (
		<RadioButtonIcon
			size={size}
			color={color}
			weight="fill"
			style={[{ width: size, height: size }, style]}
			{...props}
		/>
	);
}
