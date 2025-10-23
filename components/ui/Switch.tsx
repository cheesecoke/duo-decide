import * as SwitchPrimitives from "@rn-primitives/switch";
import * as React from "react";
import { Platform } from "react-native";
import Animated, {
	interpolateColor,
	useAnimatedStyle,
	useDerivedValue,
	withTiming,
} from "react-native-reanimated";
import { styled, getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";

const StyledSwitchWeb = styled(SwitchPrimitives.Root)<{
	colorMode: "light" | "dark";
	checked?: boolean;
	disabled?: boolean;
}>`
	display: flex;
	flex-direction: row;
	height: 24px;
	width: 44px;
	flex-shrink: 0;
	cursor: pointer;
	align-items: center;
	border-radius: 12px;
	border: 2px solid transparent;
	background-color: ${({ checked, colorMode }) =>
		checked ? getColor("primary", colorMode) : getColor("input", colorMode)};

	${({ disabled }) =>
		disabled &&
		`
		cursor: not-allowed;
		opacity: 0.5;
	`}
`;

const StyledSwitchThumb = styled(SwitchPrimitives.Thumb)<{
	colorMode: "light" | "dark";
	checked?: boolean;
}>`
	pointer-events: none;
	display: block;
	height: 20px;
	width: 20px;
	border-radius: 10px;
	background-color: ${({ colorMode }) => getColor("background", colorMode)};
	shadow-color: ${({ colorMode }) => getColor("foreground", colorMode)};
	shadow-offset: 0px 1px;
	shadow-opacity: 0.05;
	shadow-radius: 3px;
	elevation: 3;
	transform: translateX(${({ checked }) => (checked ? 20 : 0)}px);
	transition: transform 0.2s;
`;

const SwitchWeb = React.forwardRef<SwitchPrimitives.RootRef, SwitchPrimitives.RootProps>(
	({ ...props }, ref) => {
		const { colorMode } = useTheme();

		return (
			<StyledSwitchWeb
				colorMode={colorMode}
				checked={props.checked}
				disabled={props.disabled}
				{...props}
				ref={ref}
			>
				<StyledSwitchThumb colorMode={colorMode} checked={props.checked} />
			</StyledSwitchWeb>
		);
	},
);

SwitchWeb.displayName = "SwitchWeb";

const RGB_COLORS = {
	light: {
		primary: "rgb(24, 24, 27)",
		input: "rgb(228, 228, 231)",
	},
	dark: {
		primary: "rgb(250, 250, 250)",
		input: "rgb(39, 39, 42)",
	},
} as const;

const StyledNativeSwitchContainer = styled.View<{
	colorMode: "light" | "dark";
	disabled?: boolean;
}>`
	height: 32px;
	width: 46px;
	border-radius: 16px;

	${({ disabled }) =>
		disabled &&
		`
		opacity: 0.5;
	`}
`;

const StyledNativeSwitchRoot = styled(SwitchPrimitives.Root)<{
	colorMode: "light" | "dark";
	checked?: boolean;
}>`
	display: flex;
	flex-direction: row;
	height: 32px;
	width: 46px;
	flex-shrink: 0;
	align-items: center;
	border-radius: 16px;
	border: 2px solid transparent;
	background-color: ${({ checked, colorMode }) =>
		checked ? getColor("primary", colorMode) : getColor("input", colorMode)};
`;

const StyledNativeSwitchThumb = styled(SwitchPrimitives.Thumb)<{
	colorMode: "light" | "dark";
}>`
	height: 28px;
	width: 28px;
	border-radius: 14px;
	background-color: ${({ colorMode }) => getColor("background", colorMode)};
	shadow-color: ${({ colorMode }) => getColor("foreground", colorMode)};
	shadow-offset: 0px 1px;
	shadow-opacity: 0.25;
	shadow-radius: 3px;
	elevation: 3;
`;

const SwitchNative = React.forwardRef<SwitchPrimitives.RootRef, SwitchPrimitives.RootProps>(
	({ ...props }, ref) => {
		const { colorMode } = useTheme();
		const translateX = useDerivedValue(() => (props.checked ? 18 : 0));

		const animatedRootStyle = useAnimatedStyle(() => {
			return {
				backgroundColor: interpolateColor(
					translateX.value,
					[0, 18],
					[RGB_COLORS[colorMode].input, RGB_COLORS[colorMode].primary],
				),
			};
		});

		const animatedThumbStyle = useAnimatedStyle(() => ({
			transform: [
				{
					translateX: withTiming(translateX.value, {
						duration: 200,
					}),
				},
			],
		}));

		return (
			<StyledNativeSwitchContainer
				as={Animated.View}
				style={animatedRootStyle}
				colorMode={colorMode}
				disabled={props.disabled}
			>
				<StyledNativeSwitchRoot colorMode={colorMode} checked={props.checked} {...props} ref={ref}>
					<Animated.View style={animatedThumbStyle}>
						<StyledNativeSwitchThumb colorMode={colorMode} />
					</Animated.View>
				</StyledNativeSwitchRoot>
			</StyledNativeSwitchContainer>
		);
	},
);

SwitchNative.displayName = "SwitchNative";

const Switch = Platform.select({
	web: SwitchWeb,
	default: SwitchNative,
});

export { Switch };
