import * as React from "react";
import { Pressable, View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { Caption } from "@/components/ui/reusables/headline/headline";
import { OptionText } from "@/components/ui/reusables/option-text/option-text";

/**
 * OptionText — an option title with its pasted links made tappable.
 *
 * Each `http(s)://…` or `www.…` run is shown as its hostname without `www.`,
 * underlined in person A's `deep`, with a small arrow-out-of-box mark. Press
 * one and it opens in a new tab (web) or the system browser (native). The
 * full URL is the link's accessible label.
 *
 * `InsideARow` puts it inside a pressable row the way the decision card does:
 * pressing the row counts, pressing the link only opens the link.
 */
const meta = {
	title: "Reusables/OptionText",
	component: OptionText,
	args: {
		text: "Alexa Sharf: https://www.psychologytoday.com/us/therapists/alexa-sharf-boulder-co/1234567",
		className: "text-row text-ink",
	},
	decorators: [
		(Story) => (
			<View className="w-full max-w-md gap-4 self-center rounded-card bg-surface p-4">
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof OptionText>;

export default meta;

type Story = StoryObj<typeof meta>;

/** No link in it: the text exactly as typed. */
export const PlainText: Story = {
	args: { text: "Coffee/Boulder Creek Festival - recreate our date." },
};

/** A name and a pasted URL — the case this exists for. */
export const NameAndLink: Story = {};

/** A link on its own: just the host. Subdomains other than `www.` stay. */
export const LinkOnly: Story = {
	args: { text: "https://secure.helloalma.com/providers/hazel-patel-lmft-therapist-boulder/" },
};

/** `www.` without a scheme opens over https. */
export const BareWww: Story = { args: { text: "Brunch: www.yelp.com/biz/snooze-boulder" } };

/** Two links in one sentence, wrapping like any paragraph. */
export const TwoLinks: Story = {
	args: {
		text:
			"Either https://www.opentable.com/r/frasca-food-and-wine-boulder or https://www.resy.com/cities/den/blackbelly — whichever has a table",
	},
};

/** Semibold, as a picked option row sets it — the link inherits the weight. */
export const Semibold: Story = { args: { className: "text-row font-semibold text-ink" } };

/** In a row: press the row and the count goes up; press the link and it does not. */
export const InsideARow: Story = {
	render: (args) => {
		function Row() {
			const [presses, setPresses] = React.useState(0);
			return (
				<View className="gap-2">
					<Pressable
						role="button"
						onPress={() => setPresses((count) => count + 1)}
						className="min-h-12 flex-row items-center rounded-field border border-line px-4 py-3 active:bg-surface-2"
					>
						<OptionText {...args} className="min-w-0 flex-1 text-row text-ink" />
					</Pressable>
					<Caption>Row presses: {presses}</Caption>
				</View>
			);
		}
		return <Row />;
	},
};
