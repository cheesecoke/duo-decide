import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { Button } from "@/components/ui/reusables/button/button";
import { Text } from "@/components/ui/reusables/text/text";

/**
 * Duo's Button, per design-refs/tokens.md §7.1:
 * - primary: black (`cta`) pill, full width
 * - secondary: `surface-2` pill
 * - ghost: text only
 *
 * The upstream Reusables variants use shadcn tokens this project does not
 * define, so the Duo look comes from token classes passed at the call site.
 * `rounded-button` is the 9999 pill from tokens.md §4.
 */
const PILL = "h-14 w-full rounded-button";

const meta = {
	title: "Reusables/Button",
	component: Button,
	parameters: { layout: "fullscreen" },
	decorators: [
		(Story) => (
			<View className="w-full max-w-md gap-3 self-center">
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
	render: () => (
		<Button className={`${PILL} bg-cta`}>
			<Text className="text-base font-semibold text-cta-fg">Make the call</Text>
		</Button>
	),
};

export const Secondary: Story = {
	render: () => (
		<Button variant="secondary" className={`${PILL} bg-surface-2`}>
			<Text className="text-base font-semibold text-ink">Not yet</Text>
		</Button>
	),
};

export const Ghost: Story = {
	render: () => (
		<Button variant="ghost" className={`${PILL} bg-transparent`}>
			<Text className="text-base font-medium text-ink-2">Skip for now</Text>
		</Button>
	),
};

/** All three stacked, on the page background, to check them against each other. */
export const AllVariants: Story = {
	render: () => (
		<View className="gap-3">
			<Button className={`${PILL} bg-cta`}>
				<Text className="text-base font-semibold text-cta-fg">Make the call</Text>
			</Button>
			<Button variant="secondary" className={`${PILL} bg-surface-2`}>
				<Text className="text-base font-semibold text-ink">Not yet</Text>
			</Button>
			<Button variant="ghost" className={`${PILL} bg-transparent`}>
				<Text className="text-base font-medium text-ink-2">Skip for now</Text>
			</Button>
		</View>
	),
};

/** Primary with the person-a / person-b end-cap dot from tokens.md §7.1. */
export const PrimaryWithPersonCap: Story = {
	render: () => (
		<View className="gap-3">
			<Button className={`${PILL} bg-cta px-2 pr-2`}>
				<Text className="flex-1 text-center text-base font-semibold text-cta-fg">Your pick</Text>
				<View className="h-10 w-10 rounded-chip bg-person-a-base" />
			</Button>
			<Button className={`${PILL} bg-cta px-2 pr-2`}>
				<Text className="flex-1 text-center text-base font-semibold text-cta-fg">Their pick</Text>
				<View className="h-10 w-10 rounded-chip bg-person-b-base" />
			</Button>
		</View>
	),
};
