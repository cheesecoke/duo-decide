import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { FieldLabel } from "@/components/ui/reusables/field/field";
import { Caption } from "@/components/ui/reusables/headline/headline";
import { TimeField } from "@/components/ui/reusables/time-field/time-field";

/**
 * TimeField — one text field that reads `7`, `730`, `7:30`, `19:30` and
 * `7pm`, plus an AM | PM toggle.
 *
 * What to look for:
 *
 * - **Empty**: type `7` and the toggle goes to PM; type `9` and it goes to
 *   AM (12 and 1 to 7 default to pm, 8 to 11 to am). Tap the toggle and it
 *   stays where you put it.
 * - **Type `19:30`**, then click away: the field rests as `7:30` with PM set.
 * - **Invalid**: the field's red ring and "Try a time like 7:30." underneath.
 *   It appears when the field is *left* holding something that is not a time,
 *   not while typing.
 *
 * The line under each field is the value the caller receives.
 */
function Demo({
	initial = null,
	showError,
	disabled,
}: {
	initial?: string | null;
	showError?: boolean;
	disabled?: boolean;
}) {
	const [value, setValue] = React.useState<string | null>(initial);
	return (
		<View className="gap-1.5">
			<FieldLabel>Starts</FieldLabel>
			<TimeField
				accessibilityLabel="Starts"
				value={value}
				onChange={setValue}
				showError={showError}
				disabled={disabled}
			/>
			<Caption className="text-ink-3">value: {value ?? "null"}</Caption>
		</View>
	);
}

const meta = {
	title: "Reusables/TimeField",
	component: Demo,
	decorators: [
		(Story) => (
			<View className="w-full max-w-[390px] self-center rounded-card bg-surface p-5">
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof Demo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Evening: Story = { args: { initial: "19:30" } };

export const Morning: Story = { args: { initial: "09:15" } };

/** Midnight and noon are the two that 12-hour clocks get wrong. */
export const Midnight: Story = { args: { initial: "00:00" } };

export const Noon: Story = { args: { initial: "12:00" } };

/** What a submit with the field still empty looks like. */
export const Invalid: Story = { args: { showError: true } };

export const Disabled: Story = { args: { initial: "19:30", disabled: true } };
