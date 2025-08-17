import * as LabelPrimitive from "@rn-primitives/label";
import * as React from "react";
import { getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";

const Label = React.forwardRef<
	LabelPrimitive.TextRef,
	LabelPrimitive.TextProps
>(({ onPress, onLongPress, onPressIn, onPressOut, style, ...props }, ref) => {
	const { colorMode } = useTheme();

	const labelStyle = {
		fontSize: 14,
		fontWeight: "500" as const,
		color: getColor("foreground", colorMode),
		lineHeight: 16,
		...style,
	};

	return (
		<LabelPrimitive.Root
			onPress={onPress}
			onLongPress={onLongPress}
			onPressIn={onPressIn}
			onPressOut={onPressOut}
		>
			<LabelPrimitive.Text ref={ref} style={labelStyle} {...props} />
		</LabelPrimitive.Root>
	);
});
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
