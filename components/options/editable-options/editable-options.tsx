import * as React from "react";
import { TextInput, View } from "react-native";

import { IconAdd } from "@/assets/icons/IconAdd";
import { IconDone } from "@/assets/icons/IconDone";
import { IconEditNote } from "@/assets/icons/IconEditNote";
import { TrashGlyph } from "@/components/ui/reusables/card-menu/card-menu";
import { CircleButton } from "@/components/ui/reusables/circle-button/circle-button";
import { Input } from "@/components/ui/reusables/field/field";
import { Body, Caption } from "@/components/ui/reusables/headline/headline";
import { IconButton } from "@/components/ui/reusables/icon-button/icon-button";
import { NEUTRAL } from "@/theme/neutrals";

/**
 * EditableOptions — the view ⟷ edit repeater
 * (FEATURE-INVENTORY §1.11, `components/ui/EditableOptionsList.tsx`) on the
 * v2 primitives.
 *
 * One component, two callers: the body of an option-list card, and the
 * options block inside the Create New List sheet.
 *
 * ## The contract (tweak T4)
 *
 * **While editing, the draft in here is the only source of truth.** It is
 * seeded once, from `options`, when the pencil is pressed. An `options` prop
 * that changes underneath an open editor is *ignored* until the editor
 * closes — the same seed-once rule `decision-card.tsx` uses for its own
 * draft. On the card, `onOptionsUpdate` is a Supabase write whose realtime
 * echo comes back as a new `options` array with brand-new item ids (the
 * write is a delete-all + re-insert), so a prop-synced draft would be
 * rebuilt from under the caret on every save.
 *
 * **`onOptionsUpdate` is called with filled rows only** — titles trimmed,
 * blank rows dropped — and only:
 *
 *   1. on ✓, and
 *   2. ~600 ms after the last keystroke, add or remove while editing, and
 *   3. on unmount, if a debounced write is still owed.
 *
 * (2) and (3) are what keep §1.11's promise that in-progress rows survive a
 * user who never taps the check. What they no longer do is send the blanks:
 * the old version reported *every* keystroke *including* empty rows, and
 * since the card's `onOptionsUpdate` writes straight through to
 * `option_list_items`, a tapped + persisted an empty option — which is the
 * "4 options", two of them blank hairlines, in Chase's screenshot.
 *
 * **A write never leaves edit mode.** Only ✓ does.
 *
 * ## Typing a list
 *
 * The + circle appends a blank row and puts the caret in it. Enter inserts a
 * blank row directly *after* the row submitted and moves the caret there, so
 * a list can be typed straight through — the same three details
 * `decision-queue/decision-card/edit-body.tsx` documents:
 * `blurOnSubmit={false}` to keep the native keyboard up (and not
 * `submitBehavior`, which react-native-web 0.20 does not read),
 * `enterKeyHint` rather than `returnKeyType` because the latter warns on
 * web, and a `pendingFocus` effect because the row being focused is one the
 * *next* render creates. Enter on a blank last row does nothing, or holding
 * it would stack rows the save then drops.
 *
 * Every row carries its own trash button. Removing a row removes the row —
 * there is no hairline left behind, because the hairline belongs to the row.
 *
 * View mode renders filled options only. That is defensive rather than
 * cosmetic: blank items are already in the database from the old behaviour,
 * and a blank row in view mode is a naked hairline with nothing on it.
 *
 * The three circles are `CircleButton`s (34 px, `surface`, shadow.card); the
 * per-row trash is the 30 px `IconButton` the card headers use, which is the
 * size a control sitting inside a row wants.
 */

export interface EditableOption {
	id: string;
	title: string;
}

interface EditableOptionsProps {
	options: EditableOption[];
	/** Filled rows only — debounced while editing, and again on ✓. */
	onOptionsUpdate?: (options: EditableOption[]) => void;
	title?: string;
	emptyMessage?: string;
	showValidation?: boolean;
	minOptions?: number;
}

/**
 * How long after the last edit the draft is written. Long enough that a word
 * is one write rather than five, short enough that navigating away a moment
 * after typing still saves. Exported for the tests, which drive it.
 */
const COMMIT_DELAY = 600;

/** A blank row a user started and has not filled in yet is not an option. */
const filled = (options: EditableOption[]) =>
	options
		.map((option) => ({ ...option, title: option.title.trim() }))
		.filter((option) => option.title);

/**
 * One row, view or edit. The hairline is `line` — tokens.md §3 allows it for
 * dividers, which is what this is; the card around it still has no border.
 */
