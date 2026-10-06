import * as React from "react";
import { View } from "react-native";

import {
	EditableOptions,
	type EditableOption,
} from "@/components/options/editable-options/editable-options";
import { Button } from "@/components/ui/reusables/button/button";
import { FieldLabel, Input, Textarea } from "@/components/ui/reusables/field/field";
import { Text } from "@/components/ui/reusables/text/text";

/**
 * The body of the "Create New List" sheet (FEATURE-INVENTORY §1.11, the
 * Create List drawer), on the `CreateDecisionForm` pattern.
 *
 * **Controlled**, for the same reason that one is: the Options screen owns
 * the draft and re-pushes this content into the drawer through
 * `updateContent` on every change, so anything held locally here would be
 * thrown away on the next keystroke.
 *
 * The sheet chrome — the title, the close button, the scrim — is
 * `BottomDrawer`'s. This is only what goes inside it.
 *
 * Note what `EditableOptions` hands back in `value.options`: the **filled**
 * rows — trimmed, blanks dropped — on a ~600 ms debounce while the user is
 * typing, again on ✓, and once more if the sheet closes with a write still
 * owed. So §1.11's "in-progress option rows are saved even if the user never
 * taps the check" still holds: a row typed into and left unconfirmed is on
 * the list that gets created. A row never typed into is not, and no longer
 * arrives here as an empty string for the screen to filter out (tweak T4 —
 * on the *card* those empty strings were being written to Supabase, which is
 * where the blank options in the "Movies · 4 options" screenshot came from).
 *
 * The screen's own `.filter(title.trim())` on submit is kept as a belt: the
 * draft may predate this component, and filtering an already-filtered list
 * costs nothing.
 */

interface CreateListFormValue {
	title: string;
	description: string;
	options: EditableOption[];
}

interface CreateListFormProps {
	value: CreateListFormValue;
	onChange: (next: CreateListFormValue) => void;
	onSubmit: () => void;
	onCancel: () => void;
	submitting?: boolean;
}

function CreateListForm({
	value,
	onChange,
	onSubmit,
	onCancel,
	submitting = false,
}: CreateListFormProps) {
	// §1.11: "Create List" is disabled until the title is non-empty. A title
	// of spaces is not a title.
	const submitDisabled = submitting || !value.title.trim();
	const submitLabel = submitting ? "Creating…" : "Create List";

	return (
		<View className="gap-4 pb-1">
			<View className="gap-1.5">
				<FieldLabel>Title</FieldLabel>
				<Input
					accessibilityLabel="Title"
					placeholder="Enter list title"
					value={value.title}
					onChangeText={(title) => onChange({ ...value, title })}
				/>
			</View>

			<View className="gap-1.5">
				<FieldLabel>Description</FieldLabel>
				{/* `min-h-20` is the old textarea's 80 px floor, kept. */}
				<Textarea
					accessibilityLabel="Description"
					className="min-h-20"
					placeholder="Enter list description"
					value={value.description}
					onChangeText={(description) => onChange({ ...value, description })}
				/>
			</View>

			<EditableOptions
				options={value.options}
				onOptionsUpdate={(options) => onChange({ ...value, options })}
				title="Options"
				emptyMessage="No options added yet. Tap the edit button to add some!"
			/>

			{/* The sheet's own footer: the one black element, then the way out. */}
			<View className="mt-1 gap-3 border-t border-line pt-3.5">
				<Button
					className="h-14 w-full rounded-button"
					accessibilityLabel={submitLabel}
					accessibilityState={{ disabled: submitDisabled }}
					disabled={submitDisabled}
					onPress={onSubmit}
				>
					<Text className="text-[16px] font-semibold leading-[22px] text-cta-fg">{submitLabel}</Text>
				</Button>

				<Button
					variant="secondary"
					className="h-14 w-full rounded-button"
					accessibilityLabel="Cancel"
					onPress={onCancel}
				>
					<Text className="text-[16px] font-semibold leading-[22px] text-ink-2">Cancel</Text>
				</Button>
			</View>
		</View>
	);
}

export { CreateListForm };
export type { CreateListFormProps, CreateListFormValue };
