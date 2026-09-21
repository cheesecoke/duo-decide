import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { Caption } from "@/components/ui/reusables/headline/headline";
import { HeartMark } from "@/components/ui/reusables/heart-mark/heart-mark";
import { Chip } from "@/components/ui/reusables/chip/chip";
import { PersonPairProvider } from "@/theme/PersonPairProvider";
import { choosePair, type HuePair } from "@/theme/pair-choice";
import { NEUTRAL } from "@/theme/neutrals";
import { HUE_PRESETS } from "@/theme/presets";
import { usePersonColors } from "@/theme/usePersonColors";

/**
 * HeartMark — the app's brand mark, at the three sizes the app uses it.
 *
 * What to look for: **the line does not fatten with the mark.** The stroke is
 * drawn in grid units, so a fixed weight would render at 6 px on the 64 px
 * Welcome heart; the taper holds it near 3.4 instead. Sizes puts the tapered
 * and the untapered marks side by side — the untapered 64 has a closed notch
 * and a rope for an outline.
 */
const meta = {
	title: "Reusables/HeartMark",
	component: HeartMark,
	args: { color: NEUTRAL.ink },
	decorators: [
		(Story) => (
			<View className="w-full max-w-md gap-6 self-center">
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof HeartMark>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A labelled row, so a story reads as a comparison rather than a pile. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<View className="gap-2">
			<Caption>{label}</Caption>
			<View className="flex-row flex-wrap items-end gap-5">{children}</View>
		</View>
	);
}

export const Default: Story = {};

/** The three the app ships: 20 in the header, 40 on auth, 64 on Welcome. */
export const Sizes: Story = {
	render: () => (
		<>
			<Row label="Tapered — 20 (header) / 40 (auth) / 64 (Welcome)">
				<HeartMark color={NEUTRAL.ink} size={20} />
				<HeartMark color={NEUTRAL.ink} size={40} />
				<HeartMark color={NEUTRAL.ink} size={64} />
			</Row>
			<Row label="Untapered — the header's 1.9 grid units held at every size">
				<HeartMark color={NEUTRAL.ink} size={20} strokeWidth={1.9} />
				<HeartMark color={NEUTRAL.ink} size={40} strokeWidth={1.9} />
				<HeartMark color={NEUTRAL.ink} size={64} strokeWidth={1.9} />
			</Row>
		</>
	),
};

/** The mark reads on the page fill and on a card alike. */
export const OnSurfaces: Story = {
	render: () => (
		<>
			<View className="items-center rounded-card bg-bg p-6">
				<HeartMark color={NEUTRAL.ink} size={64} />
			</View>
			<View className="items-center rounded-card bg-surface p-6">
				<HeartMark color={NEUTRAL.ink} size={64} />
			</View>
		</>
	),
};

function PairHeart({ size }: { size: number }) {
	const person = usePersonColors();
	return <HeartMark color={person.a.base} size={size} />;
}

/**
 * Proof the mark is theme, not artwork: it is person A's `base` in the header,
 * on Welcome and on the auth screens, so a new pair redraws all three. The
 * swap goes through `PersonPairProvider`, the app's only writer of the two
 * colour channels.
 */
function RecolourDemo() {
	const [pair, setPair] = React.useState<HuePair>({ a: "sage", b: "blush" });

	return (
		<PersonPairProvider a={pair.a} b={pair.b} className="gap-5">
			<View className="gap-2">
				<Caption>Person A — the seat the mark wears</Caption>
				<View className="flex-row flex-wrap gap-2">
					{HUE_PRESETS.map((preset) => (
						<Chip
							key={preset.id}
							size="sm"
							label={preset.id}
							person="a"
							selected={pair.a === preset.id}
							onPress={() => setPair((current) => choosePair(current, "a", preset.id))}
						/>
					))}
				</View>
			</View>

			<View className="flex-row items-end gap-5 py-4">
				<PairHeart size={20} />
				<PairHeart size={40} />
				<PairHeart size={64} />
			</View>
		</PersonPairProvider>
	);
}

export const Recolours: Story = {
	render: () => <RecolourDemo />,
};
