import * as Slot from "@rn-primitives/slot";
import type { SlottableTextProps, TextRef } from "@rn-primitives/types";
import * as React from "react";
import { styled, getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";

const StyledText = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 16px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
`;

const Text = React.forwardRef<
	TextRef,
	SlottableTextProps & {
		asChild?: boolean;
	}
>(({ asChild = false, ...props }, ref) => {
	const { colorMode } = useTheme();

	if (asChild) {
		return <Slot.Text ref={ref} {...props} />;
	}

	return <StyledText colorMode={colorMode} ref={ref} {...props} />;
});
Text.displayName = "Text";

export { Text };
