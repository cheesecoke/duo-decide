import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { BackGlyph, MenuGlyph } from "@/components/layout/app-bar";
import { CircleButton } from "@/components/ui/reusables/circle-button/circle-button";
import { Caption } from "@/components/ui/reusables/headline/headline";
import { NEUTRAL } from "@/theme/neutrals";
import { usePersonColors } from "@/theme/usePersonColors";

/**
 * CircleButton — the mock's `.circ`
 * (design-refs/mocks/decision-queue-round-3.html:91).
 *
 * Hold one down: it shrinks to 0.96 over `dur.fast` and springs back on
 * release. With the OS "reduce motion" setting on it should not move at all
 * while still reporting the press.
 *
 * It is always `surface` on `shadow.card` — the disc does not change colour
 * with state, only the glyph inside it does, which is why the glyph is a
 * child rather than a variant.
 */
const meta = {
	title: "Reusables/CircleButton",
	component: CircleButton,
	decorators: [
		(Story) => (
			<View className="self-center">
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof CircleButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Settings: Story = {
	args: {
		label: "Settings",
		onPress: () => {},
		children: <MenuGlyph />,
	},
};

export const Back: Story = {
	args: {
		label: "Back",
		onPress: () => {},
		children: <BackGlyph />,
	},
};

/** Disabled is the one state: half opacity, no press, no scale. */
export const Disabled: Story = {
	args: {
		label: "Settings",
		disabled: true,
		onPress: () => {},
		children: <MenuGlyph />,
	},
};

/**
 * The glyph is free to be any colour — the sheet's close button is `ink-2`,
 * but a person-coloured mark reads as "this control belongs to them".
 */
function PersonGlyphRow() {
	const person = usePersonColors();

	return (
		<View className="items-center gap-3">
			<View className="flex-row gap-3">
				<CircleButton label="Person A" onPress={() => {}}>
					<MenuGlyph color={person.a.deep} />
				</CircleButton>
				<CircleButton label="Person B" onPress={() => {}}>
					<MenuGlyph color={person.b.deep} />
				</CircleButton>
				<CircleButton label="Neutral" onPress={() => {}}>
					<MenuGlyph color={NEUTRAL.ink2} />
				</CircleButton>
			</View>
			<Caption>A · B · ink-2</Caption>
		</View>
	);
}

export const GlyphColours: Story = {
	args: { label: "Settings", onPress: () => {}, children: null },
	render: () => <PersonGlyphRow />,
};
