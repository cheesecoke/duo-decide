import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { PottedPlant } from "phosphor-react-native";

export interface IconProps {
	size?: number;
	color?: string;
	weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
	className?: string;
	style?: StyleProp<ViewStyle>;
}

export function IconPottedPlant({
	size = 32,
	color = "#d1a733",
	weight = "fill",
	className: _className,
	style,
	...props
}: IconProps & Record<string, unknown>) {
	return (
		<PottedPlant
			size={size}
			color={color}
			weight={weight}
			style={[{ width: size, height: size }, style]}
			{...props}
		/>
	);
}
