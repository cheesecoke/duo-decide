import React, { useEffect, useRef } from "react";
import { View, Modal, Dimensions, Animated } from "react-native";
import { Text } from "@/components/ui/Text";
import { CloseButton } from "@/components/ui/Button";
import { styled, getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import { XIcon } from "@/assets/icons";

const ModalOverlay = styled.View`
	flex: 1;
	justify-content: flex-end;
	background-color: rgba(0, 0, 0, 0.5);
`;

const BackdropTouchable = styled.Pressable`
	flex: 1;
`;

const DrawerContainer = styled(Animated.View)<{ colorMode: "light" | "dark" }>`
	background-color: ${({ colorMode }) => getColor("background", colorMode)};
	border-top-left-radius: 16px;
	border-top-right-radius: 16px;
	padding: 24px;
	border-top: 1px solid ${({ colorMode }) => getColor("border", colorMode)};
	shadow-color: #000;
	shadow-offset: 0px -4px;
	shadow-opacity: 0.1;
	shadow-radius: 10px;
	elevation: 10;
`;

const HeaderContainer = styled.View<{ colorMode: "light" | "dark" }>`
	margin-bottom: 16px;
	padding-bottom: 16px;
	border-bottom: 1px solid ${({ colorMode }) => getColor("border", colorMode)};
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	position: relative;
`;

const TitleText = styled.Text<{ colorMode: "light" | "dark" }>`
	font-size: 18px;
	font-weight: 600;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
	text-align: center;
`;

const ContentContainer = styled.View`
	/* Content will determine the height naturally */
`;

interface BottomDrawerProps {
	visible: boolean;
	onClose: () => void;
	title: string;
	children: React.ReactNode;
}

const { height: screenHeight } = Dimensions.get("window");

export function BottomDrawer({
	visible,
	onClose,
	title,
	children,
}: BottomDrawerProps) {
	const { colorMode } = useTheme();
	const slideAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (visible) {
			Animated.spring(slideAnim, {
				toValue: 1,
				useNativeDriver: true,
				tension: 100,
				friction: 8,
			}).start();
		} else {
			Animated.timing(slideAnim, {
				toValue: 0,
				duration: 200,
				useNativeDriver: true,
			}).start();
		}
	}, [visible, slideAnim]);

	const translateY = slideAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [400, 0],
	});

	return (
		<Modal
			visible={visible}
			transparent
			animationType="none"
			onRequestClose={onClose}
		>
			<ModalOverlay>
				<BackdropTouchable onPress={onClose} />
				<DrawerContainer
					colorMode={colorMode}
					style={{
						transform: [{ translateY }],
						maxHeight: screenHeight * 0.8,
					}}
				>
					<HeaderContainer colorMode={colorMode}>
						<TitleText colorMode={colorMode}>{title}</TitleText>
						<CloseButton
							colorMode={colorMode}
							variant="outline"
							size="icon"
							rounded
							onPress={onClose}
						>
							<XIcon size={16} color={getColor("foreground", colorMode)} />
						</CloseButton>
					</HeaderContainer>
					<ContentContainer>{children}</ContentContainer>
				</DrawerContainer>
			</ModalOverlay>
		</Modal>
	);
}
