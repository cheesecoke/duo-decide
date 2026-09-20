import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import {
	CreateDecisionForm,
	type CreateDecisionFormData,
} from "@/components/decision-queue/CreateDecisionForm";
import type { OptionListWithItems } from "@/types/database";

/**
 * CreateDecisionForm — FEATURE-INVENTORY §1.10b, the mock's `createSheet()`
 * (design-refs/mocks/decision-queue-round-3.html:822).
 *
 * The sheet's own chrome — the 32 px top corners, the title row, the scrim —
 * belongs to `BottomDrawer` and is not here; these stories draw the white
 * sheet body at phone width so the form is seen at the size it ships at.
 *
 * What to look for:
 *
 * - **Every field is the same slab.** `surface-2` at `radius.field`, no
 *   borders. Click into one: the focus ring is `person-a-base`, and nothing
 *   below it moves when it appears.
 * - **One black element** (tokens.md §10) — the submit button. Cancel is a
 *   grey pill; the add-option pill is person A's tint.
 * - **The Custom Options block has three faces** and `CustomEditing` /
 *   `CustomView` / the default story are the three.
 *
 * The deadline is still `DatePickerComponent` (§1.10b keeps it,
 * `transparentOverlay` and all) but its trigger is now the sheet's own — the
 * mock's `.datefield`, the same `surface-2` slab as every other field with
 * the calendar mark on the right. Press it and the picker's calendar opens
 * over the sheet, on the same tokens as the rest of the sheet.
 */

const EMPTY_FORM: CreateDecisionFormData = {
	title: "",
	description: "",
	dueDate: "",
	decisionType: "vote",
	selectedOptionListId: "",
	selectedOptions: [],
	customOptions: [],
};

function optionList(id: string, title: string, items: string[]): OptionListWithItems {
	return {
		id,
		title,
		description: "",
		couple_id: "couple-1",
		creator_id: "user-1",
		created_at: "2026-09-01T00:00:00Z",
		updated_at: "2026-09-01T00:00:00Z",
		items: items.map((itemTitle, index) => ({
			id: `${id}-i${index}`,
			option_list_id: id,
			title: itemTitle,
			created_at: "2026-09-01T00:00:00Z",
		})),
	};
}

const LISTS = [
	optionList("l1", "Dinner ideas", ["Thai on Grand", "Tacos at home", "Pizza + a movie", "Ramen"]),
	optionList("l2", "Date nights", ["Mini golf", "That new bar", "Stay in"]),
];

const FILLED: Partial<CreateDecisionFormData> = {
	title: "Where are we eating Friday?",
	description: "Somewhere we have not been, and somewhere we can walk to.",
	dueDate: "2026-09-25",
};

/**
 * The screen, played by a story: `formData` lives out here and comes back in
 * on every change, exactly as `index.tsx` does it. Without this the form
 * would be frozen and none of the sub-states would be reachable by clicking.
 */
function Live({
	initial,
	optionLists = LISTS,
	isEditing = false,
	isSubmitting = false,
}: {
	initial?: Partial<CreateDecisionFormData>;
	optionLists?: OptionListWithItems[];
	isEditing?: boolean;
	isSubmitting?: boolean;
}) {
	const [formData, setFormData] = React.useState<CreateDecisionFormData>({
		...EMPTY_FORM,
		...initial,
	});

	return (
		// The sheet body: white, 20 px gutters, phone width.
		<View className="w-full max-w-[390px] self-center rounded-card bg-surface px-5 py-4">
			<CreateDecisionForm
				formData={formData}
				onFormDataChange={setFormData}
				onSubmit={() => {}}
				onCancel={() => {}}
				isEditing={isEditing}
				isSubmitting={isSubmitting}
				optionLists={optionLists}
			/>
		</View>
	);
}

const meta = {
	title: "Decision Queue/CreateDecisionForm",
	component: Live,
} satisfies Meta<typeof Live>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A blank sheet: no title (so submit is off), no list, no custom options. */
export const Empty: Story = {
	args: {},
};

/** Filled in far enough to submit. */
export const Filled: Story = {
	args: { initial: FILLED },
};

/** §1.10b's empty variant, in those words: "No option lists available". */
export const NoOptionLists: Story = {
	args: { initial: FILLED, optionLists: [] },
};

/**
 * A list picked: its options arrive as chips, and they are a **multi-select**
 * — press two and both stay filled.
 */
export const ListPicked: Story = {
	args: {
		initial: {
			...FILLED,
			selectedOptionListId: "l1",
			selectedOptions: [
				{ id: "l1-i0", title: "Thai on Grand", selected: true },
				{ id: "l1-i1", title: "Tacos at home", selected: true },
				{ id: "l1-i2", title: "Pizza + a movie", selected: false },
				{ id: "l1-i3", title: "Ramen", selected: false },
			],
		},
	},
};

/** Poll rather than vote — the thumb slides to the second segment. */
export const PollType: Story = {
	args: { initial: { ...FILLED, decisionType: "poll" } },
};

/**
 * Custom options, committed: read-only rows and a pencil. Press the pencil
 * for the third face — a field and a trash per row, cancel/confirm in the
 * header, and the add pill underneath.
 */
export const CustomView: Story = {
	args: {
		initial: {
			...FILLED,
			customOptions: [
				{ id: "c1", title: "Thai on Grand", selected: false },
				{ id: "c2", title: "Tacos at home", selected: false },
			],
		},
	},
};

/**
 * The same block, in edit mode from the first frame — what the empty pill
 * drops you into.
 */
export const CustomEditing: Story = {
	args: {
		initial: {
			...FILLED,
			customOptions: [
				{ id: "c1", title: "Thai on Grand", selected: false },
				{ id: "c2", title: "Tacos at home", selected: false },
			],
		},
	},
	play: async ({ canvasElement }) => {
		// Throw rather than fall through: a missed selector would otherwise render
		// the committed-view face under this story's name.
		const pencil = canvasElement.querySelector('[aria-label="Edit options"]');
		if (!pencil) throw new Error("CustomEditing: 'Edit options' button not found");
		(pencil as HTMLElement).click();
	},
};

/** `isEditing` changes one thing: the submit label. */
export const EditingDecision: Story = {
	args: { initial: FILLED, isEditing: true },
};

/** In flight: "Creating…", and the button refuses a second press. */
export const Submitting: Story = {
	args: { initial: FILLED, isSubmitting: true },
};
