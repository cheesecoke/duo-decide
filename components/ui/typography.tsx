import * as Slot from "@rn-primitives/slot";
import type { SlottableTextProps, TextRef } from "@rn-primitives/types";
import * as React from "react";
import { Platform } from "react-native";
import { styled, getColor, getFont } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";

const StyledH1 = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-family: ${getFont("headingExtraBold")};
	font-size: 36px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
	letter-spacing: -0.025em;
`;

const StyledH2 = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-family: ${getFont("headingBold")};
	font-size: 30px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
	letter-spacing: -0.025em;
	border-bottom-width: 1px;
	border-bottom-color: ${({ colorMode }) => getColor("border", colorMode)};
	padding-bottom: 8px;
`;

const StyledH3 = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-family: ${getFont("heading")};
	font-size: 24px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
	letter-spacing: -0.025em;
`;

const StyledH4 = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-family: ${getFont("heading")};
	font-size: 20px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
	letter-spacing: -0.025em;
`;

const StyledP = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-family: ${getFont("body")};
	font-size: 16px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
`;

const StyledBlockQuote = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-family: ${getFont("body")};
	margin-top: 24px;
	border-left-width: 2px;
	border-left-color: ${({ colorMode }) => getColor("border", colorMode)};
	padding-left: 24px;
	font-size: 16px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
	font-style: italic;
`;

const StyledCode = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-family: ${getFont("bodyMedium")};
	border-radius: 6px;
	background-color: ${({ colorMode }) => getColor("muted", colorMode)};
	padding: 2px 6px;
	font-size: 14px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
`;

const StyledLead = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-family: ${getFont("body")};
	font-size: 20px;
	color: ${({ colorMode }) => getColor("mutedForeground", colorMode)};
`;

const StyledLarge = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-family: ${getFont("heading")};
	font-size: 20px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
`;

const StyledSmall = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-family: ${getFont("bodyMedium")};
	font-size: 14px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
	line-height: 16px;
`;

const StyledMuted = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-family: ${getFont("body")};
	font-size: 14px;
	color: ${({ colorMode }) => getColor("mutedForeground", colorMode)};
`;

const H1 = React.forwardRef<TextRef, SlottableTextProps>(({ asChild = false, ...props }, ref) => {
	const { colorMode } = useTheme();

	if (asChild) {
		return <Slot.Text ref={ref} {...props} />;
	}

	return <StyledH1 role="heading" aria-level="1" colorMode={colorMode} ref={ref} {...props} />;
});

H1.displayName = "H1";

const H2 = React.forwardRef<TextRef, SlottableTextProps>(({ asChild = false, ...props }, ref) => {
	const { colorMode } = useTheme();

	if (asChild) {
		return <Slot.Text ref={ref} {...props} />;
	}

	return <StyledH2 role="heading" aria-level="2" colorMode={colorMode} ref={ref} {...props} />;
});

H2.displayName = "H2";

const H3 = React.forwardRef<TextRef, SlottableTextProps>(({ asChild = false, ...props }, ref) => {
	const { colorMode } = useTheme();

	if (asChild) {
		return <Slot.Text ref={ref} {...props} />;
	}

	return <StyledH3 role="heading" aria-level="3" colorMode={colorMode} ref={ref} {...props} />;
});

H3.displayName = "H3";

const H4 = React.forwardRef<TextRef, SlottableTextProps>(({ asChild = false, ...props }, ref) => {
	const { colorMode } = useTheme();

	if (asChild) {
		return <Slot.Text ref={ref} {...props} />;
	}

	return <StyledH4 role="heading" aria-level="4" colorMode={colorMode} ref={ref} {...props} />;
});

H4.displayName = "H4";

const P = React.forwardRef<TextRef, SlottableTextProps>(({ asChild = false, ...props }, ref) => {
	const { colorMode } = useTheme();

	if (asChild) {
		return <Slot.Text ref={ref} {...props} />;
	}

	return <StyledP colorMode={colorMode} ref={ref} {...props} />;
});

P.displayName = "P";

const BlockQuote = React.forwardRef<TextRef, SlottableTextProps>(
	({ asChild = false, ...props }, ref) => {
		const { colorMode } = useTheme();

		if (asChild) {
			return <Slot.Text ref={ref} {...props} />;
		}

		return (
			<StyledBlockQuote
				role={Platform.OS === "web" ? "blockquote" : undefined}
				colorMode={colorMode}
				ref={ref}
				{...props}
			/>
		);
	},
);

BlockQuote.displayName = "BlockQuote";

const Code = React.forwardRef<TextRef, SlottableTextProps>(({ asChild = false, ...props }, ref) => {
	const { colorMode } = useTheme();

	if (asChild) {
		return <Slot.Text ref={ref} {...props} />;
	}

	return (
		<StyledCode
			role={Platform.OS === "web" ? "code" : undefined}
			colorMode={colorMode}
			ref={ref}
			{...props}
		/>
	);
});

Code.displayName = "Code";

const Lead = React.forwardRef<TextRef, SlottableTextProps>(({ asChild = false, ...props }, ref) => {
	const { colorMode } = useTheme();

	if (asChild) {
		return <Slot.Text ref={ref} {...props} />;
	}

	return <StyledLead colorMode={colorMode} ref={ref} {...props} />;
});

Lead.displayName = "Lead";

const Large = React.forwardRef<TextRef, SlottableTextProps>(
	({ asChild = false, ...props }, ref) => {
		const { colorMode } = useTheme();

		if (asChild) {
			return <Slot.Text ref={ref} {...props} />;
		}

		return <StyledLarge colorMode={colorMode} ref={ref} {...props} />;
	},
);

Large.displayName = "Large";

const Small = React.forwardRef<TextRef, SlottableTextProps>(
	({ asChild = false, ...props }, ref) => {
		const { colorMode } = useTheme();

		if (asChild) {
			return <Slot.Text ref={ref} {...props} />;
		}

		return <StyledSmall colorMode={colorMode} ref={ref} {...props} />;
	},
);

Small.displayName = "Small";

const Muted = React.forwardRef<TextRef, SlottableTextProps>(
	({ asChild = false, ...props }, ref) => {
		const { colorMode } = useTheme();

		if (asChild) {
			return <Slot.Text ref={ref} {...props} />;
		}

		return <StyledMuted colorMode={colorMode} ref={ref} {...props} />;
	},
);

Muted.displayName = "Muted";

export { BlockQuote, Code, H1, H2, H3, H4, Large, Lead, Muted, P, Small };
