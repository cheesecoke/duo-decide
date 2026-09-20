import * as React from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { Caption } from "@/components/ui/reusables/headline/headline";
import { ExpoRouterTabBar } from "@/components/ui/reusables/tab-bar/expo-router-tab-bar";
import { NEUTRAL } from "@/theme/neutrals";
import {
	TabBar,
	type TabBarIconProps,
	type TabBarTab,
} from "@/components/ui/reusables/tab-bar/tab-bar";

/**
 * TabBar — tokens.md §7 component 7.
 *
 * A floating `surface` pill on `shadow.float`, 64 px tall, that does not
 * position itself: every story below puts it in a centred column, and a screen
 * would pin it over the content with a safe-area inset instead.
 *
 * The active tab is person A's hue on all three counts — a `radius.tab-active`
 * square of `tint` behind the icon, the icon in `deep`, the label at 600 in
 * `ink`. Tap through the interactive story to watch the square fade in over
 * `dur.fast` while the icon springs to 1.1 on `spring.snappy`. (Try it with
 * the OS "reduce motion" setting on too — both should land instantly.)
 */
const meta = {
	title: "Reusables/TabBar",
	component: TabBar,
	decorators: [
		(Story) => (
			<View className="w-full max-w-md gap-4 self-center">
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof TabBar>;

export default meta;

type Story = StoryObj<typeof meta>;

/* -------------------------------------------------------------------------- */
/* placeholder icons                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Stand-ins until the icon set exists: thin single-stroke line art in the
 * colour the bar hands down, which is the same drawing rule tokens.md §9 sets
 * for the characters.
 */
function QueueIcon({ color, size }: TabBarIconProps) {
	return (
		<Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
			<Line x1={4} y1={7} x2={20} y2={7} stroke={color} strokeWidth={2} strokeLinecap="round" />
			<Line x1={4} y1={12} x2={20} y2={12} stroke={color} strokeWidth={2} strokeLinecap="round" />
			<Line x1={4} y1={17} x2={14} y2={17} stroke={color} strokeWidth={2} strokeLinecap="round" />
		</Svg>
	);
}

function HistoryIcon({ color, size }: TabBarIconProps) {
	return (
		<Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
			<Circle cx={12} cy={12} r={8} stroke={color} strokeWidth={2} />
			<Path d="M12 7.5V12l3 2" stroke={color} strokeWidth={2} strokeLinecap="round" />
		</Svg>
	);
}

function OptionsIcon({ color, size }: TabBarIconProps) {
	return (
		<Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
			<Line x1={4} y1={9} x2={20} y2={9} stroke={color} strokeWidth={2} strokeLinecap="round" />
			<Line x1={4} y1={15} x2={20} y2={15} stroke={color} strokeWidth={2} strokeLinecap="round" />
			<Circle cx={9} cy={9} r={2.5} stroke={color} strokeWidth={2} fill={NEUTRAL.surface} />
			<Circle cx={15} cy={15} r={2.5} stroke={color} strokeWidth={2} fill={NEUTRAL.surface} />
		</Svg>
	);
}

const TABS: TabBarTab[] = [
	{ key: "queue", label: "Queue", icon: (props) => <QueueIcon {...props} /> },
	{ key: "history", label: "History", icon: (props) => <HistoryIcon {...props} /> },
	{ key: "options", label: "Options", icon: (props) => <OptionsIcon {...props} /> },
];

/* -------------------------------------------------------------------------- */
/* stories                                                                     */
/* -------------------------------------------------------------------------- */

export const Default: Story = {
	args: { tabs: TABS, activeKey: "queue", onChange: () => {} },
};

// `render` still has to carry `args`: TabBar's props are required, so the
// story type demands them even when the render function ignores them.
const BASE_ARGS = { tabs: TABS, activeKey: "queue", onChange: () => {} };

/** Every tab as the selected one, to check the square against each icon. */
export const EachTabActive: Story = {
	args: BASE_ARGS,
	render: () => (
		<>
			{TABS.map((tab) => (
				<TabBar key={tab.key} tabs={TABS} activeKey={tab.key} onChange={() => {}} />
			))}
		</>
	),
};

function InteractiveDemo() {
	const [activeKey, setActiveKey] = React.useState("queue");

	return (
		<>
			<TabBar tabs={TABS} activeKey={activeKey} onChange={setActiveKey} />
			<Caption className="text-center">activeKey: {activeKey}</Caption>
		</>
	);
}

/** The motion story: tap between tabs and watch the square and icon move. */
export const Interactive: Story = {
	args: BASE_ARGS,
	render: () => <InteractiveDemo />,
};

/**
 * Labels share the pill's width evenly and truncate rather than push their
 * neighbours off it — the failure mode a three-word tab name would otherwise
 * cause.
 */
export const LongLabels: Story = {
	args: {
		activeKey: "queue",
		onChange: () => {},
		tabs: [
			{ key: "queue", label: "Decision Queue", icon: (props) => <QueueIcon {...props} /> },
			{ key: "history", label: "Past Decisions", icon: (props) => <HistoryIcon {...props} /> },
			{ key: "options", label: "Options & Settings", icon: (props) => <OptionsIcon {...props} /> },
		],
	},
};

/** Two tabs, for the case where a screen is hidden from the bar. */
export const TwoTabs: Story = {
	args: { tabs: TABS.slice(0, 2), activeKey: "history", onChange: () => {} },
};

/* -------------------------------------------------------------------------- */
/* the Expo Router adapter                                                     */
/* -------------------------------------------------------------------------- */

/**
 * `ExpoRouterTabBar` is what `<Tabs tabBar={...}>` will be handed; it is
 * exported but NOT yet wired into app/. The prop bag below is the four fields
 * it actually reads, stood up by hand — a real navigator cannot be run inside
 * a story.
 */
const NAVIGATOR_PROPS = {
	state: {
		index: 1,
		routes: [
			{ key: "index-1", name: "index" },
			{ key: "history-1", name: "history" },
			{ key: "options-1", name: "options" },
		],
	},
	descriptors: {
		"index-1": {
			options: { title: "Queue", tabBarIcon: (props: TabBarIconProps) => <QueueIcon {...props} /> },
		},
		"history-1": {
			options: {
				title: "History",
				tabBarIcon: (props: TabBarIconProps) => <HistoryIcon {...props} />,
			},
		},
		"options-1": {
			options: {
				title: "Options",
				tabBarIcon: (props: TabBarIconProps) => <OptionsIcon {...props} />,
			},
		},
	},
	navigation: { emit: () => ({ defaultPrevented: false }), navigate: () => {} },
	insets: { top: 0, bottom: 0, left: 0, right: 0 },
} as unknown as React.ComponentProps<typeof ExpoRouterTabBar>;

export const ExpoRouterAdapter: Story = {
	args: BASE_ARGS,
	render: () => (
		<>
			<ExpoRouterTabBar {...NAVIGATOR_PROPS} />
			<Caption className="text-center">
				routes → tabs, focused index → activeKey, press → navigate
			</Caption>
		</>
	),
};
