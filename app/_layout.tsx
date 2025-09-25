import { Stack } from "expo-router";

import { AuthProvider } from "@/context/supabase-provider";
import { ThemeProvider } from "@/context/theme-provider";
import { DrawerProvider } from "@/context/drawer-provider";
import { useColorScheme } from "@/lib/useColorScheme";
import { colors } from "@/constants/colors";
import Header from "@/components/layout/Header";

export default function AppLayout() {
	const { colorScheme } = useColorScheme();

	return (
		<ThemeProvider>
			<AuthProvider>
				<DrawerProvider>
					<Stack
							screenOptions={{
								headerShown: false,
								gestureEnabled: false,
								header: ({ route, options }) => {
									if (!options.headerShown) return null;
									return <Header {...(options as any).headerProps} />;
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
								options={{
									presentation: "modal",
									headerShown: true,
									headerProps: { showBackButton: true },
									gestureEnabled: true,
								} as any}
							/>
							<Stack.Screen
								name="sign-in"
								options={{
									presentation: "modal",
									headerShown: true,
									headerProps: { showBackButton: true },
									gestureEnabled: true,
								} as any}
							/>

							{/* Protected routes - header */}
							<Stack.Screen
								name="(protected)"
								options={{
									headerShown: true,
									headerProps: { showBackButton: true },
								} as any}
							/>
					</Stack>
				</DrawerProvider>
			</AuthProvider>
		</ThemeProvider>
	);
}
