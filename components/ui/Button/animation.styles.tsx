import { getColor, getFont, theme } from "@/lib/styled";
import { interpolateColor, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { getButtonColors, getSizeStyles } from "./helpers";

export const useButtonAnimationStyles = (
	variant: string,
	colorMode: "light" | "dark",
	size: string,
	rounded: boolean,
	disabled: boolean,
	pressed: any,
	scale: any,
) => {
	const colors = getButtonColors(variant, colorMode);
	const sizeStyles = getSizeStyles(size);

	const baseStyle = {
		display: "flex" as const,
		alignItems: "center" as const,
		justifyContent: "center" as const,
		flexDirection: "row" as const,
		gap: 8,
		// Don't override borderRadius here - let styled components handle it
		...(size !== "icon" && {
			borderRadius: rounded ? theme.borderRadius.full : theme.borderRadius.md,
		}),
		height: sizeStyles.height,
		paddingHorizontal: sizeStyles.paddingHorizontal,
		...(variant === "outline" && {
			borderWidth: 1,
			borderColor: getColor("input", colorMode),
		}),
		...(disabled && {
			opacity: 0.5,
		}),
	};

	const textStyle = {
		fontFamily: getFont("bodyMedium"),
		fontSize: sizeStyles.fontSize,
		color: colors.textColor,
	};

	const animatedStyle = useAnimatedStyle(() => {
		const backgroundColor = interpolateColor(pressed.value, [0, 1], [colors.normal, colors.pressed]);

		const borderColor = interpolateColor(
			pressed.value,
			[0, 1],
			[variant === "outline" ? getColor("input", colorMode) : "transparent", "#333"],
		);

		return {
			transform: [
				{
					scale: withSpring(scale.value, {
						damping: 15,
						stiffness: 300,
					}),
				},
			],
			backgroundColor,
			borderColor,
			borderWidth: variant === "outline" ? 1 : pressed.value > 0 ? 1 : 0,
		};
	});

	return {
		baseStyle,
		textStyle,
		animatedStyle,
		colors,
		sizeStyles,
	};
};
