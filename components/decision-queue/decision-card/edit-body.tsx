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
 *
 * ## The keystroke contract on an option row
 *
 * Enter adds the next row and puts the caret in it, so a list can be typed
 * without ever reaching for the + circle: "Tacos" ⏎ "Ramen" ⏎ … The new row
 * goes in directly *after* the one that was submitted rather than at the end,
 * because Enter halfway up a list means "and then this one", not "and also,
 * at the bottom".
 *
 * Three details make that work:
 *
 * - `blurOnSubmit={false}` — and not `submitBehavior="submit"`, which
 *   react-native-web 0.20 does not read — so the keyboard stays up on native
 *   between rows.
 * - Focus moves through `inputs`, a ref per row index, driven by a
 *   `pendingFocus` effect. The draft lives in the *parent*, so the new row
 *   does not exist yet when the handler runs; both state updates batch into
 *   one render and the effect focuses the row that render created.
 * - Enter on the last row while it is still empty does nothing. Otherwise
 *   holding Enter would stack blank rows, and every one of them is a row the
 *   save then silently drops.
 */

type EditBodyProps = {
	description: string;
	deadline: Date | null;
	options: string[];
	onDescription: (value: string) => void;
	onDeadline: (value: Date | null) => void;
	onOption: (index: number, value: string) => void;
	onRemoveOption: (index: number) => void;
	/**
	 * Insert one blank row directly after `afterIndex`. The + circle passes
	 * the last index, so it still appends; Enter passes its own row's. `-1`
	 * is the empty list, and puts the row at the top.
	 */
	onAddOption: (afterIndex: number) => void;
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
	/**
	 * One entry per row index — the rows are positional, so the index is the
	 * only identity they have here too.
	 */
	const inputs = React.useRef<Record<number, TextInput | null>>({});
	const [pendingFocus, setPendingFocus] = React.useState<number | null>(null);

	React.useEffect(() => {
		if (pendingFocus === null) return;
		inputs.current[pendingFocus]?.focus();
		setPendingFocus(null);
		// `options.length` is in here because the row being focused is one the
		// parent's re-render created: without it the effect could run against
		// the list as it was before the insert.
	}, [pendingFocus, options.length]);

	const addAfter = (index: number) => {
		onAddOption(index);
		setPendingFocus(index + 1);
	};

	const submitRow = (index: number) => {
		// A trailing blank is already there to type into — moving on from it
		// would only make a second one.
		if (index === options.length - 1 && !options[index].trim()) return;
		addAfter(index);
	};

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
						ref={(node) => {
							inputs.current[index] = node;
						}}
						accessibilityLabel={`Option ${index + 1}`}
						value={option}
						onChangeText={(value) => onOption(index, value)}
						returnKeyType="next"
						blurOnSubmit={false}
						onSubmitEditing={() => submitRow(index)}
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
				onPress={() => addAfter(options.length - 1)}
				className="mt-2.5 h-[30px] w-[30px] items-center justify-center rounded-chip bg-person-a-tint"
			>
				<PlusGlyph />
			</Pressable>
		</>
	);
}

export { EditBody };
export type { EditBodyProps };
