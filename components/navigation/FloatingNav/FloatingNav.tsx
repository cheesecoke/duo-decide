import React, { useState, useRef, useEffect } from "react";
import { View, Animated, Dimensions, Pressable } from "react-native";
import { Text } from "@/components/ui/Text";
import { Button, ActionButton, CloseButton, CollapsedButton } from "@/components/ui/Button";
import { MenuIcon, ShuffleIcon, CopyIcon, XIcon } from "@/assets/icons";
import { styled, getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import { useRouter } from "expo-router";

const FloatingContainer = styled.View<{
	position: "bottom-right" | "bottom-left" | "top-right" | "top-left";
}>`
	position: absolute;
	z-index: 50;
	left: 24px;
	right: 24px;
	${({ position }) => {
		switch (position) {
			case "bottom-right":
			case "bottom-left":
				return "bottom: 24px;";
			case "top-right":
			case "top-left":
				return "top: 24px;";
		}
	}}
`;

const ExpandedNav = styled.View<{ colorMode: "light" | "dark" }>`
	background-color: ${({ colorMode }) => getColor("background", colorMode)};
	border-radius: 50px;
	border: 1px solid ${({ colorMode }) => getColor("border", colorMode)};
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	padding: 8px 10px;
	transition: all 0.3s ease-in-out;
`;

const ActionButtonsContainer = styled.View`
	flex-direction: row;
	align-items: center;
	gap: 8px;
`;


const CollapsedButtonWrapper = styled.View<{ colorMode: "light" | "dark" }>`
	background-color: ${({ colorMode }) => getColor("background", colorMode)};
	border-radius: 28px;
	padding: 8px;
	align-self: flex-end;
	shadow-color: #000;
	shadow-offset: 0px 4px;
	shadow-opacity: 0.1;
	shadow-radius: 10px;
	elevation: 5;
`;


interface FloatingNavProps {
	position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
	createButtonText?: string;
	onCreatePress?: () => void;
}

export function FloatingNav({
	position = "bottom-right",
	createButtonText = "Create Decision",
	onCreatePress,
}: FloatingNavProps) {
	const [isExpanded, setIsExpanded] = useState(true);
	const router = useRouter();
	const { colorMode } = useTheme();
	const screenWidth = Dimensions.get("window").width;

	const widthAnim = useRef(new Animated.Value(1)).current;
	const borderRadiusAnim = useRef(new Animated.Value(1)).current;
	const opacityAnim = useRef(new Animated.Value(1)).current;

	useEffect(() => {
		if (isExpanded) {
			Animated.parallel([
				Animated.timing(widthAnim, {
					toValue: 1,
					duration: 300,
					useNativeDriver: false,
				}),
				Animated.timing(borderRadiusAnim, {
					toValue: 1,
					duration: 300,
					useNativeDriver: false,
				}),
				Animated.timing(opacityAnim, {
					toValue: 1,
					duration: 300,
					useNativeDriver: false,
				}),
			]).start();
		} else {
			Animated.parallel([
				Animated.timing(widthAnim, {
					toValue: 0,
					duration: 300,
					useNativeDriver: false,
				}),
				Animated.timing(borderRadiusAnim, {
					toValue: 0,
					duration: 300,
					useNativeDriver: false,
				}),
				Animated.timing(opacityAnim, {
					toValue: 0,
					duration: 300,
					useNativeDriver: false,
				}),
			]).start();
		}
	}, [isExpanded, widthAnim, borderRadiusAnim, opacityAnim]);

	const toggleExpanded = () => {
		setIsExpanded(!isExpanded);
	};

	const navigateTo = (path: string) => {
		router.push(path as any);
	};

	const handleCreatePress = () => {
		if (onCreatePress) {
			onCreatePress();
		} else {
			navigateTo("/create-decision");
		}
	};

	return (
		<FloatingContainer position={position}>
			<View className="flex-row justify-end">
				{isExpanded ? (
					<Animated.View
						style={{
							width: widthAnim.interpolate({
								inputRange: [0, 1],
								outputRange: [56, screenWidth - 48],
							}),
							borderRadius: borderRadiusAnim.interpolate({
								inputRange: [0, 1],
								outputRange: [28, 50],
							}),
							opacity: opacityAnim,
							alignSelf: "flex-end",
							shadowColor: "#000",
							shadowOffset: { width: 0, height: 4 },
							shadowOpacity: 0.1,
							shadowRadius: 10,
							elevation: 5,
							minWidth: 56,
						}}
					>
						<ExpandedNav colorMode={colorMode}>
							<Button
								variant="default"
								onPress={handleCreatePress}
								rounded={true}
							>
								<MenuIcon
									size={16}
									color={getColor("yellowForeground", colorMode)}
								/>
								<Text
									style={{
										color: getColor("yellowForeground", colorMode),
										fontWeight: "500",
										fontSize: 14,
									}}
								>
									{createButtonText}
								</Text>
							</Button>

							<ActionButtonsContainer>
								<ActionButton
									variant="outline"
									onPress={() => navigateTo("/shuffle")}
									size="icon"
									rounded={true}
								>
									<ShuffleIcon
										size={16}
										color={getColor("mutedForeground", colorMode)}
									/>
								</ActionButton>

								<ActionButton
									variant="outline"
									onPress={() => navigateTo("/copy")}
									size="icon"
									rounded={true}
								>
									<CopyIcon
										size={16}
										color={getColor("mutedForeground", colorMode)}
									/>
								</ActionButton>

								<CloseButton
									onPress={toggleExpanded}
									size="icon"
									rounded={true}
								>
									<XIcon
										size={16}
										color={getColor("yellowForeground", colorMode)}
									/>
								</CloseButton>
							</ActionButtonsContainer>
						</ExpandedNav>
					</Animated.View>
				) : (
					<CollapsedButtonWrapper colorMode={colorMode}>
						<CollapsedButton
							variant="default"
							size="icon"
							rounded={true}
							onPress={toggleExpanded}
						>
							<MenuIcon
								size={16}
								color={getColor("yellowForeground", colorMode)}
							/>
						</CollapsedButton>
					</CollapsedButtonWrapper>
				)}
			</View>
		</FloatingContainer>
	);
}
