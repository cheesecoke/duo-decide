import React from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

import { Image } from "@/components/image";
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

const AppImage = styled(Image)`
	width: 64px;
	height: 64px;
	border-radius: 12px;
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
	const appIcon = colorScheme === "dark" ? <IconHeart /> : <IconHeart />;

	return (
		<ContentLayout>
			<CenterContent>
				<AppImage source={appIcon} />
				<CenteredH1>Welcome to Expo Supabase Starter</CenteredH1>
				<CenteredMuted>
					A comprehensive starter project for developing React Native and Expo applications with Supabase
					as the backend.
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
