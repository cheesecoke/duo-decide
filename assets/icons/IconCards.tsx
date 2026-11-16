import React from "react";
import { CardsIcon } from "phosphor-react-native";

import type { IconProps } from "@/assets/icons/IconHouseChimney";

export function IconCards({
	size = 20,
	color = "currentColor",
	active = false,
	className: _className,
	style,
	...props
}: IconProps & Record<string, unknown>) {
	return (
		<CardsIcon
			size={size}
			color={color}
			weight={active ? "fill" : "regular"}
			style={[{ width: size, height: size }, style]}
			{...props}
		/>
	);
}
