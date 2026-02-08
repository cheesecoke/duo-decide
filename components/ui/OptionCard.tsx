import React, { useState, useRef } from "react";
import { Pressable, Animated, Platform } from "react-native";
import { styled, getColor, cardShadow } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import { ArrowRightIcon } from "@/assets/icons";

const StaticCardWrapper = styled.View<{
	colorMode: "light" | "dark";
}>`
	background-color: ${({ colorMode }) => getColor("card", colorMode)};
	border-radius: 8px;
	padding: 16px;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	border: 1px solid ${({ colorMode }) => getColor("border", colorMode)};
	${cardShadow}
	elevation: 2;
`;

const ContentContainer = styled.View`
	flex: 1;
`;

const TitleText = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-weight: 500;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
	font-size: 16px;
`;

const DescriptionText = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 14px;
	color: ${({ colorMode }) => getColor("mutedForeground", colorMode)};
	margin-top: 4px;
`;

const IconContainer = styled.View<{
	colorMode: "light" | "dark";
	isPressed: boolean;
}>`
	width: 24px;
	height: 24px;
	background-color: ${({ colorMode }) => getColor("yellow", colorMode)};
	border-radius: 12px;
	align-items: center;
	justify-content: center;
	${({ isPressed }) =>
		isPressed &&
		`
		border: 1px solid #333;
	`}
`;

interface OptionCardProps {
	title: string;
	description: string;
	onPress?: () => void;
}

export function OptionCard({ title, description, onPress }: OptionCardProps) {
	const [isPressed, setIsPressed] = useState(false);
	const { colorMode } = useTheme();
	const scaleAnim = useRef(new Animated.Value(1)).current;
	const opacityAnim = useRef(new Animated.Value(1)).current;
	const borderColorAnim = useRef(new Animated.Value(0)).current;

	// On web, useNativeDriver must be false; avoids console warning.
	const useNativeDriver = Platform.OS !== "web";

	const handlePressIn = () => {
		setIsPressed(true);
		Animated.parallel([
			Animated.timing(scaleAnim, {
				toValue: 0.95,
				duration: 100,
				useNativeDriver,
			}),
			Animated.timing(opacityAnim, {
				toValue: 0.8,
				duration: 100,
				useNativeDriver,
			}),
			Animated.timing(borderColorAnim, {
				toValue: 1,
				duration: 100,
				useNativeDriver: false,
			}),
		]).start();
	};

	const handlePressOut = () => {
		setIsPressed(false);
		Animated.parallel([
			Animated.timing(scaleAnim, {
				toValue: 1,
				duration: 100,
				useNativeDriver,
			}),
			Animated.timing(opacityAnim, {
				toValue: 1,
				duration: 100,
				useNativeDriver,
			}),
			Animated.timing(borderColorAnim, {
				toValue: 0,
				duration: 100,
				useNativeDriver: false,
			}),
		]).start();
	};

	const animatedBorderColor = borderColorAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [getColor("border", colorMode), "#333"],
	});

	if (onPress) {
		return (
			<Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
				<Animated.View
					style={{
						backgroundColor: getColor("card", colorMode),
						borderRadius: 8,
						padding: 16,
						flexDirection: "row",
						justifyContent: "space-between",
						alignItems: "center",
						borderWidth: 1,
						borderColor: animatedBorderColor,
						...(Platform.OS === "web"
							? { boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }
							: {
									shadowColor: "#000",
									shadowOffset: { width: 0, height: 2 },
									shadowOpacity: 0.1,
									shadowRadius: 4,
								}),
						elevation: 2,
						transform: [
							{
								scale: scaleAnim,
							},
						],
						opacity: opacityAnim,
					}}
				>
					<ContentContainer>
						<TitleText colorMode={colorMode}>{title}</TitleText>
						<DescriptionText colorMode={colorMode}>{description}</DescriptionText>
					</ContentContainer>
					<IconContainer colorMode={colorMode} isPressed={isPressed}>
						<ArrowRightIcon />
					</IconContainer>
				</Animated.View>
			</Pressable>
		);
	}

	return (
		<StaticCardWrapper colorMode={colorMode}>
			<ContentContainer>
				<TitleText colorMode={colorMode}>{title}</TitleText>
				<DescriptionText colorMode={colorMode}>{description}</DescriptionText>
			</ContentContainer>
			<IconContainer colorMode={colorMode} isPressed={false}>
				<ArrowRightIcon />
			</IconContainer>
		</StaticCardWrapper>
	);
}
