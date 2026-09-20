import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { CollapseAllButton } from "@/components/layout/collapse-all-button";
import { ErrorStrip } from "@/components/layout/error-strip";
import { FooterPill } from "@/components/layout/footer-pill";
import { IntroCard } from "@/components/layout/intro-card";
import { WELCOME_DECISION, WELCOME_OPTIONS } from "@/lib/welcomeDecisionContent";

/**
 * Screen chrome — the pieces every tab screen shares.
 *
 * They were written inside the Decision Queue screen and hoisted into
 * `components/layout/` for PLAN-3 task 10, where Options needs the same
 * error strip, the same intro card and the same footer pill. Nothing about
 * them changed in the move; this file is where they are looked at.
 */
const meta = {
	title: "Layout/Screen chrome",
	decorators: [
		(Story) => (
			<View className="w-full max-w-md gap-4 self-center p-4">
				<Story />
			</View>
		),
	],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/** The banner, in the two lengths it actually shows up in. */
export const Error: Story = {
	name: "ErrorStrip",
	render: () => (
		<>
			<ErrorStrip message="Failed to load option lists" />
			<ErrorStrip message="Failed to update decision. Please try again." />
		</>
	),
};

/** The Options tab's first run — `WELCOME_OPTIONS`, four guide lines. */
export const IntroOptions: Story = {
	name: "IntroCard — WELCOME_OPTIONS",
	render: () => <IntroCard content={WELCOME_OPTIONS} onDismiss={() => {}} />,
};

/** The queue's copy, for comparison: same card, different content. */
export const IntroDecision: Story = {
	name: "IntroCard — WELCOME_DECISION",
	render: () => <IntroCard content={WELCOME_DECISION} onDismiss={() => {}} />,
};

/** One black element per screen, with the person-A end-cap. */
export const Footer: Story = {
	name: "FooterPill",
	render: () => (
		<>
			<FooterPill label="Create Decision" onPress={() => {}} />
			<FooterPill label="Create List" onPress={() => {}} />
		</>
	),
};

/**
 * The collapse-all circle beside a tab's eyebrow. The two states are the two
 * marks — `unfold_less` while the cards are open, `unfold_more` once they are
 * collapsed — and the accessible name says what the press will *do*, never
 * what the screen currently is.
 */
export const CollapseAll: Story = {
	name: "CollapseAllButton",
	render: () => (
		<View className="flex-row items-center gap-3">
			<CollapseAllButton allCollapsed={false} onPress={() => {}} />
			<CollapseAllButton allCollapsed onPress={() => {}} />
		</View>
	),
};
