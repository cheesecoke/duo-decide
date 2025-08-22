import React from "react";
import { Svg, Path } from "react-native-svg";

interface IconProps {
	size?: number;
	color?: string;
	className?: string;
}

export function IconDone({ size = 16, color = "currentColor", ...props }: IconProps) {
	return (
		<Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
			<Path d="M0 0h24v24H0z" fill="none" />
			<Path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" fill={color} />
		</Svg>
	);
}