import * as React from "react";
import { Text } from "react-native";
import { render, screen, userEvent } from "@testing-library/react-native";

import { ExpoRouterTabBar } from "@/components/ui/reusables/tab-bar/expo-router-tab-bar";
import { TabBar, type TabBarTab } from "@/components/ui/reusables/tab-bar/tab-bar";
import { NEUTRAL } from "@/theme/neutrals";
import { getPreset } from "@/theme/presets";

// nativewind/babel is off under jest (see babel.config.js) and the Reanimated
// mock lands every animated value on its target immediately, so neither the
// active square nor the icon spring is visible here. These tests cover the
// callback, the accessibility contract, the colour the icon is handed, and
// the Expo Router adapter's mapping; the look and the motion are Storybook's
// job (tab-bar.stories.tsx).
//
// `userEvent` rather than `fireEvent`, for the reason spelled out in
// chip.test.tsx: fireEvent walks up to composite parents and would fire a
// handler the host element never accepted.

/** Icons are given their colour by the bar, so render it and assert on it. */
function colorProbe(key: string) {
	return function Icon({ color }: { color: string }) {
		return <Text>{`${key}:${color}`}</Text>;
	};
}

const TABS: TabBarTab[] = [
	{ key: "queue", label: "Queue", icon: (props) => React.createElement(colorProbe("queue"), props) },
	{
		key: "history",
		label: "History",
		icon: (props) => React.createElement(colorProbe("history"), props),
	},
	{
		key: "options",
		label: "Options",
		icon: (props) => React.createElement(colorProbe("options"), props),
	},
];

describe("TabBar", () => {
	it("renders one tab per entry, inside a tablist", () => {
		render(<TabBar tabs={TABS} activeKey="queue" onChange={jest.fn()} />);

		// `getByRole` is off the table here: RNTL only treats a host element
		// it recognises as accessible, and this repo's react-native mock
		// renders Pressable as a plain host node. Assert the prop, the same
		// way segmented-toggle.test.tsx does.
		expect(screen.getByTestId("tab-bar").props.role).toBe("tablist");
		expect(TABS.map((tab) => screen.getByTestId(`tab-${tab.key}`).props.role)).toEqual([
			"tab",
			"tab",
			"tab",
		]);
		expect(screen.getByText("History")).toBeTruthy();
	});

	it("calls onChange with the tab's key", async () => {
		const onChange = jest.fn();
		render(<TabBar tabs={TABS} activeKey="queue" onChange={onChange} />);

		await userEvent.setup().press(screen.getByTestId("tab-history"));

		expect(onChange).toHaveBeenCalledWith("history");
	});

	it("fires onChange again for the tab that is already active", async () => {
		// The bar does not own the selection, so swallowing this press would
		// quietly break a re-tap gesture (scroll to top) the owner may want.
		const onChange = jest.fn();
		render(<TabBar tabs={TABS} activeKey="queue" onChange={onChange} />);

		await userEvent.setup().press(screen.getByTestId("tab-queue"));

		expect(onChange).toHaveBeenCalledWith("queue");
	});

	it("marks only the active tab as selected", () => {
		render(<TabBar tabs={TABS} activeKey="history" onChange={jest.fn()} />);

		expect(screen.getByTestId("tab-history").props.accessibilityState).toEqual({ selected: true });
		expect(screen.getByTestId("tab-queue").props.accessibilityState).toEqual({ selected: false });
	});

	it("labels every tab for a screen reader, and names the tablist", () => {
		render(<TabBar tabs={TABS} activeKey="queue" onChange={jest.fn()} />);

		expect(screen.getByTestId("tab-bar").props.accessibilityLabel).toBe("Navigation");
		expect(screen.getByLabelText("Options")).toBeTruthy();
	});

	it("hands the active icon person A's deep and the rest ink-2", () => {
		const sageDeep = `hsl(${getPreset("sage").deep})`;
		render(<TabBar tabs={TABS} activeKey="queue" onChange={jest.fn()} />);

		expect(screen.getByText(`queue:${sageDeep}`)).toBeTruthy();
		expect(screen.getByText(`history:${NEUTRAL.ink2}`)).toBeTruthy();
	});
});

/* -------------------------------------------------------------------------- */
/* the Expo Router adapter                                                     */
/* -------------------------------------------------------------------------- */

type Route = { key: string; name: string; params?: object };

function navigatorProps({
	routes,
	index,
	options = {},
	emit,
	navigate,
}: {
	routes: Route[];
	index: number;
	options?: Record<string, unknown>;
	emit?: jest.Mock;
	navigate?: jest.Mock;
}) {
	const descriptors = Object.fromEntries(
		routes.map((route) => [route.key, { options: options[route.key] ?? {} }]),
	);

	return {
		state: { routes, index },
		descriptors,
		navigation: {
			emit: emit ?? jest.fn(() => ({ defaultPrevented: false })),
			navigate: navigate ?? jest.fn(),
		},
		insets: { top: 0, bottom: 0, left: 0, right: 0 },
		// The adapter reads four fields off a navigator prop bag that carries
		// dozens; a real BottomTabBarProps cannot be built without a running
		// navigator, so build the four and cast.
	} as unknown as React.ComponentProps<typeof ExpoRouterTabBar>;
}

