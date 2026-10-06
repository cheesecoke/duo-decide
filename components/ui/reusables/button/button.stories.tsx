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
 * Colour comes from the component's own variants: `tailwind.config.js` aliases
 * the shadcn token names the upstream Reusables file is written against onto
 * the Duo tokens (`primary` → `cta`, `secondary` → `surface-2`, …), so these
 * stories exercise the real component API rather than re-styling it at the
 * call site. Only shape and type are set here: `rounded-button` is the 9999
 * pill from tokens.md §4, and the label sizes come from tokens.md §5.
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
		<Button className={PILL}>
			<Text className="text-base font-semibold">Make the call</Text>
		</Button>
	),
};

export const Secondary: Story = {
	render: () => (
		<Button variant="secondary" className={PILL}>
			<Text className="text-base font-semibold">Not yet</Text>
		</Button>
	),
};

export const Ghost: Story = {
	render: () => (
		<Button variant="ghost" className={PILL}>
			<Text className="text-base font-medium">Skip for now</Text>
		</Button>
	),
};

/** All three stacked, on the page background, to check them against each other. */
export const AllVariants: Story = {
	render: () => (
		<View className="gap-3">
			<Button className={PILL}>
				<Text className="text-base font-semibold">Make the call</Text>
			</Button>
			<Button variant="secondary" className={PILL}>
				<Text className="text-base font-semibold">Not yet</Text>
			</Button>
			<Button variant="ghost" className={PILL}>
				<Text className="text-base font-medium">Skip for now</Text>
			</Button>
		</View>
	),
};

/** Primary with the person-a / person-b end-cap dot from tokens.md §7.1. */
export const PrimaryWithPersonCap: Story = {
	render: () => (
		<View className="gap-3">
			<Button className={`${PILL} px-2`}>
				<Text className="flex-1 text-center text-base font-semibold">Your pick</Text>
				<View className="h-10 w-10 rounded-chip bg-person-a-base" />
			</Button>
			<Button className={`${PILL} px-2`}>
				<Text className="flex-1 text-center text-base font-semibold">Their pick</Text>
				<View className="h-10 w-10 rounded-chip bg-person-b-base" />
			</Button>
		</View>
	),
};
