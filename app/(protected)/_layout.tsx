import { View } from "react-native";
import { Redirect, Stack } from "expo-router";

import { useAuth } from "@/context/supabase-provider";
import { UserContextProvider } from "@/context/user-context-provider";
import { OptionListsProvider } from "@/context/option-lists-provider";
import { Text } from "@/components/ui/Text";
import ContentLayout from "@/components/layout/ContentLayout";

export const unstable_settings = {
	initialRouteName: "(tabs)",
};

export default function ProtectedLayout() {
	const { initialized, session } = useAuth();

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
					<OptionListsProvider coupleId={userContext.coupleId}>
						<Stack
							screenOptions={{
								headerShown: false,
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
				);
			}}
		</UserContextProvider>
	);
}