const ROUTES: Route[] = [
	{ key: "queue-1", name: "index" },
	{ key: "history-1", name: "history", params: { filter: "all" } },
];

describe("ExpoRouterTabBar", () => {
	it("labels tabs from tabBarLabel, then title, then the route name", () => {
		render(
			<ExpoRouterTabBar
				{...navigatorProps({
					routes: ROUTES,
					index: 0,
					options: { "queue-1": { tabBarLabel: "Queue" } },
				})}
			/>,
		);

		expect(screen.getByText("Queue")).toBeTruthy();
		expect(screen.getByText("history")).toBeTruthy();
	});

	it("prefers title over the route name", () => {
		render(
			<ExpoRouterTabBar
				{...navigatorProps({
					routes: ROUTES,
					index: 0,
					options: { "history-1": { title: "History" } },
				})}
			/>,
		);

		expect(screen.getByText("History")).toBeTruthy();
	});

	it("marks the focused route's tab as selected", () => {
		render(<ExpoRouterTabBar {...navigatorProps({ routes: ROUTES, index: 1 })} />);

		expect(screen.getByTestId("tab-history-1").props.accessibilityState).toEqual({
			selected: true,
		});
	});

	it("renders the route's tabBarIcon with its focused flag", () => {
		render(
			<ExpoRouterTabBar
				{...navigatorProps({
					routes: ROUTES,
					index: 0,
					options: {
						"queue-1": {
							tabBarIcon: ({ focused }: { focused: boolean }) => <Text>{`queue focused=${focused}`}</Text>,
						},
						"history-1": {
							tabBarIcon: ({ focused }: { focused: boolean }) => (
								<Text>{`history focused=${focused}`}</Text>
							),
						},
					},
				})}
			/>,
		);

		expect(screen.getByText("queue focused=true")).toBeTruthy();
		expect(screen.getByText("history focused=false")).toBeTruthy();
	});

	it("skips a route expo-router has hidden with href: null", () => {
		// `href: null` is implemented as `tabBarItemStyle: { display: "none" }`
		// plus a `tabBarButton` that renders nothing. The route stays in
		// `state.routes`, so a custom tab bar has to skip it itself.
		render(
			<ExpoRouterTabBar
				{...navigatorProps({
					routes: ROUTES,
					index: 0,
					options: { "history-1": { tabBarItemStyle: { display: "none" } } },
				})}
			/>,
		);

		expect(screen.getByTestId("tab-queue-1")).toBeTruthy();
		expect(screen.queryByTestId("tab-history-1")).toBeNull();
	});

	it("reads display off a style array the way flatten would — last one wins", () => {
		render(
			<ExpoRouterTabBar
				{...navigatorProps({
					routes: ROUTES,
					index: 0,
					options: {
						"history-1": { tabBarItemStyle: [{ display: "flex" }, { display: "none" }] },
					},
				})}
			/>,
		);

		expect(screen.queryByTestId("tab-history-1")).toBeNull();
	});

	it("keeps a route whose tabBarItemStyle says nothing about display", () => {
		render(
			<ExpoRouterTabBar
				{...navigatorProps({
					routes: ROUTES,
					index: 0,
					options: { "history-1": { tabBarItemStyle: { paddingTop: 4 } } },
				})}
			/>,
		);

		expect(screen.getByTestId("tab-history-1")).toBeTruthy();
	});

	it("emits tabPress and navigates by route name, with the route's params", async () => {
		const emit = jest.fn(() => ({ defaultPrevented: false }));
		const navigate = jest.fn();
		render(<ExpoRouterTabBar {...navigatorProps({ routes: ROUTES, index: 0, emit, navigate })} />);

		await userEvent.setup().press(screen.getByTestId("tab-history-1"));

		expect(emit).toHaveBeenCalledWith({
			type: "tabPress",
			target: "history-1",
			canPreventDefault: true,
		});
		expect(navigate).toHaveBeenCalledWith("history", { filter: "all" });
	});

	it("does not navigate when the screen prevents the tabPress", async () => {
		const navigate = jest.fn();
		render(
			<ExpoRouterTabBar
				{...navigatorProps({
					routes: ROUTES,
					index: 0,
					emit: jest.fn(() => ({ defaultPrevented: true })),
					navigate,
				})}
			/>,
		);

		await userEvent.setup().press(screen.getByTestId("tab-history-1"));

		expect(navigate).not.toHaveBeenCalled();
	});

	it("does not navigate when the focused tab is pressed again", async () => {
		const emit = jest.fn(() => ({ defaultPrevented: false }));
		const navigate = jest.fn();
		render(<ExpoRouterTabBar {...navigatorProps({ routes: ROUTES, index: 0, emit, navigate })} />);

		await userEvent.setup().press(screen.getByTestId("tab-queue-1"));

		// The event still goes out — that is how a screen hears a re-tap.
		expect(emit).toHaveBeenCalled();
		expect(navigate).not.toHaveBeenCalled();
	});
});
