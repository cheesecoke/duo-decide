import * as React from "react";
import { Pressable, PressableProps, Text } from "react-native";
import { useTheme } from "@/context/theme-provider";
import { getColor, theme } from "@/lib/styled";
import { getButtonColors, getSizeStyles } from "./helpers";

interface ButtonVariants {
	variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "circle";
	size?: "default" | "sm" | "lg" | "icon";
	rounded?: boolean;
}

type ButtonProps = PressableProps &
	ButtonVariants & {
		children?: React.ReactNode;
	};

const Button = React.forwardRef<React.ComponentRef<typeof Pressable>, ButtonProps>(
	({ variant = "default", size = "default", children, style, rounded = false, ...props }, ref) => {
		const { colorMode } = useTheme();
		const colors = getButtonColors(variant, colorMode);
		const sizeStyles = getSizeStyles(size);

		// Special handling for circle variant
		const isCircle = variant === "circle";

		const baseStyle = {
			display: "flex" as const,
			alignItems: "center" as const,
			justifyContent: "center" as const,
			flexDirection: "row" as const,
			gap: 8,
			height: isCircle ? 40 : sizeStyles.height,
			width: isCircle ? 40 : undefined,
			paddingHorizontal: isCircle ? 0 : sizeStyles.paddingHorizontal,
			borderRadius: isCircle ? 20 : rounded ? theme.borderRadius.full : theme.borderRadius.md,
			...(variant === "outline" && {
				borderWidth: 1,
				borderColor: getColor("border", colorMode),
			}),
			...(isCircle && {
				borderWidth: 1,
				borderColor: getColor("border", colorMode),
			}),
			...(props.disabled && {
				opacity: 0.5,
			}),
		};

		return (
			<Pressable
				ref={ref}
				style={({ pressed }) => {
					const pressedStyle = {
						...baseStyle,
						backgroundColor: pressed ? colors.pressed : colors.normal,
					};

					if (typeof style === "function") {
						return [pressedStyle, style({ pressed, hovered: false })];
					}
					return [pressedStyle, style];
				}}
				{...props}
			>
				{typeof children === "string" ? (
					<Text
						style={{
							fontSize: sizeStyles.fontSize,
							fontWeight: "500",
							color: colors.textColor,
						}}
					>
						{children}
					</Text>
				) : (
					children
				)}
			</Pressable>
		);
	},
);

Button.displayName = "Button";

export { Button };
export type { ButtonProps };
