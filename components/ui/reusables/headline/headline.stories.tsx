import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import {
	Body,
	Caption,
	Display,
	Eyebrow,
	Numeral,
	Title,
} from "@/components/ui/reusables/headline/headline";

/**
 * The type scale — tokens.md §5, §7 component 6.
 *
 * The move the scale is built around is the screen headline: 32 px at weight
 * 300 with exactly ONE phrase at 700, under a 13 px eyebrow. Everything else
 * (title, body, caption, numeral) exists to stay out of its way.
 */
const meta = {
	title: "Reusables/Headline",
	component: Display,
	decorators: [
		(Story) => (
			<View className="w-full max-w-md gap-2 self-center">
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof Display>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The queue headline: the pattern the whole scale is designed around. */
export const QueueHeadline: Story = {
	render: () => (
		<>
			<Eyebrow>Decision Queue</Eyebrow>
			<Display>
				What are we <Display.Strong>deciding today?</Display.Strong>
			</Display>
		</>
	),
};

/** Same pattern on the other screen, to check it survives a different phrase. */
export const HistoryHeadline: Story = {
	render: () => (
		<>
			<Eyebrow>History</Eyebrow>
			<Display>
				Here is <Display.Strong>everything you two</Display.Strong> settled.
			</Display>
		</>
	),
};

/** All six, with their tokens.md §5 specs, top to bottom. */
export const TypeScale: Story = {
	render: () => (
		<View className="gap-5">
			<View className="gap-1">
				<Caption>eyebrow · 13/16 · 500 · ink-2 · +0.2</Caption>
				<Eyebrow>Decision Queue</Eyebrow>
			</View>
			<View className="gap-1">
				<Caption>display · 32/38 · 300 (one phrase at 700)</Caption>
				<Display>
					What are we <Display.Strong>deciding today?</Display.Strong>
				</Display>
			</View>
			<View className="gap-1">
				<Caption>title · 20/26 · 600</Caption>
				<Title>Where are we eating?</Title>
			</View>
			<View className="gap-1">
				<Caption>body · 16/22 · 400</Caption>
				<Body>Both of you still have options to rank before Friday evening.</Body>
			</View>
			<View className="gap-1">
				<Caption>caption · 13/18 · 500 · ink-2</Caption>
				<Caption>Closes 7:00 pm · 3 options left</Caption>
			</View>
			<View className="gap-1">
				<Caption>numeral · 40/44 · 600 · tabular</Caption>
				<Numeral>42</Numeral>
			</View>
		</View>
	),
};

/**
 * Tabular figures, which is the whole point of `Numeral`: every row below is
 * the same width, so a count ticking 11 → 12 does not shuffle the layout.
 */
export const Numerals: Story = {
	render: () => (
		<>
			<Numeral>11</Numeral>
			<Numeral>18</Numeral>
			<Numeral>42</Numeral>
			<Numeral>07</Numeral>
		</>
	),
};

/** A Display with no bold phrase at all — still legal, just quieter. */
export const DisplayWithoutStrong: Story = {
	render: () => (
		<>
			<Eyebrow>Nothing waiting</Eyebrow>
			<Display>You two are all caught up.</Display>
		</>
	),
};

/** The scale on a tinted panel, to check `ink` and `ink-2` still hold up. */
export const OnTint: Story = {
	render: () => (
		<View className="gap-2 rounded-tile bg-person-a-tint p-5">
			<Eyebrow>Your picks</Eyebrow>
			<Display>
				Three left to <Display.Strong>rank</Display.Strong>
			</Display>
			<Body>Tap a card to move it up.</Body>
		</View>
	),
};
