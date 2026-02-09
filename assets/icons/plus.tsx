import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { PlusIcon as PhosphorPlusIcon } from "phosphor-react-native";

export interface IconProps {
	size?: number;
	color?: string;
	className?: string;
	style?: StyleProp<ViewStyle>;
}

export function PlusIcon({
	size = 24,
	color = "currentColor",
	className: _className,
	style,
	...props
}: IconProps & Record<string, unknown>) {
	return (
		<PhosphorPlusIcon
			size={size}
			color={color}
			weight="regular"
			style={[{ width: size, height: size }, style]}
			{...props}
		/>
	);
}
