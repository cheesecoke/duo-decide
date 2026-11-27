import * as React from "react";
import { Pressable, TextInput, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

import { IconButton } from "@/components/ui/reusables/icon-button/icon-button";
import {
	CheckGlyph,
	CloseGlyph,
	PencilGlyph,
	PlusGlyph,
	TrashGlyph,
} from "@/components/decision-queue/decision-card/glyphs";
import { DatePickerComponent } from "@/components/ui/DatePicker";
import { Button } from "@/components/ui/reusables/button/button";
import { Chip } from "@/components/ui/reusables/chip/chip";
import { FieldLabel, Input, Textarea } from "@/components/ui/reusables/field/field";
import { Body, Caption } from "@/components/ui/reusables/headline/headline";
import { SegmentedToggle } from "@/components/ui/reusables/segmented-toggle/segmented-toggle";
import { Text, WRAP_ANYWHERE } from "@/components/ui/reusables/text/text";
import type { DecisionOption } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { NEUTRAL } from "@/theme/neutrals";
import { usePersonColors } from "@/theme/usePersonColors";
import type { OptionListWithItems } from "@/types/database";
import { deviceTimeZone } from "@/lib/calendar-link";
import { optionShortfall } from "@/lib/decision-rules";
import { suggestWhen, type SuggestedWhen } from "@/lib/suggest-when";

import {
	CUSTOM_OPTIONS_INITIAL,
	customOptionsReducer,
	type CustomOptionsAction,
} from "./custom-options.reducer";

/**
 * The Create / Edit Decision sheet (FEATURE-INVENTORY §1.10b), rebuilt on the
 * v2 primitives — the mock's `createSheet()`
 * (design-refs/mocks/decision-queue-round-3.html:822).
 *
 * It is **controlled**: the queue screen owns `formData` and re-renders the
 * drawer's content on every change (`index.tsx`, `updateContent`). So every
 * field here reports upward and nothing but the Custom Options sub-state
 * lives locally. `CreateDecisionFormData` and the props are unchanged, which
 * is what lets `index.tsx` and `useDecisionManagement` stay as they are.
 *
 * The sheet chrome stays `BottomDrawer`'s. This is only what goes inside —
 * including the sheet's own `.sheet-ft` footer, until every sheet moves into
 * the drawer's footer slot at once.
 *
 * `DatePickerComponent` is kept as §1.10b requires, `transparentOverlay` and
 * all; only its trigger is ours now (`renderTrigger`), so the deadline reads
 * as the mock's `.datefield` while the calendar overlay is untouched.
 *
 * **Two dates, kept apart.** "Decide by" is the deadline. *When the thing
 * happens* has no field of its own: the form reads the title and description
 * (`lib/suggest-when.ts`) and, when they name a day, offers one chip under
 * the title — "Sat, Dec 12 · happening then?". A tap confirms it, and only a
 * confirmed chip is stored (`eventOn` / `eventTime` / `eventTz`). No date
 * typed, no chip, no space held for one (next-actions.md §4).
 */

export interface CreateDecisionFormData {
	title: string;
	description: string;
	dueDate: string;
	decisionType: "poll" | "vote";
	selectedOptionListId: string;
	selectedOptions: DecisionOption[];
	customOptions: DecisionOption[];
	/**
	 * When the thing happens, once the creator has confirmed the chip — the
	 * same three fields as `DecisionEventWhen` (lib/database.ts). Absent until
	 * then; `null` after a confirmation is taken back, which on an edit clears
	 * the stored date. An unconfirmed chip stores nothing.
	 */
	/** The day, `YYYY-MM-DD`. */
	eventOn?: string | null;
	/** Wall-clock start, `HH:mm`. `null` = all day. */
	eventTime?: string | null;
	/** IANA zone of the device that confirmed it. `null` = unknown. */
	eventTz?: string | null;
}

interface Props {
	formData: CreateDecisionFormData;
	onFormDataChange: (data: CreateDecisionFormData) => void;
	onSubmit: () => void;
	onCancel: () => void;
	isEditing: boolean;
	isSubmitting: boolean;
	optionLists: OptionListWithItems[];
	/**
	 * The date reader. Injectable because the real one loads chrono through a
	 * CJS path that Storybook's vite build may not resolve (it then finds
	 * nothing, silently) — stories and tests pass a stub.
	 */
	suggest?: typeof suggestWhen;
}

/** How long the typing has to rest before the text is read for a date. */
const WHEN_DEBOUNCE_MS = 300;

const NO_EVENT = { eventOn: null, eventTime: null, eventTz: null } as const;

type When = Pick<SuggestedWhen, "date" | "time">;

const sameWhen = (a: When | null, b: When | null) => a?.date === b?.date && a?.time === b?.time;

const pad = (n: number) => String(n).padStart(2, "0");

/** Today as `YYYY-MM-DD`, in the phone's zone (never through UTC). */
const localDay = (now: Date) =>
	`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

/**
 * Read a day out of what has been typed. `null` for nothing found, for a day
 * that has already gone, and for a reader that throws: a chip is an offer,
 * and nothing about it may break the form.
 */
function readWhen(suggest: typeof suggestWhen, title: string, description: string) {
	if (!title.trim() && !description.trim()) return null;
	try {
		const now = new Date();
		const found = suggest({ title, description }, now);
		return found && found.date >= localDay(now) ? found : null;
	} catch {
		return null;
	}
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * "Sat, Dec 12", "Sat, Dec 12 · 7:30 pm" — and the year only when it is not
 * this one, which is when it is news ("Nov 2" typed in late November).
 * Spelled out rather than `toLocaleDateString`: one wording on web, Hermes
 * and jest. `null` when the stored value is not a date.
 */
function whenLabel({ date, time }: When): string | null {
	const [year, month, day] = date.split("-").map(Number);
	const local = new Date(year, month - 1, day);
	if (Number.isNaN(local.getTime()) || local.getMonth() !== month - 1) return null;

	let label = `${WEEKDAYS[local.getDay()]}, ${MONTHS[month - 1]} ${day}`;
	if (year !== new Date().getFullYear()) label += `, ${year}`;

	const [hour, minute] = (time ?? "").split(":").map(Number);
	if (time && Number.isFinite(hour) && Number.isFinite(minute)) {
		label += ` · ${hour % 12 || 12}:${pad(minute)} ${hour < 12 ? "am" : "pm"}`;
	}
	return label;
}

/** The mock orders the segments Vote | Poll (`createSheet()`, :829-831). */
const DECISION_TYPES = [
	{ value: "vote", label: "Vote" },
	{ value: "poll", label: "Poll" },
] as const;

/** The opt-out row under the couple's lists (`createSheet()`, :835). */
const NO_LIST_ROW = "No list — type my own";

/**
 * `.listpick button` — a `surface-2` slab that fills with person A's tint when
 * it is the picked one. A radio rather than a checkbox: exactly one row is on,
 * and the opt-out row is one of the choices rather than a way of clearing them.
 */
function ListPickRow({
	title,
	meta,
	selected,
	onPress,
}: {
	title: string;
	meta?: string;
	selected: boolean;
	onPress: () => void;
}) {
	return (
		<Pressable
			role="radio"
			accessibilityLabel={title}
			accessibilityState={{ checked: selected }}
			onPress={onPress}
			className={cn(
				"flex-row items-center justify-between gap-2 rounded-field bg-surface-2 px-3.5 py-3",
				selected && "bg-person-a-tint",
			)}
		>
			{/* The title gives way to the count, never the other way round:
			    it shrinks and wraps (mid-token on web, for a pasted link) while
			    "12 options" keeps its one line. */}
			<Text
				className={cn(
					"min-w-0 shrink text-row font-medium text-ink",
					WRAP_ANYWHERE,
					selected && "font-semibold text-person-a-deep",
				)}
			>
				{title}
			</Text>
			{meta ? (
				<Text
					className={cn("shrink-0 text-row font-medium text-ink-2", selected && "text-person-a-deep")}
				>
					{meta}
				</Text>
			) : null}
		</Pressable>
	);
}

/**
 * `.addopt` — the one tinted pill in the sheet. It is not a `Button`: every
 * Button variant is a full-height control and this is a 13/600 tag that sits
 * under the rows it adds to.
 */
function AddOptionPill({ onPress }: { onPress: () => void }) {
	const person = usePersonColors();

	return (
		<Pressable
			role="button"
			accessibilityLabel="Add Custom Option"
			onPress={onPress}
			className="mt-1 flex-row items-center gap-1.5 self-start rounded-chip bg-person-a-tint px-3.5 py-2"
		>
			<PlusGlyph size={14} color={person.a.deep} />
			<Text className="text-[13px] font-semibold leading-[18px] text-person-a-deep">
				Add Custom Option
			</Text>
		</Pressable>
	);
}

/** The mock's calendar mark on `.datefield`. Decorative — the row is labelled. */
function CalendarGlyph({ size = 18, color = NEUTRAL.ink2 }: { size?: number; color?: string }) {
	return (
		<Svg testID="glyph-calendar" width={size} height={size} viewBox="0 0 24 24" fill="none">
			<Rect x={3.5} y={5} width={17} height={15} rx={3} stroke={color} strokeWidth={2} fill="none" />
			{["M8 3.5v3", "M16 3.5v3", "M3.5 10h17"].map((d) => (
				<Path key={d} d={d} stroke={color} strokeWidth={2} strokeLinecap="round" fill="none" />
			))}
		</Svg>
	);
}

export function CreateDecisionForm({
	formData,
	onFormDataChange,
	onSubmit,
	onCancel,
	isEditing,
	isSubmitting,
	optionLists,
	suggest = suggestWhen,
}: Props) {
	const { title, description } = formData;

	// What the text says right now. Read once on mount (an edit opens with its
	// text already there), then again whenever the typing rests.
	const [found, setFound] = React.useState<SuggestedWhen | null>(() =>
		readWhen(suggest, title, description),
	);

	React.useEffect(() => {
		const read = () => {
			const next = readWhen(suggest, title, description);
			setFound((prev) => (sameWhen(prev, next) ? prev : next));
		};
		// Emptied (or reset by the screen): nothing to wait for.
		if (!title.trim() && !description.trim()) return read();
		const timer = setTimeout(read, WHEN_DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [suggest, title, description]);

	/**
	 * A title or description edit. While a date is confirmed the new text is
	 * read at once, not after the pause: if it now says another day (or none),
	 * the confirmation goes in the same change that carries the text, so a
	 * stale date can never be submitted inside the debounce window.
	 */
	const changeText = (patch: { title: string } | { description: string }) => {
		const next = { ...formData, ...patch };
		if (!formData.eventOn) return onFormDataChange(next);

		const now = readWhen(suggest, next.title, next.description);
		if (sameWhen(now, found)) return onFormDataChange(next);
		setFound(now);
		onFormDataChange({ ...next, ...NO_EVENT });
	};

	const toggleWhen = () => {
		if (formData.eventOn) return onFormDataChange({ ...formData, ...NO_EVENT });

		// Read again: the chip on screen may be up to one pause behind the text.
		const now = readWhen(suggest, title, description);
		setFound(now);
		if (!now) return;
		onFormDataChange({
			...formData,
			eventOn: now.date,
			eventTime: now.time,
			eventTz: deviceTimeZone(),
		});
	};

	const confirmed = Boolean(formData.eventOn);
	// Confirmed, the chip shows what is stored; otherwise, what the text says.
	const when: When | null = formData.eventOn
		? { date: formData.eventOn, time: formData.eventTime ?? null }
		: found;
	const whenText = when ? whenLabel(when) : null;

	const [customOptions, setCustomOptions] = React.useState(CUSTOM_OPTIONS_INITIAL);

	// `Date.now()` alone repeats inside one millisecond, and two rows added in
	// the same frame would then share a React key. The counter is the tiebreak.
	const nextId = React.useRef(0);
	const mintId = () => `temp-${Date.now()}-${nextId.current++}`;

	/**
	 * Run one custom-options transition: keep the new sub-state, and write the
	 * rows back to `formData` if this was one of the transitions that commits
	 * (see custom-options.reducer.ts).
	 */
	const runCustomOptions = (action: CustomOptionsAction) => {
		const next = customOptionsReducer(customOptions, action);
		setCustomOptions(next);
		if (next.committed !== null) {
			onFormDataChange({ ...formData, customOptions: next.committed });
		}
	};

	/**
	 * The keystroke contract on a custom-option row, the same one the decision
	 * card's inline editor has (edit-body.tsx): Enter opens the next row and
	 * puts the caret in it, so the block is typed rather than clicked together.
	 *
	 * The rows are keyed by id here, so the focus refs are too — and the id of
	 * the row about to be created is minted right here, which is what lets the
	 * effect know which row to focus once the reducer has run.
	 */
	const inputs = React.useRef<Record<string, TextInput | null>>({});
	const [pendingFocus, setPendingFocus] = React.useState<string | null>(null);

	React.useEffect(() => {
		if (pendingFocus === null) return;
		inputs.current[pendingFocus]?.focus();
		setPendingFocus(null);
	}, [pendingFocus]);

	const submitCustomOption = (index: number) => {
		// A trailing blank is already there to type into — moving on from it
		// would only make a second one, and every blank is a row `confirm`
		// then silently drops.
		const row = customOptions.draft[index];
		if (index === customOptions.draft.length - 1 && !row.title.trim()) return;

		const id = mintId();
		runCustomOptions({ type: "insertAfter", index, id });
		setPendingFocus(id);
	};

	const addCustomOption = () => {
		const id = mintId();
		runCustomOptions({ type: "add", id });
		setPendingFocus(id);
	};

	const selectOptionList = (listId: string) => {
		const list = optionLists.find((candidate) => candidate.id === listId);
		onFormDataChange({
			...formData,
			selectedOptionListId: listId,
			// A freshly loaded list starts with nothing picked — §1.10b.
			selectedOptions: list ? list.items.map((item) => ({ ...item, selected: false })) : [],
		});
	};

	const toggleOption = (optionId: string) => {
		onFormDataChange({
			...formData,
			selectedOptions: formData.selectedOptions.map((option) =>
				option.id === optionId ? { ...option, selected: !option.selected } : option,
			),
		});
	};

	const selectedList = optionLists.find((list) => list.id === formData.selectedOptionListId);
	const editingOptions = customOptions.mode === "editing";
	// What will actually be saved: the picked list options plus the filled
	// custom rows (useDecisionManagement combines them the same way).
	const optionCount =
		formData.selectedOptions.filter((option) => option.selected).length +
		formData.customOptions.filter((option) => option.title.trim()).length;
	const optionsMessage = optionShortfall(formData.decisionType, optionCount);
	const submitDisabled = isSubmitting || !formData.title.trim() || optionsMessage !== null;
	const submitLabel = isSubmitting ? "Creating…" : isEditing ? "Update Decision" : "Create Decision";

	return (
		<View className="gap-4 pb-1">
			<View className="gap-1.5">
				<FieldLabel>Title</FieldLabel>
				<Input
					accessibilityLabel="Title"
					placeholder="What are we deciding?"
					value={formData.title}
					onChangeText={(text) => changeText({ title: text })}
				/>
			</View>

			{/* The event-date chip. A sibling of the title block rather than its
			    last child, so its hitSlop is not clipped by that block's bounds
			    on iOS; `-mt-2.5` takes the form's gap-4 back down to the 6 px a
			    field keeps from its label. The small chip is under 44 pt, hence
			    the slop. */}
			{whenText ? (
				<Chip
					testID="event-date-chip"
					size="sm"
					className="-mt-2.5 self-start"
					hitSlop={{ top: 8, bottom: 8 }}
					label={confirmed ? `Happening ${whenText}` : `${whenText} · happening then?`}
					selected={confirmed}
					accessibilityState={{ checked: confirmed, selected: confirmed }}
					onPress={toggleWhen}
				/>
			) : null}

			<View className="gap-1.5">
				<FieldLabel>Description</FieldLabel>
				{/* §1.10b: the description is the one field with a floor on its
				    height — 96, rather than the mock's 76 for a bare `.ta`. */}
				<Textarea
					accessibilityLabel="Description"
					className="min-h-[96px]"
					placeholder="Anything the other person should know"
					value={formData.description}
					onChangeText={(text) => changeText({ description: text })}
				/>
			</View>

			<View className="gap-1.5">
				{/* "Decide by", not "Due date": this is the deadline for deciding,
				    and must not read as the day the thing happens. */}
				<FieldLabel>Decide by</FieldLabel>
				{/* `transparentOverlay`: the picker opens its own Modal, and
				    without this it lays a second dark scrim over the drawer. */}
				<DatePickerComponent
					value={formData.dueDate}
					onChange={(dueDate) => onFormDataChange({ ...formData, dueDate })}
					placeholder="Select decision deadline"
					transparentOverlay
					renderTrigger={({ label, onPress, disabled }) => (
						// `.datefield` — the same slab as `.inp`, with the mark on
						// the right. It is a button, not a field: it opens the
						// calendar and nothing is ever typed into it.
						<Pressable
							role="button"
							accessibilityLabel="Decide by"
							accessibilityState={{ disabled: Boolean(disabled) }}
							disabled={disabled}
							onPress={onPress}
							className="w-full flex-row items-center justify-between gap-2 rounded-field bg-surface-2 px-3.5 py-2.5"
						>
							<Body className={cn("shrink", !formData.dueDate && "text-ink-3")}>{label}</Body>
							<CalendarGlyph />
						</Pressable>
					)}
				/>
			</View>

			<View className="gap-1.5">
				<FieldLabel>Type</FieldLabel>
				<SegmentedToggle
					accessibilityLabel="Decision type"
					options={DECISION_TYPES.map((type) => ({ ...type }))}
					value={formData.decisionType}
					onChange={(decisionType) =>
						onFormDataChange({ ...formData, decisionType: decisionType as "poll" | "vote" })
					}
				/>
			</View>

			<View className="gap-1.5">
				<FieldLabel>Load from Option List</FieldLabel>
				{optionLists.length === 0 ? (
					// `.muted-note` — 13/18 in ink-3.
					<Caption className="py-2.5 text-ink-3">No option lists available</Caption>
				) : (
					<View role="radiogroup" accessibilityLabel="Load from Option List" className="gap-1.5">
						{optionLists.map((list) => (
							<ListPickRow
								key={list.id}
								title={list.title}
								meta={`${list.items.length} options`}
								selected={formData.selectedOptionListId === list.id}
								onPress={() => selectOptionList(list.id)}
							/>
						))}
						{/* No list picked *is* "type my own", so the row reads the
						    same state rather than carrying one of its own. */}
						<ListPickRow
							title={NO_LIST_ROW}
							selected={formData.selectedOptionListId === ""}
							onPress={() => selectOptionList("")}
						/>
					</View>
				)}
			</View>

			{selectedList ? (
				<View className="gap-1.5">
					<FieldLabel>{`Select Options from ${selectedList.title}`}</FieldLabel>
					{/* A multi-select, not a radio group: §1.10b says each press
					    toggles that one option, and everything picked goes on the
					    decision (useDecisionManagement.ts:27-34). `Chip`'s
					    checkbox role says exactly that. */}
					<View className="flex-row flex-wrap gap-2">
						{formData.selectedOptions.map((option) => (
							<Chip
								key={option.id}
								label={option.title}
								selected={option.selected}
								onPress={() => toggleOption(option.id)}
							/>
						))}
					</View>
				</View>
			) : null}

			<View className="gap-1.5">
				<View className="h-[30px] flex-row items-center justify-between">
					<FieldLabel>Custom Options</FieldLabel>
					{/* Nothing to edit, nothing to edit *with*: the empty face is
					    the add pill below and no header controls at all. */}
					{formData.customOptions.length > 0 ? (
						<View className="flex-row gap-2">
							{editingOptions ? (
								<>
									<IconButton
										label="Cancel editing options"
										onPress={() => runCustomOptions({ type: "cancel", options: formData.customOptions })}
									>
										<CloseGlyph color={NEUTRAL.ink2} />
									</IconButton>
									<IconButton
										label="Confirm options"
										className="bg-person-a-tint"
										onPress={() => runCustomOptions({ type: "confirm" })}
									>
										<CheckGlyph color={NEUTRAL.ink} />
									</IconButton>
								</>
							) : (
								<IconButton
									label="Edit options"
									onPress={() => runCustomOptions({ type: "edit", options: formData.customOptions })}
								>
									<PencilGlyph />
								</IconButton>
							)}
						</View>
					) : null}
				</View>

				{editingOptions ? (
					<>
						{customOptions.draft.map((option, index) => (
							// `.optrow` — a small field and a trash circle.
							<View key={option.id} className="flex-row items-center gap-2">
								<Input
									ref={(node) => {
										inputs.current[option.id] = node;
									}}
									accessibilityLabel={`Custom option ${index + 1}`}
									size="sm"
									className="flex-1"
									placeholder="Enter option"
									value={option.title}
									onChangeText={(title) => runCustomOptions({ type: "change", index, title })}
									onBlur={() => runCustomOptions({ type: "blur" })}
									returnKeyType="next"
									// Not `submitBehavior="submit"` — react-native-web 0.20
									// does not read it, and would blur on every Enter.
									blurOnSubmit={false}
									onSubmitEditing={() => submitCustomOption(index)}
								/>
								<IconButton
									label={`Remove custom option ${index + 1}`}
									onPress={() => runCustomOptions({ type: "remove", index })}
								>
									<TrashGlyph color={NEUTRAL.destructive} />
								</IconButton>
							</View>
						))}
						<AddOptionPill onPress={addCustomOption} />
					</>
				) : formData.customOptions.length > 0 ? (
					formData.customOptions.map((option) => (
						<View key={option.id} className="rounded-field bg-surface-2 px-3.5 py-2.5">
							<Body className={WRAP_ANYWHERE}>{option.title}</Body>
						</View>
					))
				) : (
					<AddOptionPill onPress={() => runCustomOptions({ type: "addFirst", id: mintId() })} />
				)}
			</View>

			{optionsMessage ? (
				<Caption testID="create-options-message" className="text-center text-ink-3">
					{optionsMessage}
				</Caption>
			) : null}

			{/* `.sheet-ft` — the hairline, then a 1:2 split. */}
			<View className="mt-1 flex-row gap-2.5 border-t border-line pt-3.5">
				<Button
					variant="secondary"
					className="h-[50px] flex-1 rounded-button"
					accessibilityLabel="Cancel"
					onPress={onCancel}
				>
					<Text className="text-[16px] font-semibold leading-[22px] text-ink-2">Cancel</Text>
				</Button>
				<Button
					className="h-[50px] flex-[2] rounded-button"
					accessibilityLabel={submitLabel}
					accessibilityState={{ disabled: submitDisabled }}
					disabled={submitDisabled}
					onPress={onSubmit}
				>
					<Text className="text-[16px] font-semibold leading-[22px] text-cta-fg">{submitLabel}</Text>
				</Button>
			</View>
		</View>
	);
}
