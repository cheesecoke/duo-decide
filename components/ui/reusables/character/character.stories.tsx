import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { Card } from "@/components/ui/reusables/card/card";
import { Character, Fish, Goose } from "@/components/ui/reusables/character/character";
import { Chip } from "@/components/ui/reusables/chip/chip";
import { Body, Caption, Display, Eyebrow } from "@/components/ui/reusables/headline/headline";
import { PersonPairProvider } from "@/theme/PersonPairProvider";
import { HUE_PRESETS } from "@/theme/presets";
import type { PersonPairIds } from "@/theme/usePersonColors";

/**
 * Characters — tokens.md §9.
 *
 * Fish is person A, Goose is person B: single-stroke line art in that
 * person's `base`, standing in for the avatars Duo does not have. Three sizes
 * off one 96-unit drawing, four poses, and a muted grey for "waiting on
 * them".
 *
 * Motion is the point of half these stories and does not survive a
 * screenshot — open Poses and watch the idle pair breathe, and press Replay
 * in Celebrate to see the hop. Turn the OS "reduce motion" setting on and
 * both should simply be still.
 */
const meta = {
	title: "Reusables/Character",
	component: Character,
	args: { kind: "fish" },
	decorators: [
		(Story) => (
			<View className="w-full max-w-md gap-6 self-center">
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof Character>;

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

export const FishOnly: Story = {
	args: { kind: "fish" },
};

export const GooseOnly: Story = {
	args: { kind: "goose" },
};

/**
 * The three sizes, off one drawing. 32 is the vote-row avatar, 96 the empty
 * queue, 160 Welcome. The small mark carries a heavier line on purpose —
 * a proportional hairline vanishes at that size.
 */
export const Sizes: Story = {
	render: () => (
		<>
			<Row label="Fish — 32 / 96 / 160">
				<Fish size={32} />
				<Fish size={96} />
				<Fish size={160} />
			</Row>
			<Row label="Goose — 32 / 96 / 160">
				<Goose size={32} />
				<Goose size={96} />
				<Goose size={160} />
			</Row>
		</>
	),
};

/**
 * All four poses. Idle breathes on a 2 s loop, celebrate hops once, waiting
 * is still and grey, blocked keeps its colour and takes the ✕ badge.
 */
export const Poses: Story = {
	render: () => (
		<>
			<Row label="Fish — idle / celebrate / waiting / blocked">
				<Fish pose="idle" />
				<Fish pose="celebrate" />
				<Fish pose="waiting" />
				<Fish pose="blocked" />
			</Row>
			<Row label="Goose — idle / celebrate / waiting / blocked">
				<Goose pose="idle" />
				<Goose pose="celebrate" />
				<Goose pose="waiting" />
				<Goose pose="blocked" />
			</Row>
		</>
	),
};

/**
 * Muted is the colour axis, not a pose: it drops the person hue for `ink-3`
 * so the mark cannot be read as that person having acted. "Waiting" turns it
 * on by itself; any pose can be told to.
 */
export const Muted: Story = {
	render: () => (
		<>
			<Row label="In colour">
				<Fish />
				<Goose />
			</Row>
			<Row label="Muted">
				<Fish muted />
				<Goose muted />
			</Row>
			<Row label="Waiting — muted without being asked">
				<Fish pose="waiting" />
				<Goose pose="waiting" />
			</Row>
		</>
	),
};

/**
 * The blocked badge at each size (FEATURE-INVENTORY §3 row 18 — the creator
 * sits round 3 out).
 *
 * The badge hangs off each animal's own anchor rather than the corner of its
 * box: neither one fills 96 units, so a box-corner badge floats clear of the
 * fish it is meant to be marking. The disc is there because the character's
 * lines run under it; without a ground the cross reads as another fin.
 */
export const Blocked: Story = {
	render: () => (
		<>
			<Row label="Fish — 32 / 96 / 160">
				<Fish pose="blocked" size={32} />
				<Fish pose="blocked" size={96} />
				<Fish pose="blocked" size={160} />
			</Row>
			<Row label="Goose — 32 / 96 / 160">
				<Goose pose="blocked" size={32} />
				<Goose pose="blocked" size={96} />
				<Goose pose="blocked" size={160} />
			</Row>
		</>
	),
};

/**
 * The lockup as it sits on a card: 32 px marks beside the two names, with
 * whoever is still owed a vote muted.
 */
export const YouAndSamLockup: Story = {
	render: () => (
		<>
			<Card state="a" className="gap-4">
				<Eyebrow>Friday dinner</Eyebrow>
				<Body>Thai on Grand</Body>
				<View className="flex-row items-center gap-5">
					<View className="flex-row items-center gap-2">
						<Fish size={32} />
						<Caption>You</Caption>
					</View>
					<View className="flex-row items-center gap-2">
						<Goose size={32} pose="waiting" name="Sam" />
						<Caption>Sam</Caption>
					</View>
				</View>
			</Card>

			<Row label="Both voted">
				<View className="flex-row items-center gap-2">
					<Fish size={32} />
					<Caption>You</Caption>
				</View>
				<View className="flex-row items-center gap-2">
					<Goose size={32} name="Sam" />
					<Caption>Sam</Caption>
				</View>
			</Row>

			<Row label="You are sitting this round out">
				<View className="flex-row items-center gap-2">
					<Fish size={32} pose="blocked" />
					<Caption>You</Caption>
				</View>
				<View className="flex-row items-center gap-2">
					<Goose size={32} name="Sam" />
					<Caption>Sam</Caption>
				</View>
			</Row>
		</>
	),
};

/** The empty queue: the pair at 96, idle, with nothing to decide. */
export const EmptyQueuePair: Story = {
	render: () => (
		<View className="items-center gap-4 py-10">
			<View className="flex-row items-end gap-6">
				<Fish size={96} />
				<Goose size={96} />
			</View>
			<Display>
				Nothing to <Display.Strong>decide</Display.Strong>
			</Display>
			<Caption>Add the first one and Sam will see it.</Caption>
		</View>
	),
};

/** The result reveal: both marks hop as the decision lands. */
function CelebrateDemo() {
	// Remounting is the honest way to replay a mount animation: a new key
	// throws the old pair away, shared values and all.
	const [run, setRun] = React.useState(0);

	return (
		<View className="items-center gap-4">
			<View key={run} className="flex-row items-end gap-6">
				<Fish size={96} pose="celebrate" />
				<Goose size={96} pose="celebrate" />
			</View>
			<Chip label="Replay the hop" onPress={() => setRun((current) => current + 1)} selected />
			<Caption>run {run}</Caption>
		</View>
	);
}

export const Celebrate: Story = {
	render: () => <CelebrateDemo />,
};

/**
 * Proof that the marks are theme, not artwork: pick a pair and both redraw.
 * The swap goes through `PersonPairProvider`, which is the app's only writer
 * of the two colour channels — a story that set the CSS vars itself would be
 * testing a wiring the app does not have.
 */
function HuePickerDemo() {
	const [pair, setPair] = React.useState<PersonPairIds>({ a: "sage", b: "blush" });

	// The whole demo renders inside the provider, chips included, so one swap
	// moves both colour channels at once: the chips take their fill from the
	// `--person-*` custom properties and the characters take their stroke from
	// `usePersonColors`. Seeing them disagree is the failure this story is for.
	return (
		<PersonPairProvider a={pair.a} b={pair.b} className="gap-5">
			<View className="gap-2">
				<Caption>Person A</Caption>
				<View className="flex-row flex-wrap gap-2">
					{HUE_PRESETS.map((preset) => (
						<Chip
							key={preset.id}
							size="sm"
							label={preset.id}
							person="a"
							selected={pair.a === preset.id}
							onPress={() => setPair((current) => ({ ...current, a: preset.id }))}
						/>
					))}
				</View>
			</View>

			<View className="gap-2">
				<Caption>Person B</Caption>
				<View className="flex-row flex-wrap gap-2">
					{HUE_PRESETS.map((preset) => (
						<Chip
							key={preset.id}
							size="sm"
							label={preset.id}
							person="b"
							selected={pair.b === preset.id}
							onPress={() => setPair((current) => ({ ...current, b: preset.id }))}
						/>
					))}
				</View>
			</View>

			<View className="flex-row items-end gap-6 py-4">
				<Fish size={96} />
				<Goose size={96} />
				<Fish size={32} />
				<Goose size={32} />
			</View>
		</PersonPairProvider>
	);
}

export const HuePicker: Story = {
	render: () => <HuePickerDemo />,
};
