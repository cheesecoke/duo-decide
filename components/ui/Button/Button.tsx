import * as React from "react";
import { Pressable, PressableProps } from "react-native";
import Animated, { useSharedValue, withSpring } from "react-native-reanimated";
import { useTheme } from "@/context/theme-provider";
import { createAnimationStyles } from "./animation.styles";

interface ButtonVariants {
	variant?:
		| "default"
		| "destructive"
		| "outline"
		| "secondary"
		| "ghost"
		| "link";
	size?: "default" | "sm" | "lg" | "icon";
	rounded?: boolean;
}

type ButtonProps = PressableProps &
	ButtonVariants & {
		children?: React.ReactNode;
	};

const Button = React.forwardRef<
	React.ComponentRef<typeof Pressable>,
	ButtonProps
>(
	(
		{
			variant = "default",
			size = "default",
			children,
			style,
			rounded = false,
			...props
		},
		ref,
	) => {
		const { colorMode } = useTheme();
		const scale = useSharedValue(1);
		const pressed = useSharedValue(0);

		const { baseStyle, textStyle, animatedStyle } = createAnimationStyles(
			variant,
			colorMode,
			size,
			rounded,
			!!props.disabled,
			pressed,
			scale,
		);

		return (
			<Pressable
				ref={ref}
				onPressIn={() => {
					scale.value = 0.97;
					pressed.value = withSpring(1, { damping: 15, stiffness: 300 });
				}}
				onPressOut={() => {
					scale.value = 1;
					pressed.value = withSpring(0, { damping: 15, stiffness: 300 });
				}}
				disabled={props.disabled}
				style={style}
				{...props}
			>
				<Animated.View style={[baseStyle, animatedStyle]}>
					{typeof children === "string" ? (
						<Animated.Text style={textStyle}>{children}</Animated.Text>
					) : (
						children
					)}
				</Animated.View>
			</Pressable>
		);
	},
);

Button.displayName = "Button";

export { Button };
export type { ButtonProps };
