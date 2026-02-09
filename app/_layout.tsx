import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import {
	PlusJakartaSans_400Regular,
	PlusJakartaSans_500Medium,
	PlusJakartaSans_600SemiBold,
	PlusJakartaSans_700Bold,
	PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { Outfit_600SemiBold } from "@expo-google-fonts/outfit";

import { AuthProvider } from "@/context/supabase-provider";
import { ThemeProvider } from "@/context/theme-provider";
import { DrawerProvider } from "@/context/drawer-provider";
import Header from "@/components/layout/Header";

export default function AppLayout() {
	const [fontsLoaded] = useFonts({
		PlusJakartaSans_400Regular,
		PlusJakartaSans_500Medium,
		PlusJakartaSans_600SemiBold,
		PlusJakartaSans_700Bold,
		PlusJakartaSans_800ExtraBold,
		Outfit_600SemiBold,
	});

	// Wait for fonts before rendering to avoid flash of unstyled text
	if (!fontsLoaded) {
		return null;
	}

	return (
		<ThemeProvider>
			<AuthProvider>
				<DrawerProvider>
					<Stack
						screenOptions={{
							headerShown: false,
							gestureEnabled: false,
							header: ({ route, options: screenOptions }) => {
								if (!screenOptions?.headerShown) return null;
								return <Header {...(screenOptions as any).headerProps} />;
							},
						}}
					>
						{/* Welcome page - no header */}
						<Stack.Screen
							name="welcome"
							options={{
								headerShown: false,
							}}
						/>

						{/* Auth pages - header with back button */}
						<Stack.Screen
							name="sign-up"
							options={
								{
									presentation: "modal",
									headerShown: true,
									headerProps: { showBackButton: true },
									gestureEnabled: true,
								} as any
							}
						/>
						<Stack.Screen
							name="sign-in"
							options={
								{
									presentation: "modal",
									headerShown: true,
									headerProps: { showBackButton: true },
									gestureEnabled: true,
								} as any
							}
						/>

						{/* Protected routes - header */}
						<Stack.Screen
							name="(protected)"
							options={
								{
									headerShown: true,
									headerProps: { showBackButton: true },
								} as any
							}
						/>
					</Stack>
				</DrawerProvider>
			</AuthProvider>
		</ThemeProvider>
	);
}
