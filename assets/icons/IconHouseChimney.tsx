import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { HouseIcon } from "phosphor-react-native";

export interface IconProps {
	size?: number;
	color?: string;
	className?: string;
	style?: StyleProp<ViewStyle>;
	active?: boolean;
}

export function IconHouseChimney({
	size = 20,
	color = "currentColor",
	active = false,
	className: _className,
	style,
	...props
}: IconProps & Record<string, unknown>) {
	return (
		<HouseIcon
			size={size}
			color={color}
			weight={active ? "fill" : "regular"}
			style={[{ width: size, height: size }, style]}
			{...props}
		/>
	);
}
