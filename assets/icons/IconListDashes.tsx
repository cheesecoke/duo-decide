import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { ListDashesIcon } from "phosphor-react-native";

export interface IconProps {
	size?: number;
	color?: string;
	weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
	className?: string;
	style?: StyleProp<ViewStyle>;
}

export function IconListDashes({
	size = 20,
	color = "currentColor",
	weight = "fill",
	className: _className,
	style,
	...props
}: IconProps & Record<string, unknown>) {
	return (
		<ListDashesIcon
			size={size}
			color={color}
			weight={weight}
			style={[{ width: size, height: size }, style]}
			{...props}
		/>
	);
}
