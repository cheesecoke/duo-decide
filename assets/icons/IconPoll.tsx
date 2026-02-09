import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { ChartBarIcon } from "phosphor-react-native";

export interface IconProps {
	size?: number;
	color?: string;
	className?: string;
	style?: StyleProp<ViewStyle>;
}

export function IconPoll({
	size = 16,
	color = "currentColor",
	className: _className,
	style,
	...props
}: IconProps & Record<string, unknown>) {
	return (
		<ChartBarIcon
			size={size}
			color={color}
			weight="fill"
			style={[{ width: size, height: size }, style]}
			{...props}
		/>
	);
}
