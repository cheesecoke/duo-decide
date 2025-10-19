import React from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

import { SafeAreaView } from "@/components/SafeAreaView";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { H1, Muted } from "@/components/ui/typography";
import { useColorScheme } from "@/lib/useColorScheme";
import { styled, getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import { IconHeart } from "@/assets/icons/IconHeart";
import ContentLayout from "@/components/layout/ContentLayout";

const Container = styled.View<{
	colorMode: "light" | "dark";
}>`
	flex: 1;
	background-color: ${({ colorMode }) => getColor("background", colorMode)};
	padding: 16px;
`;

const CenterContent = styled.View`
	flex: 1;
	align-items: center;
	justify-content: center;
	gap: 16px;
	margin: 16px;
`;

const ButtonContainer = styled.View`
	flex-direction: column;
	gap: 16px;
	margin: 16px;
`;

const AppImage = styled.View`
	width: 64px;
	height: 64px;
	border-radius: 12px;
	align-items: center;
	justify-content: center;
`;

const CenteredH1 = styled(H1)`
	text-align: center;
`;

const CenteredMuted = styled(Muted)`
	text-align: center;
`;

export default function WelcomeScreen() {
	const router = useRouter();
	const { colorScheme } = useColorScheme();
	const { colorMode } = useTheme();

	return (
		<ContentLayout>
			<CenterContent>
				<AppImage>
					<IconHeart size={64} color={getColor("yellow", colorMode)} />
				</AppImage>
				<CenteredH1>Welcome to Duo Decide</CenteredH1>
				<CenteredMuted>
					Make decisions together with your partner through structured voting and polls that reduce
					anxiety and build connection.
				</CenteredMuted>
			</CenterContent>
			<ButtonContainer>
				<Button
					size="default"
					variant="default"
					onPress={() => {
						router.push("/sign-up");
					}}
				>
					<Text>Sign Up</Text>
				</Button>
				<Button
					size="default"
					variant="secondary"
					onPress={() => {
						router.push("/sign-in");
					}}
				>
					<Text>Sign In</Text>
				</Button>
			</ButtonContainer>
		</ContentLayout>
	);
}
