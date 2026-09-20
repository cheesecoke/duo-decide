import * as React from "react";
import { Pressable, TextInput, View } from "react-native";

import { Caption } from "@/components/ui/reusables/headline/headline";

import { IconButton } from "./card-header";
import { COPY } from "./decision-card.model";
import { PlusGlyph, TrashGlyph } from "./glyphs";

/**
 * The inline edit form — `Textarea` + `EditableOptionsList` from
 * FEATURE-INVENTORY §1.10a, rebuilt on the v2 fields.
 *
 * The title input is not here: it replaces the card's title in the header, so
 * it lives there and this block picks up from the description down. The
 * validation line is `EditableOptionsList`'s — shown while fewer than two
 * rows have text.
 *
 * There is no date field. A deadline is a calendar, calendars are the screen's
 * (PLAN-3 task 7), and inventing a picker here would have put a second one in
 * the app. `onSaveEdit`'s draft still carries the current deadline through
 * unchanged, so the contract holds.
 */

type EditBodyProps = {
	description: string;
	options: string[];
	onDescription: (value: string) => void;
	onOption: (index: number, value: string) => void;
	onRemoveOption: (index: number) => void;
	onAddOption: () => void;
};

function EditBody({
	description,
	options,
	onDescription,
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

			{options.map((option, index) => (
				// The rows are positional and reordered by typing, so the index
				// is the only identity they have.

				<View key={index} className="mt-2 flex-row items-center gap-2">
					<TextInput
						accessibilityLabel={`Option ${index + 1}`}
						value={option}
						onChangeText={(value) => onOption(index, value)}
						className="flex-1 rounded-field bg-surface-2 px-3 py-2.5 text-[15px] leading-[20px] text-ink"
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
