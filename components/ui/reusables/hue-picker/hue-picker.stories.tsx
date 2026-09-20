import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { HuePicker } from "@/components/ui/reusables/hue-picker/hue-picker";
import { PersonPairProvider } from "@/theme/PersonPairProvider";
import type { HuePair } from "@/theme/pair-choice";

/**
 * HuePicker — tokens.md §1/§2, the picker those sections say to build in.
 *
 * What to look for:
 *
 * - **The swatches never change.** They are the five presets as they are, so
 *   they still show you what you would be switching to after you have
 *   switched. The two *characters* do change — they are drawn in whatever
 *   pair is active, which is the live preview.
 * - **No swatch is ever disabled.** Pressing the hue the other row is wearing
 *   swaps the two rows, because the seats may never match.
 * - **The ring is a 2 px `ink` border with a 2 px `surface` gap**, and the
 *   unselected swatches reserve the same space, so nothing moves on a pick.
 *
 * Each story drives a real `PersonPairProvider` from its own state, so the
 * characters recolour as you press — the same wiring `app/_layout.tsx` has.
 */

function LivePicker({ initial, partnerName }: { initial: HuePair; partnerName: string | null }) {
	const [pair, setPair] = React.useState<HuePair>(initial);

	return (
		<PersonPairProvider a={pair.a} b={pair.b} className="flex-1">
			<View className="w-[390px] self-center rounded-card bg-surface p-5">
				<HuePicker value={pair} onChange={setPair} youName="Chase" partnerName={partnerName} />
			</View>
		</PersonPairProvider>
	);
}

const meta = {
	title: "Reusables/HuePicker",
	component: HuePicker,
	parameters: { layout: "fullscreen" },
	args: {
		value: { a: "sage", b: "blush" },
		onChange: () => {},
		youName: "Chase",
		partnerName: "Sam",
	},
} satisfies Meta<typeof HuePicker>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The tokens.md §1 defaults — sage for you, blush for your partner. */
export const Default: Story = {
	render: () => <LivePicker initial={{ a: "sage", b: "blush" }} partnerName="Sam" />,
};

/**
 * The same two hues, the other way round — what pressing your partner's blush
 * in the "You" row leaves you with. Nothing is disabled and nothing is lost.
 */
export const Swapped: Story = {
	render: () => <LivePicker initial={{ a: "blush", b: "sage" }} partnerName="Sam" />,
};

/** No partner linked yet: the second row is still yours to set, as "Partner". */
export const NoPartner: Story = {
	render: () => <LivePicker initial={{ a: "butter", b: "lavender" }} partnerName={null} />,
};
