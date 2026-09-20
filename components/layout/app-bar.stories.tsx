import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { AppBar, BackGlyph, MenuGlyph } from "@/components/layout/app-bar";
import { Button } from "@/components/ui/reusables/button/button";
import { CircleButton } from "@/components/ui/reusables/circle-button/circle-button";
import { Text } from "@/components/ui/reusables/text/text";

/**
 * AppBar — the global header (FEATURE-INVENTORY §0.2), at the three right-slot
 * states the header can be in.
 *
 * `Header.tsx` is what picks between them, from the route and the `navButton`
 * a screen passed down. It cannot have stories of its own: it reaches
 * expo-router, the drawer context and Supabase, none of which resolve in
 * Storybook's vite build — so the rule lives in `Header`, has jest coverage in
 * `__tests__/components/layout/header.test.tsx`, and the *look* of each of the
 * three outcomes is here.
 *
 * The heart is `person.a.base`, live: switch the pair and the bar moves with
 * the cards.
 */
const meta = {
	title: "Shell/AppBar",
	component: AppBar,
	parameters: { layout: "fullscreen" },
	decorators: [
		(Story) => (
			// Phone width, on the page background the bar actually sits on.
			<View className="w-[390px] self-center rounded-card bg-bg py-2">
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof AppBar>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Case 1 — the index route. The settings circle, and the only place in the app
 * that opens the settings sheet.
 */
export const Settings: Story = {
	args: {
		right: (
			<CircleButton label="Settings" onPress={() => {}}>
				<MenuGlyph />
			</CircleButton>
		),
	},
};

/** Case 2 — any other route with `showBackButton`. */
export const Back: Story = {
	args: {
		right: (
			<CircleButton label="Back" onPress={() => {}}>
				<BackGlyph />
			</CircleButton>
		),
	},
};

/**
 * Case 3 — a screen supplied its own `navButton`, which beats both circles
 * wherever it is.
 */
export const CustomNavButton: Story = {
	args: {
		right: (
			<Button size="sm" className="h-9 rounded-button px-4" onPress={() => {}}>
				<Text className="text-[13px] font-semibold leading-[18px] text-cta-fg">Done</Text>
			</Button>
		),
	},
};

/** Nothing on the right: the welcome-adjacent routes that only want the brand. */
export const BrandOnly: Story = {
	args: {},
};
