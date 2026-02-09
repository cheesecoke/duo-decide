import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { QueueIcon } from "phosphor-react-native";

export interface IconProps {
	size?: number;
	color?: string;
	className?: string;
	style?: StyleProp<ViewStyle>;
	active?: boolean;
}

export function IconQueue({
	size = 18,
	color = "currentColor",
	active = false,
	className: _className,
	style,
	...props
}: IconProps & Record<string, unknown>) {
	return (
		<QueueIcon
			size={size}
			color={color}
			weight={active ? "fill" : "regular"}
			style={[{ width: size, height: size }, style]}
			{...props}
		/>
	);
}
