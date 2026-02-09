import React from "react";
import { View } from "react-native";
import { Tabs } from "expo-router";

import { IconHouseChimney } from "@/assets/icons/IconHouseChimney";
import { IconList } from "@/assets/icons/IconList";
import { IconQueue } from "@/assets/icons/IconQueue";
import { CenteredTabBar } from "@/components/layout/CenteredTabBar";
import { BottomDrawer } from "@/components/modals/BottomDrawer";
import { useDrawer } from "@/context/drawer-provider";
import { getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";

export default function TabsLayout() {
	const { colorMode } = useTheme();
	const { isVisible, title, content, hideDrawer } = useDrawer();

	return (
		<View style={{ flex: 1 }}>
			<Tabs
				tabBar={(props) => <CenteredTabBar {...props} />}
				sceneContainerStyle={{ backgroundColor: "transparent" }}
				screenOptions={{
					headerShown: false,
					contentStyle: { backgroundColor: "transparent" },
					tabBarStyle: {
						display: "flex",
						height: 52,
						paddingTop: 6,
						paddingBottom: 6,
						paddingHorizontal: 16,
						backgroundColor: getColor("background", colorMode),
						borderWidth: 1,
						borderColor: getColor("border", colorMode),
						borderTopLeftRadius: 20,
						borderTopRightRadius: 20,
					},
				}}
			>
				<Tabs.Screen
					name="index"
					options={{
						tabBarShowLabel: false,
						tabBarIcon: ({ focused }) => (
							<IconHouseChimney
								size={22}
								color={focused ? getColor("foreground", colorMode) : getColor("mutedForeground", colorMode)}
								active={focused}
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
								size={22}
								color={focused ? getColor("foreground", colorMode) : getColor("mutedForeground", colorMode)}
								active={focused}
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
								size={22}
								color={focused ? getColor("foreground", colorMode) : getColor("mutedForeground", colorMode)}
								active={focused}
							/>
						),
					}}
				/>
			</Tabs>
			<BottomDrawer visible={isVisible} onClose={hideDrawer} title={title}>
				{content}
			</BottomDrawer>
		</View>
	);
}
