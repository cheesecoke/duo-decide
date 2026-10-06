import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import {
	CardMenu,
	CardMenuTrigger,
	TrashGlyph,
	useCardMenu,
} from "@/components/ui/reusables/card-menu/card-menu";
import { Card } from "@/components/ui/reusables/card/card";
import { Caption, Title } from "@/components/ui/reusables/headline/headline";
import { ChevronGlyph, IconButton } from "@/components/ui/reusables/icon-button/icon-button";

/**
 * CardMenu — the `⋯` overflow both card headers hide delete behind.
 *
 * What to look for:
 *
 * - The trigger toggles: a second press on `⋯` closes the panel, and so does
 *   pressing an item.
 * - The panel floats on `shadow.float` over whatever is under it, which is
 *   why it is a sibling of the header row rather than a child of the 30 px
 *   button — `Card` clips to its own corners, so a card this short is also
 *   the test of whether the default offset still fits.
 * - A destructive row is the only coloured thing in the panel.
 */

/** A header row with the real control cluster, so the offsets are honest. */
function Demo({
	items,
	className,
}: {
	items: React.ComponentProps<typeof CardMenu>["items"];
	className?: string;
}) {
	const menu = useCardMenu();
	const [expanded, setExpanded] = React.useState(false);

	return (
		<Card state="a">
			<View className="flex-row items-start gap-2.5">
				<View className="min-w-0 flex-1 gap-1">
					<Title>Dinner spots</Title>
					<Caption className="text-ink-3">3 options</Caption>
				</View>
				<CardMenuTrigger menu={menu} />
				<IconButton
					label={expanded ? "Collapse" : "Expand"}
					accessibilityState={{ expanded }}
					onPress={() => setExpanded((open) => !open)}
				>
					<ChevronGlyph />
				</IconButton>
			</View>

			<CardMenu menu={menu} items={items} testID="card-menu-demo" className={className} />
		</Card>
	);
}

const meta = {
	title: "Reusables/CardMenu",
	component: CardMenu,
	decorators: [
		(Story) => (
			<View className="w-full max-w-md self-center">
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof CardMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The one item every card has. Press `⋯`. */
export const Delete: Story = {
	args: { menu: { open: false, toggle: () => {}, close: () => {} }, items: [] },
	render: () => (
		<Demo
			items={[{ label: "Delete list", destructive: true, icon: <TrashGlyph />, onPress: () => {} }]}
		/>
	),
};

/** More than one, and not all of them destructive. */
export const Several: Story = {
	args: { menu: { open: false, toggle: () => {}, close: () => {} }, items: [] },
	render: () => (
		<Demo
			items={[
				{ label: "Duplicate", onPress: () => {} },
				{ label: "Delete list", destructive: true, icon: <TrashGlyph />, onPress: () => {} },
			]}
		/>
	),
};

/** The panel tucked up under its trigger, for a card with less room below. */
export const HigherPanel: Story = {
	args: { menu: { open: false, toggle: () => {}, close: () => {} }, items: [] },
	render: () => (
		<Demo
			className="top-[38px]"
			items={[{ label: "Delete list", destructive: true, icon: <TrashGlyph />, onPress: () => {} }]}
		/>
	),
};