function OptionRow({ children }: { children: React.ReactNode }) {
	return (
		<View
			testID="option-row"
			className="flex-row items-center justify-between gap-2 border-b border-line py-2"
		>
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
	const [draft, setDraft] = React.useState<EditableOption[]>([]);

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

	/*
	 * The debounced write reads the draft and the callback out of refs: the
	 * timer that fires was scheduled several keystrokes ago, and the unmount
	 * flush runs after the last render there will ever be.
	 */
	const draftRef = React.useRef(draft);
	draftRef.current = draft;
	const updateRef = React.useRef(onOptionsUpdate);
	updateRef.current = onOptionsUpdate;

	const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
	/** True while a change has been made that has not reached the caller. */
	const owed = React.useRef(false);

	const writeNow = React.useCallback(() => {
		if (timer.current) {
			clearTimeout(timer.current);
			timer.current = null;
		}
		owed.current = false;
		updateRef.current?.(filled(draftRef.current));
	}, []);

	const scheduleWrite = React.useCallback(() => {
		owed.current = true;
		if (timer.current) clearTimeout(timer.current);
		timer.current = setTimeout(() => {
			timer.current = null;
			if (!owed.current) return;
			owed.current = false;
			updateRef.current?.(filled(draftRef.current));
		}, COMMIT_DELAY);
	}, []);

	// Flush, don't drop: a user who closes the sheet 200 ms after their last
	// keystroke still gets that keystroke saved.
	React.useEffect(
		() => () => {
			if (timer.current) {
				clearTimeout(timer.current);
				timer.current = null;
			}
			if (!owed.current) return;
			owed.current = false;
			updateRef.current?.(filled(draftRef.current));
		},
		[],
	);

	/** One entry per row index — focus is positional, so the index is its name. */
	const inputs = React.useRef<Record<number, TextInput | null>>({});
	const [pendingFocus, setPendingFocus] = React.useState<number | null>(null);

	React.useEffect(() => {
		if (pendingFocus === null) return;
		inputs.current[pendingFocus]?.focus();
		setPendingFocus(null);
		// `draft.length` is in here because the row being focused is one this
		// render created: without it the effect could run against the list as
		// it was before the insert.
	}, [pendingFocus, draft.length]);

	/**
	 * Seeded once, and from the *filled* rows: blanks already in the database
	 * from the old per-keystroke write are not rows anyone meant to keep, and
	 * offering them back would only let the user save them again.
	 *
	 * An empty list opens with one blank row rather than nothing: the add
	 * circle is right there, but a repeater with no rows in it reads as a
	 * repeater that failed to open.
	 */
	const startEditing = () => {
		const seed = filled(options);
		setDraft(seed.length === 0 ? [blankOption()] : seed);
		setIsEditing(true);
	};

	const finishEditing = () => {
		writeNow();
		setIsEditing(false);
	};

	const updateRow = (id: string, optionTitle: string) => {
		setDraft((prev) =>
			prev.map((option) => (option.id === id ? { ...option, title: optionTitle } : option)),
		);
		scheduleWrite();
	};

	/** Insert one blank row directly after `index`. `-1` puts it at the top. */
	const addAfter = (index: number) => {
		setDraft((prev) => {
			const next = [...prev];
			next.splice(index + 1, 0, blankOption());
			return next;
		});
		setPendingFocus(index + 1);
		scheduleWrite();
	};

	const removeRow = (index: number) => {
		setDraft((prev) => prev.filter((_, position) => position !== index));
		scheduleWrite();
	};

	const submitRow = (index: number) => {
		// A trailing blank is already there to type into — moving on from it
		// would only make a second one.
		if (index === draft.length - 1 && !draft[index].title.trim()) return;
		addAfter(index);
	};

	const visibleOptions = filled(options);
	const belowMinimum = filled(draft).length < minOptions;

	return (
		<View className="gap-3">
			<View className="flex-row items-center justify-between gap-2">
				{/* `Body` semibold, not `Title`: on the card this sits under the
				    list's own Title and must not compete with it. */}
				<Body className="font-semibold">{title}</Body>

				{isEditing ? (
					<View className="flex-row gap-2">
						<CircleButton label="Add option" onPress={() => addAfter(draft.length - 1)}>
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
					{draft.map((option, index) => (
						<OptionRow key={option.id}>
							<Input
								ref={(node) => {
									inputs.current[index] = node;
								}}
								accessibilityLabel={`Option ${index + 1}`}
								size="sm"
								className="flex-1"
								placeholder="Enter option"
								value={option.title}
								onChangeText={(text) => updateRow(option.id, text)}
								// `returnKeyType` warns on react-native-web; this is the
								// same hint by its web-safe name.
								enterKeyHint="next"
								blurOnSubmit={false}
								onSubmitEditing={() => submitRow(index)}
							/>
							<IconButton label={`Remove option ${index + 1}`} onPress={() => removeRow(index)}>
								<TrashGlyph />
							</IconButton>
						</OptionRow>
					))}

					{showValidation && belowMinimum ? (
						<Caption className="mt-2 text-center text-ink-3">Add at least {minOptions} options</Caption>
					) : null}
				</View>
			) : visibleOptions.length === 0 ? (
				<Caption className="py-4 text-center text-ink-3">{emptyMessage}</Caption>
			) : (
				<View>
					{visibleOptions.map((option) => (
						<OptionRow key={option.id}>
							<Body className="flex-1 text-ink">{option.title}</Body>
						</OptionRow>
					))}
				</View>
			)}
		</View>
	);
}

export { COMMIT_DELAY, EditableOptions, filled };
export type { EditableOptionsProps };
