import * as React from "react";
import type { StyleProp, ViewStyle } from "react-native";

import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import { TabBar, type TabBarTab } from "@/components/ui/reusables/tab-bar/tab-bar";

/**
 * Adapter: Expo Router's `<Tabs tabBar>` contract → `TabBar`'s props.
 *
 *   <Tabs tabBar={(props) => <ExpoRouterTabBar {...props} className="…" />}>
 *
 * It lives apart from tab-bar.tsx on purpose. `TabBar` is a presentational
 * pill that knows nothing about navigation, which is what makes it testable
 * and storyable; everything that knows about routes, descriptors and the
 * `tabPress` event is in this file, and nothing else imports it.
 *
 * NOT wired into app/ yet — the screens land in a later task. This exports
 * the adapter so that task is a two-line change in app/(tabs)/_layout.tsx.
 *
 * `@react-navigation/bottom-tabs` is a transitive dependency of expo-router
 * rather than a direct one. The import above is type-only, so it is erased at
 * build time and adds no runtime edge — but if this ever grows a value import
 * the package has to be added to package.json first.
 */

type ExpoRouterTabBarProps = BottomTabBarProps & {
	className?: string;
	style?: StyleProp<ViewStyle>;
	accessibilityLabel?: string;
};

/**
 * The navigator's own `insets` are deliberately ignored: `TabBar` does not
 * position itself (see its docblock), so the screen decides how the pill
 * floats and how far off the bottom edge it sits.
 */
function ExpoRouterTabBar({
	state,
	descriptors,
	navigation,
	className,
	style,
	accessibilityLabel,
}: ExpoRouterTabBarProps) {
	const tabs = React.useMemo<TabBarTab[]>(
		() =>
			state.routes.map((route, index) => {
				const { options } = descriptors[route.key];
				// `tabBarLabel` may be a render function, which is a different
				// contract from TabBar's plain string. Fall back rather than
				// try to honour it.
				const label =
					typeof options.tabBarLabel === "string" ? options.tabBarLabel : (options.title ?? route.name);
				const tabBarIcon = options.tabBarIcon;

				return {
					// Route keys, not names: keys are unique even when a
					// navigator shows the same screen twice.
					key: route.key,
					label,
					icon: ({ color, size }) =>
						tabBarIcon?.({ focused: index === state.index, color, size }) ?? null,
				};
			}),
		[state.routes, state.index, descriptors],
	);

	const onChange = React.useCallback(
		(key: string) => {
			const index = state.routes.findIndex((route) => route.key === key);
			if (index < 0) return;
			const route = state.routes[index];

			// The react-navigation contract for a custom tab bar: a screen can
			// intercept its own tab press (scroll-to-top, an unsaved-changes
			// guard) by preventing this event, and a press on the focused tab
			// must not push a second navigation.
			const event = navigation.emit({
				type: "tabPress",
				target: route.key,
				canPreventDefault: true,
			});

			if (index !== state.index && !event.defaultPrevented) {
				navigation.navigate(route.name, route.params);
			}
		},
		[state.routes, state.index, navigation],
	);

	return (
		<TabBar
			tabs={tabs}
			activeKey={state.routes[state.index]?.key ?? ""}
			onChange={onChange}
			className={className}
			style={style}
			accessibilityLabel={accessibilityLabel}
		/>
	);
}

export { ExpoRouterTabBar };
export type { ExpoRouterTabBarProps };
