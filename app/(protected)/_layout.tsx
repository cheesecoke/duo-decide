import { Redirect, Stack } from "expo-router";

import { useAuth } from "@/context/supabase-provider";
import { UserContextProvider } from "@/context/user-context-provider";
import { OptionListsProvider } from "@/context/option-lists-provider";

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
			<OptionListsProvider>
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
		</UserContextProvider>
	);
}
