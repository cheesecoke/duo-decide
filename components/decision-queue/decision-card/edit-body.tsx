import * as React from "react";
import { Pressable, TextInput, View } from "react-native";

import {
	DatePickerComponent,
	dateToLocalDateString,
	parseLocalDateString,
} from "@/components/ui/DatePicker";
import { Caption } from "@/components/ui/reusables/headline/headline";
import { IconButton } from "@/components/ui/reusables/icon-button/icon-button";
import { cn } from "@/lib/utils";

import { COPY } from "./decision-card.model";
import { PencilGlyph, PlusGlyph, TrashGlyph } from "./glyphs";

/**
 * The inline edit form — `Textarea` + the deadline calendar +
 * `EditableOptionsList` from FEATURE-INVENTORY §1.10a, rebuilt on the v2
 * fields.
 *
 * The title input is not here: it replaces the card's title in the header, so
 * it lives there and this block picks up from the description down. The
 * validation line is `EditableOptionsList`'s — shown while fewer than two
 * rows have text.
 *
 * **The deadline row** is v1's, in v1's place: below the description and above
 * the option rows (DecisionCardHeader.tsx:159-166). It is the app's one
 * calendar — `DatePickerComponent`, the same component the create sheet opens
 * — and it brings its own `PersonVarsBoundary`, because it opens in its own
 * native `Modal`.
 *
 * The trigger is drawn here through `renderTrigger` rather than taken from the
 * picker, for the reason CreateDecisionForm does the same: the built-in field
 * has no accessible name, and every other row of this form is a labelled slab.
 * So this one is too — "Deadline" on the left, the date or the placeholder on
 * the right, `rounded-field bg-surface-2` like the description above it.
 *
 * The draft carries a `Date`, the picker speaks local `YYYY-MM-DD`, so the two
 * helpers translate. Local, not UTC, on purpose: `formatDeadline` in
 * card-header.tsx prints the same instant through `toLocaleDateString`, so the
 * day the field offers to edit is the day the collapsed card shows. A cleared
 * or never-set deadline is `null` all the way through, and
 * `toInlineEditPayload` turns that back into the column's `""` — v1's
 * "No deadline".
 */

type EditBodyProps = {
	description: string;
	deadline: Date | null;
	options: string[];
	onDescription: (value: string) => void;
	onDeadline: (value: Date | null) => void;
	onOption: (index: number, value: string) => void;
	onRemoveOption: (index: number) => void;
	onAddOption: () => void;
};

function EditBody({
	description,
	deadline,
	options,
	onDescription,
	onDeadline,
	onOption,
	onRemoveOption,
	onAddOption,
}: EditBodyProps) {
	return (
		<>
			<TextInput
				accessibilityLabel="Description"
				multiline
				value={description}
				onChangeText={onDescription}
				className="min-h-[76px] rounded-field bg-surface-2 px-3.5 py-2.5 text-[16px] leading-[22px] text-ink"
			/>

			<DatePickerComponent
				placeholder={COPY.deadlinePlaceholder}
				value={deadline ? dateToLocalDateString(deadline) : ""}
				onChange={(value) => onDeadline(value ? parseLocalDateString(value) : null)}
				renderTrigger={({ label, onPress }) => (
					<Pressable
						role="button"
						accessibilityLabel={COPY.deadlineLabel}
						onPress={onPress}
						className="mt-2 w-full flex-row items-center justify-between gap-2 rounded-field bg-surface-2 px-3.5 py-2.5"
					>
						<Caption className="text-ink-3">{COPY.deadlineLabel}</Caption>
						<View className="min-w-0 shrink flex-row items-center gap-1.5">
							<Caption className={cn("shrink", !deadline && "text-ink-3")}>{label}</Caption>
							<PencilGlyph size={14} />
						</View>
					</Pressable>
				)}
			/>

			{options.map((option, index) => (
				// The rows are positional and reordered by typing, so the index
				// is the only identity they have.

				<View key={index} className="mt-2 flex-row items-center gap-2">
					<TextInput
						accessibilityLabel={`Option ${index + 1}`}
						value={option}
						onChangeText={(value) => onOption(index, value)}
						className="flex-1 rounded-field bg-surface-2 px-3 py-2.5 text-row text-ink"
					/>
					<IconButton label={`Remove option ${index + 1}`} onPress={() => onRemoveOption(index)}>
						<TrashGlyph />
					</IconButton>
				</View>
			))}

			{options.filter((option) => option.trim()).length < 2 ? (
				<Caption className="mt-2.5">{COPY.validatePoll}</Caption>
			) : null}

			<Pressable
				role="button"
				accessibilityLabel="Add option"
				onPress={onAddOption}
				className="mt-2.5 h-[30px] w-[30px] items-center justify-center rounded-chip bg-person-a-tint"
			>
				<PlusGlyph />
			</Pressable>
		</>
	);
}

export { EditBody };
export type { EditBodyProps };
