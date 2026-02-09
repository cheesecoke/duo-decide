import { View } from "react-native";
import { Redirect, Stack } from "expo-router";

import { CornerIllustrations } from "@/components/layout/CornerIllustrations";
import { useAuth } from "@/context/supabase-provider";
import { UserContextProvider } from "@/context/user-context-provider";
import { RealtimeStatusProvider, useRealtimeStatus } from "@/context/realtime-status-context";
import { OptionListsProvider } from "@/context/option-lists-provider";
import { Text } from "@/components/ui/Text";
import ContentLayout from "@/components/layout/ContentLayout";
import { styled, getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";

export const unstable_settings = {
	initialRouteName: "(tabs)",
};

const RootContainer = styled.View<{ colorMode: "light" | "dark" }>`
	flex: 1;
	background-color: ${({ colorMode }) => getColor("background", colorMode)};
`;

/** Same width as header/footer (786px) so body doesn’t stretch full width; transparent so corner illustrations show. */
const ContentWrapper = styled.View`
	flex: 1;
	z-index: 2;
	width: 100%;
	max-width: 786px;
	align-self: center;
	background-color: transparent;
`;

const ReconnectingBar = styled.View<{ colorMode: "light" | "dark" }>`
	background-color: ${({ colorMode }) => getColor("muted", colorMode)};
	padding: 8px 16px;
	align-items: center;
`;
const ReconnectingText = styled.Text<{ colorMode: "light" | "dark" }>`
	font-size: 13px;
	color: ${({ colorMode }) => getColor("mutedForeground", colorMode)};
`;

function ReconnectingBanner() {
	const { reconnecting } = useRealtimeStatus();
	const { colorMode } = useTheme();
	if (!reconnecting) return null;
	return (
		<ReconnectingBar colorMode={colorMode}>
			<ReconnectingText colorMode={colorMode}>Reconnecting…</ReconnectingText>
		</ReconnectingBar>
	);
}

export default function ProtectedLayout() {
	const { initialized, session } = useAuth();
	const { colorMode } = useTheme();

	if (!initialized) {
		return null;
	}

	if (!session) {
		return <Redirect href="/welcome" />;
	}

	return (
		<UserContextProvider>
			{({ userContext, loading, error }) => {
				// Show loading state while fetching user context
				if (loading) {
					return (
						<ContentLayout scrollable={false}>
							<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
								<Text>Loading...</Text>
							</View>
						</ContentLayout>
					);
				}

				// Show error state if user context failed to load
				if (error) {
					return (
						<ContentLayout scrollable={false}>
							<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
								<Text style={{ color: "red", marginBottom: 8 }}>{error}</Text>
								<Text>Please try signing out and back in.</Text>
							</View>
						</ContentLayout>
					);
				}

				// If no user context after loading, something is wrong
				if (!userContext) {
					return (
						<ContentLayout scrollable={false}>
							<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
								<Text>Unable to load user data.</Text>
								<Text>Please try signing out and back in.</Text>
							</View>
						</ContentLayout>
					);
				}

				return (
					<RootContainer colorMode={colorMode}>
						<CornerIllustrations />
						<ContentWrapper>
							<RealtimeStatusProvider>
								<ReconnectingBanner />
								<OptionListsProvider coupleId={userContext.coupleId}>
									<Stack
										screenOptions={{
											headerShown: false,
											contentStyle: { backgroundColor: "transparent" },
										}}
									>
										<Stack.Screen name="(tabs)" />
										<Stack.Screen
											name="modal"
											options={{
												presentation: "modal",
											}}
										/>
									</Stack>
								</OptionListsProvider>
							</RealtimeStatusProvider>
						</ContentWrapper>
					</RootContainer>
				);
			}}
		</UserContextProvider>
	);
}
