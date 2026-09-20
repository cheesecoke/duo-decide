import * as React from "react";
import { View } from "react-native";

import { IconAdd } from "@/assets/icons/IconAdd";
import { IconDone } from "@/assets/icons/IconDone";
import { IconEditNote } from "@/assets/icons/IconEditNote";
import { CircleButton } from "@/components/ui/reusables/circle-button/circle-button";
import { Input } from "@/components/ui/reusables/field/field";
import { Body, Caption } from "@/components/ui/reusables/headline/headline";
import { NEUTRAL } from "@/theme/neutrals";

/**
 * EditableOptions — the view ⟷ edit repeater
 * (FEATURE-INVENTORY §1.11, `components/ui/EditableOptionsList.tsx`) on the
 * v2 primitives.
 *
 * One component, two callers, exactly as before: the body of an option-list
 * card, and the options block inside the Create New List sheet. The props are
 * the old ones, so neither caller had to change shape.
 *
 * **The keystroke contract is the load-bearing part.** Every change and every
 * added row calls `onOptionsUpdate(next)` with the *in-progress* rows, blanks
 * included — not just the confirmed set on ✓. That is what makes the sheet's
 * "in-progress option rows are saved even if the user never taps the check"
 * bullet true (§1.11, Create List drawer), and it is kept deliberately.
 *
 * It costs something on the card: there, `onOptionsUpdate` is a Supabase
 * write through `updateList`, so a typed option is one round trip per
 * character. That is today's behaviour and it is out of scope here — it is
 * written down in the task report as a finding rather than fixed under cover
 * of a re-skin.
 *
 * The three circles are `CircleButton`s (34 px, `surface`, shadow.card),
 * which is the one control the design system uses for a bare icon. They are
 * the only labelled things in here besides the fields, because a row of text
 * is a row of text.
 */

export interface EditableOption {
	id: string;
	title: string;
}

interface EditableOptionsProps {
	options: EditableOption[];
	/** Called on every keystroke and every add — see the docblock. */
	onOptionsUpdate?: (options: EditableOption[]) => void;
	title?: string;
	emptyMessage?: string;
	showValidation?: boolean;
	minOptions?: number;
}

/** A blank row a user started and has not filled in yet is not an option. */
const filled = (options: EditableOption[]) => options.filter((option) => option.title.trim());

/**
 * One row, view or edit. The hairline is `line` — tokens.md §3 allows it for
 * dividers, which is what this is; the card around it still has no border.
 */
function OptionRow({ children }: { children: React.ReactNode }) {
	return (
		<View className="flex-row items-center justify-between border-b border-line py-2">
			{children}
		</View>
	);
}

function EditableOptions({
	options,
	onOptionsUpdate,
	title = "Options",
	emptyMessage = "No options added yet. Tap the edit button to add some!",
	showValidation = false,
	minOptions = 2,
}: EditableOptionsProps) {
	const [isEditing, setIsEditing] = React.useState(false);
	const [editingOptions, setEditingOptions] = React.useState<EditableOption[]>([]);

	/**
	 * `temp-` ids are the old ones: the provider mints real ids on write. The
	 * counter is `CreateDecisionForm`'s `mintId` — `Date.now()` alone repeats
	 * inside one millisecond, and two rows added in the same tick would then
	 * share a React key, which makes them the same row as far as React is
	 * concerned: type into one and the other takes the text.
	 */
	const nextId = React.useRef(0);
	const blankOption = (): EditableOption => ({
		id: `temp-${Date.now()}-${nextId.current++}`,
		title: "",
	});

	/**
	 * An empty list opens with one blank row rather than nothing: the add
	 * circle is right there, but a repeater with no rows in it reads as a
	 * repeater that failed to open.
	 */
	const startEditing = () => {
		setEditingOptions(options.length === 0 ? [blankOption()] : [...options]);
		setIsEditing(true);
	};

	const finishEditing = () => {
		onOptionsUpdate?.(filled(editingOptions));
		setIsEditing(false);
	};

	const updateEditingOption = (id: string, optionTitle: string) => {
		setEditingOptions((prev) => {
			const next = prev.map((option) =>
				option.id === id ? { ...option, title: optionTitle } : option,
			);
			onOptionsUpdate?.(next);
			return next;
		});
	};

	const addNewEditingOption = () => {
		setEditingOptions((prev) => {
			const next = [...prev, blankOption()];
			onOptionsUpdate?.(next);
			return next;
		});
	};

	const belowMinimum = filled(editingOptions).length < minOptions;

	return (
		<View className="gap-3">
			<View className="flex-row items-center justify-between gap-2">
				{/* `Body` semibold, not `Title`: on the card this sits under the
				    list's own Title and must not compete with it. */}
				<Body className="font-semibold">{title}</Body>

				{isEditing ? (
					<View className="flex-row gap-2">
						<CircleButton label="Add option" onPress={addNewEditingOption}>
							<IconAdd size={16} color={NEUTRAL.ink2} />
						</CircleButton>
						<CircleButton label="Done editing" onPress={finishEditing}>
							<IconDone size={16} color={NEUTRAL.ink} />
						</CircleButton>
					</View>
				) : (
					<CircleButton label="Edit options" onPress={startEditing}>
						<IconEditNote size={16} color={NEUTRAL.ink2} />
					</CircleButton>
				)}
			</View>

			{isEditing ? (
				<View>
					{editingOptions.map((option, index) => (
						<OptionRow key={option.id}>
							<Input
								accessibilityLabel={`Option ${index + 1}`}
								size="sm"
								className="flex-1"
								placeholder="Enter option"
								value={option.title}
								onChangeText={(text) => updateEditingOption(option.id, text)}
							/>
						</OptionRow>
					))}

					{showValidation && belowMinimum ? (
						<Caption className="mt-2 text-center text-ink-3">Add at least {minOptions} options</Caption>
					) : null}
				</View>
			) : options.length === 0 ? (
				<Caption className="py-4 text-center text-ink-3">{emptyMessage}</Caption>
			) : (
				<View>
					{options.map((option) => (
						<OptionRow key={option.id}>
							<Body className="flex-1 text-ink">{option.title}</Body>
						</OptionRow>
					))}
				</View>
			)}
		</View>
	);
}

export { EditableOptions };
export type { EditableOptionsProps };
