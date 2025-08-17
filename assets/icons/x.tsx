import React from "react";
import { Svg, Path } from "react-native-svg";

interface IconProps {
	size?: number;
	color?: string;
	className?: string;
}

export function XIcon({ size = 24, color = "currentColor" }: IconProps) {
	return (
		<Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
			<Path
				d="M18 6L6 18"
				stroke={color}
				strokeWidth={2}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<Path
				d="M6 6l12 12"
				stroke={color}
				strokeWidth={2}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</Svg>
	);
}
