import "../global.css";

import * as React from "react";
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
import {
	ThemeProvider as NavThemeProvider,
	DefaultTheme,
	DarkTheme,
} from "@react-navigation/native";

import { AuthProvider } from "@/context/supabase-provider";
import { ThemeProvider, useTheme } from "@/context/theme-provider";
import { DrawerProvider } from "@/context/drawer-provider";
import Header from "@/components/layout/Header";
import { PersonPairProvider } from "@/theme/PersonPairProvider";
import { DEFAULT_PAIR } from "@/theme/pair-choice";
import type { PersonPairIds } from "@/theme/usePersonColors";
import { NEUTRAL } from "@/theme/neutrals";

/** React Navigation theme: background = app fill (`NEUTRAL.bg`); card = transparent so screens don't paint over it. */
const LightNavTheme = {
	...DefaultTheme,
	colors: {
		...DefaultTheme.colors,
		background: NEUTRAL.bg,
		card: "transparent",
	},
};

/**
 * The app's one person pair, and the only thing that holds it.
 *
 * `PersonPairProvider` is stateless by design (it is the sole writer of the
 * CSS vars *and* the context, and owning state as well would give it two
 * jobs), so the state lives here — above the navigator, so a pick re-themes
 * every screen, the header and the drawer at once. Who the pair *belongs to*
 * is a question this cannot answer: it is mounted outside `AuthProvider`.
 * `PersistedPersonPair`, down in the protected shell, answers it.
 */
function RootPersonPair({ children }: { children: React.ReactNode }) {
	const [pair, setPair] = React.useState<PersonPairIds>(DEFAULT_PAIR);

	return (
		// `onChange` is the state setter itself, not a wrapper around it:
		// `PersistedPersonPair` down the tree reads it through `usePersonPair`
		// and calls it from an effect, so it is kept plain and stable here
		// rather than re-created on every render.
		<PersonPairProvider a={pair.a} b={pair.b} onChange={setPair}>
			{children}
		</PersonPairProvider>
	);
}

function RootWithNavTheme({ children }: { children: React.ReactNode }) {
	const { colorMode } = useTheme();
	const navTheme = colorMode === "light" ? LightNavTheme : DarkTheme;
	return <NavThemeProvider value={navTheme}>{children}</NavThemeProvider>;
}

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
			{/* Outside the navigator so the pair's CSS vars and context reach every
			    screen, header and drawer alike — it is the sole writer of both. */}
			<RootPersonPair>
				<RootWithNavTheme>
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
								<Stack.Screen
									name="forgot-password"
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
									name="reset-password"
									options={
										{
											headerShown: true,
											headerProps: { showBackButton: false },
											gestureEnabled: false,
										} as any
									}
								/>
								<Stack.Screen
									name="change-password"
									options={
										{
											presentation: "modal",
											headerShown: true,
											headerProps: { showBackButton: true },
											gestureEnabled: true,
										} as any
									}
								/>

								{/* Protected routes - header; the shell paints its own `bg` so the content stays transparent */}
								<Stack.Screen
									name="(protected)"
									options={
										{
											headerShown: true,
											headerProps: { showBackButton: true },
											contentStyle: { backgroundColor: "transparent" },
										} as any
									}
								/>
							</Stack>
						</DrawerProvider>
					</AuthProvider>
				</RootWithNavTheme>
			</RootPersonPair>
		</ThemeProvider>
	);
}
