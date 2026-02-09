import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { CaretLeftIcon } from "phosphor-react-native";

export interface IconProps {
	size?: number;
	color?: string;
	className?: string;
	style?: StyleProp<ViewStyle>;
}

export function IconArrowBack({
	size = 18,
	color = "currentColor",
	className: _className,
	style,
	...props
}: IconProps & Record<string, unknown>) {
	return (
		<CaretLeftIcon
			size={size}
			color={color}
			weight="regular"
			style={[{ width: size, height: size }, style]}
			{...props}
		/>
	);
}
