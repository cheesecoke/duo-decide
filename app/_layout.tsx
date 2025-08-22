import { Stack } from "expo-router";

import { AuthProvider } from "@/context/supabase-provider";
import { ThemeProvider } from "@/context/theme-provider";
import { DrawerProvider } from "@/context/drawer-provider";
import { FloatingNavProvider } from "@/context/floating-nav-provider";
import { useColorScheme } from "@/lib/useColorScheme";
import { colors } from "@/constants/colors";
import Header from "@/components/layout/Header";
import FloatingNavController from "@/components/navigation/FloatingNavController";

export default function AppLayout() {
	const { colorScheme } = useColorScheme();

	return (
		<ThemeProvider>
			<AuthProvider>
				<DrawerProvider>
					<FloatingNavProvider>
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
							{/* Welcome page - no header, no floating nav */}
							<Stack.Screen
								name="welcome"
								options={
									{
										headerShown: false,
										floatingNav: { show: false },
									} as any
								}
							/>

							{/* Auth pages - header with back button, no floating nav */}
							<Stack.Screen
								name="sign-up"
								options={
									{
										presentation: "modal",
										headerShown: true,
										headerProps: { showBackButton: true },
										gestureEnabled: true,
										floatingNav: { show: false },
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
										floatingNav: { show: false },
									} as any
								}
							/>

							{/* Protected routes - header + floating nav configured per page */}
							<Stack.Screen
								name="(protected)"
								options={
									{
										headerShown: false,
										floatingNav: { show: true },
									} as any
								}
							/>
						</Stack>
						<FloatingNavController />
					</FloatingNavProvider>
				</DrawerProvider>
			</AuthProvider>
		</ThemeProvider>
	);
}
