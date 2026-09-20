import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { Button } from "@/components/ui/reusables/button/button";
import { Card } from "@/components/ui/reusables/card/card";
import { Body, Caption, Title } from "@/components/ui/reusables/headline/headline";
import { Reveal } from "@/components/ui/reusables/reveal/reveal";
import { Text } from "@/components/ui/reusables/text/text";

/**
 * Reveal — the expand/collapse both collapsible cards are built on.
 *
 * This is the one place the motion is real: under jest the Reanimated mock
 * lands every value on its target immediately, so "the body grows into its
 * measured height over `dur.base` and fades in with it" is only visible here.
 *
 * What to look for:
 *
 * - **Open**: the body animates down from nothing and the text fades up with
 *   it, then the wrapper stops constraining the height entirely — press
 *   "Add a line" after it has opened and the card grows rather than clipping
 *   against `Card`'s `overflow-hidden`.
 * - **Closed**: the same in reverse. The children stay mounted for the length
 *   of the close and then unmount, which is why a card renders `<Reveal>`
 *   unconditionally.
 * - **ReducedMotion**: nothing moves. The body is simply there or not there,
 *   which is the whole point — the motion is decorative (tokens.md §8), so
 *   skipping it never changes what is on screen.
 */

/** A card with a real toggle, so the open and the close can both be watched. */
function Demo({ open: initial, reducedMotion }: { open: boolean; reducedMotion?: boolean }) {
	const [open, setOpen] = React.useState(initial);
	const [lines, setLines] = React.useState(1);

	React.useEffect(() => setOpen(initial), [initial]);

	return (
		<Card state="a">
			<View className="flex-row items-center justify-between gap-2.5">
				<Title>Where are we eating?</Title>
				<Button variant="secondary" className="rounded-button px-3" onPress={() => setOpen((o) => !o)}>
					<Text className="text-[14px] font-medium leading-5 text-ink">
						{open ? "Collapse" : "Expand"}
					</Text>
				</Button>
			</View>

			<Reveal testID="reveal-demo" open={open} reducedMotion={reducedMotion}>
				<View className="mb-3.5 h-px bg-line" />
				{Array.from({ length: lines }, (_, index) => (
					<Body key={index} className="text-ink-2">
						Somewhere we have not been, and somewhere we can walk to.
					</Body>
				))}
				<View className="mt-3 flex-row items-center gap-2.5">
					<Button
						variant="secondary"
						className="rounded-button px-3"
						onPress={() => setLines((count) => count + 1)}
					>
						<Text className="text-[14px] font-medium leading-5 text-ink">Add a line</Text>
					</Button>
					<Caption className="text-ink-3">the body may grow after it opens</Caption>
				</View>
			</Reveal>
		</Card>
	);
}

const meta = {
	title: "Reusables/Reveal",
	component: Reveal,
	decorators: [
		(Story) => (
			<View className="w-full max-w-md self-center">
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof Reveal>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Already open: press Collapse to watch the close, and "Add a line" to watch
 *  the settled wrapper let the card grow. */
export const Open: Story = {
	args: { testID: "reveal-demo", open: true, children: null },
	render: () => <Demo open />,
};

/** Closed: nothing is mounted at all until the first open. */
export const Closed: Story = {
	args: { testID: "reveal-demo", open: false, children: null },
	render: () => <Demo open={false} />,
};

/** The OS "reduce motion" setting, forced. The body arrives and leaves with
 *  no animation and no measured height — there and not there. */
export const ReducedMotion: Story = {
	args: { testID: "reveal-demo", open: true, children: null },
	render: () => <Demo open reducedMotion />,
};
