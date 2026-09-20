import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { FieldLabel, Input, Textarea } from "@/components/ui/reusables/field/field";

/**
 * Field — the mock's `.inp`, `.ta` and `.flabel`
 * (design-refs/mocks/decision-queue-round-3.html:263-265, :331).
 *
 * A field is a borderless `surface-2` slab at `radius.field` (16). There is no
 * outline at rest; focus paints a 2 px `person-a-base` ring into a border that
 * was already there in transparent, so nothing shifts when you tab into it.
 *
 * What to look for: **click into a field.** The ring is the whole variant —
 * it is the one state these stories cannot pose with a prop.
 */
const meta = {
	title: "Reusables/Field",
	component: Input,
	decorators: [
		(Story) => (
			<View className="w-full max-w-[390px] gap-1 self-center">
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Placeholder: Story = {
	args: { placeholder: "What are we deciding?" },
};

export const WithValue: Story = {
	args: { value: "Where are we eating Friday?" },
};

/** `sm` is the option-row size: 15/20 in a tighter box (`.optrow .inp`). */
export const Sizes: Story = {
	render: () => (
		<>
			<FieldLabel>Medium — a form field</FieldLabel>
			<Input placeholder="What are we deciding?" />
			<View className="h-3" />
			<FieldLabel>Small — an option row</FieldLabel>
			<Input size="sm" value="Thai on Grand" />
		</>
	),
};

/** Not editable: half opacity, and it refuses the caret. */
export const Disabled: Story = {
	args: { value: "Where are we eating Friday?", editable: false },
};

export const TextareaDefault: Story = {
	name: "Textarea",
	render: () => (
		<>
			<FieldLabel>Description</FieldLabel>
			<Textarea placeholder="Anything the other person should know" />
		</>
	),
};

/** The create sheet's description field: 76 raised to 96 at the call site. */
export const TextareaTall: Story = {
	name: "Textarea — min-height 96",
	render: () => (
		<>
			<FieldLabel>Description</FieldLabel>
			<Textarea
				className="min-h-[96px]"
				value={"Somewhere we have not been,\nand somewhere we can walk to."}
			/>
		</>
	),
};

/** The label on its own: eyebrow scale (13/16, 500), uppercased, `ink-3`. */
export const Label: Story = {
	render: () => (
		<>
			<FieldLabel>Title</FieldLabel>
			<FieldLabel>Load from Option List</FieldLabel>
			<FieldLabel>Custom Options</FieldLabel>
		</>
	),
};

/** A whole labelled stack, the way the create sheet lays one out. */
export const InAForm: Story = {
	render: () => (
		<>
			<FieldLabel>Title</FieldLabel>
			<Input placeholder="What are we deciding?" />
			<View className="h-4" />
			<FieldLabel>Description</FieldLabel>
			<Textarea className="min-h-[96px]" placeholder="Anything the other person should know" />
		</>
	),
};
