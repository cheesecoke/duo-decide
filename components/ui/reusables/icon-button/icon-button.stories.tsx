import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { AnimatedView } from "@/components/ui/reusables/animated/animated";
import { Caption } from "@/components/ui/reusables/headline/headline";
import { ChevronGlyph, IconButton } from "@/components/ui/reusables/icon-button/icon-button";
import { NEUTRAL } from "@/theme/neutrals";

/**
 * IconButton — the mock's `.iconbtn`, the 30 px circle every card header's
 * controls sit in (design-refs/mocks/decision-queue-round-3.html).
 *
 * It is deliberately plainer than `CircleButton`: no shadow, no press scale,
 * `surface-2` rather than `surface`. `CircleButton` is a floating control on
 * the page; this one sits *inside* a card, in a row with two or three of its
 * siblings, and a disc with a shadow there would read as a stack of chips.
 *
 * The one variant is the fill: the save tick wears `person-a-tint` so the
 * confirming action is the coloured one in a row that is otherwise grey.
 *
 * What to look for: the circle is fixed at 30 × 30 whatever the glyph is, and
 * the glyph is always decorative — the accessible name is on the button.
 */
const meta = {
	title: "Reusables/IconButton",
	component: IconButton,
	decorators: [
		(Story) => (
			<View className="self-center">
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof IconButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		label: "Expand",
		onPress: () => {},
		children: <ChevronGlyph />,
	},
};

/** `person-a-tint` — the save tick in an inline edit's control row. */
export const Tinted: Story = {
	args: {
		label: "Save edit",
		className: "bg-person-a-tint",
		onPress: () => {},
		children: <ChevronGlyph color={NEUTRAL.ink} />,
	},
};

/**
 * The expanded state. The chevron itself never changes — the card rotates it
 * 180° over `dur.base`, which is what the two rows below stand still for.
 */
function ChevronStates() {
	return (
		<View className="items-center gap-3">
			<View className="flex-row items-center gap-3">
				<IconButton label="Expand" accessibilityState={{ expanded: false }} onPress={() => {}}>
					<ChevronGlyph />
				</IconButton>
				<IconButton label="Collapse" accessibilityState={{ expanded: true }} onPress={() => {}}>
					<AnimatedView style={{ transform: [{ rotate: "180deg" }] }}>
						<ChevronGlyph />
					</AnimatedView>
				</IconButton>
			</View>
			<Caption className="text-ink-3">collapsed · expanded</Caption>
		</View>
	);
}

export const Chevron: Story = {
	args: { label: "Expand", onPress: () => {}, children: null },
	render: () => <ChevronStates />,
};
