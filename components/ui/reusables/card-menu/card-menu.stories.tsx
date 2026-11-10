import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import {
	ArchiveGlyph,
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
 * - It is a popover: a click anywhere outside the panel closes it and does
 *   nothing else (the card's chevron under the backdrop does not expand).
 *   So does a second press on `⋯`, Escape, and pressing an item.
 * - The panel floats on `shadow.float` in its own Modal, hung under the `⋯`
 *   it measured, right edges aligned — `Card`'s clipping no longer reaches
 *   it, however short the card.
 * - Near the bottom of the window it opens upward instead (Near the bottom).
 * - One at a time: opening a second card's menu closes the first.
 * - A destructive row is the only coloured thing in the panel.
 */

/** A header row with the real control cluster, so the offsets are honest. */
function Demo({
	items,
	className,
	open = false,
	title = "Dinner spots",
}: {
	items: React.ComponentProps<typeof CardMenu>["items"];
	className?: string;
	/** Start with the menu open, so the story shows the panel. */
	open?: boolean;
	title?: string;
}) {
	const menu = useCardMenu(open);
	const [expanded, setExpanded] = React.useState(false);

	return (
		<Card state="a">
			<View className="flex-row items-start gap-2.5">
				<View className="min-w-0 flex-1 gap-1">
					<Title>{title}</Title>
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
			{expanded ? <Caption className="mt-3">Expanded — the chevron was pressed.</Caption> : null}
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

const CLOSED = { open: false, toggle: () => {}, close: () => {}, triggerRef: { current: null } };
const DELETE_ONLY = [
	{ label: "Delete list", destructive: true, icon: <TrashGlyph />, onPress: () => {} },
];
const ARCHIVE_DELETE = [
	{ label: "Archive", icon: <ArchiveGlyph />, onPress: () => {} },
	{ label: "Delete decision", destructive: true, icon: <TrashGlyph />, onPress: () => {} },
];

/** The one item every card has. Press `⋯`, then click anywhere else. */
export const Delete: Story = {
	args: { menu: CLOSED, items: [] },
	render: () => <Demo items={DELETE_ONLY} />,
};

/** Open: the panel under its `⋯`, over an invisible backdrop that closes it. */
export const Open: Story = {
	args: { menu: CLOSED, items: [] },
	render: () => <Demo open items={ARCHIVE_DELETE} />,
};

/** More than one, and not all of them destructive. */
export const Several: Story = {
	args: { menu: CLOSED, items: [] },
	render: () => (
		<Demo
			items={[
				{ label: "Duplicate", onPress: () => {} },
				{ label: "Delete list", destructive: true, icon: <TrashGlyph />, onPress: () => {} },
			]}
		/>
	),
};

/**
 * A column of cards, the way the queue shows them: open one menu, then click
 * another card's `⋯` (the first closes — the click lands on the backdrop),
 * the page, or a chevron (it closes, and the card does not expand).
 */
export const AColumn: Story = {
	name: "A column — one at a time",
	args: { menu: CLOSED, items: [] },
	render: () => (
		<View className="gap-3">
			<Demo open title="Dinner spots" items={ARCHIVE_DELETE} />
			<Demo title="Saturday plans" items={DELETE_ONLY} />
			<Demo title="Movie night" items={DELETE_ONLY} />
		</View>
	),
};

/** A card at the bottom of the window: the panel opens upward instead. */
export const NearTheBottom: Story = {
	name: "Near the bottom → opens upward",
	args: { menu: CLOSED, items: [] },
	render: () => (
		<View className="min-h-[850px] justify-end">
			<Demo open title="Last card" items={ARCHIVE_DELETE} />
		</View>
	),
};
