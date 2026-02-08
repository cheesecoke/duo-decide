import React, { useEffect, useRef } from "react";
import { Modal, Animated, ScrollView, Platform } from "react-native";
import { CircleButton } from "@/components/ui/Button";
import { styled, getColor, drawerShadow } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import { XIcon } from "@/assets/icons";

const ModalOverlay = styled.View`
	flex: 1;
	justify-content: flex-end;
	background-color: rgba(0, 0, 0, 0.5);
	padding-top: 60px;
`;

const BackdropTouchable = styled.Pressable`
	flex: 1;
`;

const DrawerContainer = styled(Animated.View)<{
	colorMode: "light" | "dark";
}>`
	background-color: ${({ colorMode }) => getColor("background", colorMode)};
	border-top-left-radius: 16px;
	border-top-right-radius: 16px;
	border-top-width: 1px;
	border-top-color: ${({ colorMode }) => getColor("border", colorMode)};
	${drawerShadow}
	elevation: 10;
	flex-direction: column;
	max-height: 90%;
`;

const HeaderContainer = styled.View<{
	colorMode: "light" | "dark";
}>`
	padding: 24px 24px 20px 24px;
	border-bottom-width: 1px;
	border-bottom-color: ${({ colorMode }) => getColor("border", colorMode)};
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	background-color: ${({ colorMode }) => getColor("background", colorMode)};
	border-top-left-radius: 16px;
	border-top-right-radius: 16px;
	z-index: 10;
`;

const TitleText = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 18px;
	font-weight: 600;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
	text-align: center;
`;

const ContentContainer = styled(ScrollView)`
	padding: 16px 24px 24px 24px;
`;

interface BottomDrawerProps {
	visible: boolean;
	onClose: () => void;
	title: string;
	children: React.ReactNode;
}

export function BottomDrawer({ visible, onClose, title, children }: BottomDrawerProps) {
	const { colorMode } = useTheme();
	const slideAnim = useRef(new Animated.Value(0)).current;

	// On web, useNativeDriver must be false (no native driver); avoids console warning.
	const useNativeDriver = Platform.OS !== "web";

	useEffect(() => {
		if (visible) {
			Animated.spring(slideAnim, {
				toValue: 1,
				useNativeDriver,
				tension: 100,
				friction: 8,
			}).start();
		} else {
			Animated.timing(slideAnim, {
				toValue: 0,
				duration: 200,
				useNativeDriver,
			}).start();
		}
	}, [visible, slideAnim, useNativeDriver]);

	const translateY = slideAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [400, 0],
	});

	return (
		<Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
			<ModalOverlay>
				<BackdropTouchable onPress={onClose} />
				<DrawerContainer
					colorMode={colorMode}
					style={{
						transform: [
							{
								translateY,
							},
						],
					}}
				>
					<HeaderContainer colorMode={colorMode}>
						<TitleText colorMode={colorMode}>{title}</TitleText>
						<CircleButton colorMode={colorMode} onPress={onClose}>
							<XIcon size={16} color={getColor("foreground", colorMode)} />
						</CircleButton>
					</HeaderContainer>
					<ContentContainer
						showsVerticalScrollIndicator={false}
						keyboardShouldPersistTaps="handled"
						bounces={false}
						nestedScrollEnabled={true}
					>
						{children}
					</ContentContainer>
				</DrawerContainer>
			</ModalOverlay>
		</Modal>
	);
}
