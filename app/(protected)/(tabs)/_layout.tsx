import React from "react";
import { Tabs } from "expo-router";

import { useColorScheme } from "@/lib/useColorScheme";
import { colors } from "@/constants/colors";
import { IconHouseChimney } from "@/assets/icons/IconHouseChimney";
import { IconList } from "@/assets/icons/IconList";
import { IconQueue } from "@/assets/icons/IconQueue";
import { getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";

export default function TabsLayout() {
	const { colorScheme } = useColorScheme();
	const { colorMode } = useTheme();

	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarStyle: {
					display: "flex",
					height: 60,
					padding: 8,
					paddingHorizontal: 18,
				},
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					tabBarShowLabel: false,
					tabBarIcon: ({ focused }) => (
						<IconHouseChimney
							size={18}
							color={focused ? getColor("foreground", colorMode) : getColor("mutedForeground", colorMode)}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="options"
				options={{
					tabBarShowLabel: false,
					tabBarIcon: ({ focused }) => (
						<IconQueue
							size={20}
							color={focused ? getColor("foreground", colorMode) : getColor("mutedForeground", colorMode)}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="history"
				options={{
					tabBarShowLabel: false,
					tabBarIcon: ({ focused }) => (
						<IconList
							size={18}
							color={focused ? getColor("foreground", colorMode) : getColor("mutedForeground", colorMode)}
						/>
					),
				}}
			/>
		</Tabs>
	);
}
