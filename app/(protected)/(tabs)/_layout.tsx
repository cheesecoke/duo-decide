import React from "react";
import { View } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomDrawer } from "@/components/modals/BottomDrawer";
import { TAB_SCREENS } from "@/components/layout/tab-screens";
import { ExpoRouterTabBar } from "@/components/ui/reusables/tab-bar/expo-router-tab-bar";
import { TAB_BAR_HEIGHT } from "@/components/ui/reusables/tab-bar/tab-bar";
import { useDrawer } from "@/context/drawer-provider";

/** Clear air between the bottom safe-area edge and the floating pill. */
const TAB_BAR_GAP = 12;
/** Side margins, so the pill never touches the screen edge on a phone. */
const TAB_BAR_SIDE_MARGIN = 20;
/** The same 786 px cap ContentLayout and FixedFooter use, so the pill lines up with the body on desktop. */
const TAB_BAR_MAX_WIDTH = 786;

export default function TabsLayout() {
	const insets = useSafeAreaInsets();
	const { isVisible, title, content, hideDrawer } = useDrawer();

	return (
		<View style={{ flex: 1 }}>
			<Tabs
				// The pill floats over the scene rather than sitting below it, so
				// the wrapper is absolute and the scene reserves the room the pill
				// covers (below) instead.
				tabBar={(props) => (
					<View
						pointerEvents="box-none"
						style={{
							position: "absolute",
							left: 0,
							right: 0,
							bottom: insets.bottom + TAB_BAR_GAP,
							paddingHorizontal: TAB_BAR_SIDE_MARGIN,
							alignItems: "center",
						}}
					>
						<ExpoRouterTabBar {...props} style={{ width: "100%", maxWidth: TAB_BAR_MAX_WIDTH }} />
					</View>
				)}
				screenOptions={{
					headerShown: false,
					// Everything the scene lays out — including FixedFooter, which
					// pins to the bottom of the scene's padding box — clears the pill.
					sceneStyle: {
						paddingBottom: insets.bottom + TAB_BAR_GAP + TAB_BAR_HEIGHT,
					},
				}}
			>
				{TAB_SCREENS.map(({ name, title: tabTitle, Icon }) => (
					<Tabs.Screen
						key={name}
						name={name}
						options={{
							title: tabTitle,
							tabBarIcon: ({ focused, color, size }) => (
								<Icon size={size} color={color} active={focused} />
							),
						}}
					/>
				))}
			</Tabs>
			<BottomDrawer visible={isVisible} onClose={hideDrawer} title={title}>
				{content}
			</BottomDrawer>
		</View>
	);
}
