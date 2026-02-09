import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { HammerIcon } from "phosphor-react-native";

export interface IconProps {
	size?: number;
	color?: string;
	className?: string;
	style?: StyleProp<ViewStyle>;
}

export function IconGavel({
	size = 16,
	color = "currentColor",
	className: _className,
	style,
	...props
}: IconProps & Record<string, unknown>) {
	return (
		<HammerIcon
			size={size}
			color={color}
			weight="regular"
			style={[{ width: size, height: size }, style]}
			{...props}
		/>
	);
}
