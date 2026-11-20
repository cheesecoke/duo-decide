import * as React from "react";
import {
	AccessibilityInfo,
	Keyboard,
	Platform,
	Pressable,
	useWindowDimensions,
	View,
	type TextInput,
} from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

import {
	bodyHeading,
	COPY,
	destinationsFor,
	DURATIONS,
	eventSummary,
	formatDay,
	initialFocus,
	primaryAction,
	stackFooter,
	whenCaption,
	type CalendarBody,
	type CalendarForm,
	type CalendarPlatform,
	type Destination,
} from "@/components/calendar/add-to-calendar.model";
import { DatePickerComponent } from "@/components/ui/DatePicker";
import { Button } from "@/components/ui/reusables/button/button";
import { Chip } from "@/components/ui/reusables/chip/chip";
import { FieldLabel, Input, Textarea } from "@/components/ui/reusables/field/field";
import { Body, Caption, Title } from "@/components/ui/reusables/headline/headline";
import { Notice } from "@/components/ui/reusables/notice/notice";
import { Reveal } from "@/components/ui/reusables/reveal/reveal";
import { Text } from "@/components/ui/reusables/text/text";
import { TimeField } from "@/components/ui/reusables/time-field/time-field";
import type { FollowUp } from "@/lib/follow-up";
import { cn } from "@/lib/utils";
import { NEUTRAL } from "@/theme/neutrals";
import type { CalendarAddMethod } from "@/types/database";

/**
 * AddToCalendarSheet — what goes inside the Add to calendar drawer.
 *
 * `BottomDrawer` supplies the chrome (the title "Add to calendar", the close
 * button, the scrim, the scroll view with `keyboardShouldPersistTaps`). This
 * is the body under it, and it is one of four (see the model):
 *
 *   review  → the form
 *   confirm → "Did it save?"
 *   added   → "On the calendar"
 *   already → "Already on the calendar" (the partner got there first)
 *
 * Pure and props-driven: no Supabase, no `Linking`, no clock. Every decision
 * (labels, captions, what is disabled) is the model's; every side effect is
 * `add-to-calendar-drawer.tsx`'s. That is what lets each body and each
 * notable state have a story.
 *
 * ## Focus
 *
 * When the body changes, the new heading takes focus on web and is read out
 * on a phone, so a screen reader hears "Did it save?" instead of staying on
 * a button that is no longer there. When the form opens with no date, the
 * date button has the focus ring (and real focus on web).
 *
 * ## The footer
 *
 * Drawn at the end of the body like the app's other sheets. The two buttons
 * sit side by side, and stack (secondary above primary) when the labels
 * would not fit at the current text size (`stackFooter`).
 */

/** What went wrong, as the notice to show. */
type SheetError =
	/** The link (or file) could not be opened. */
	| "open"
	/** `markOpened` did not reach the server: nothing was handed off. */
	| "offline"
	/** A later write ("Yes, added", "Mark as not added") did not save. */
	| "save";

type AddToCalendarSheetProps = {
	body: CalendarBody;
	form: CalendarForm;
	onFormChange: (patch: Partial<CalendarForm>) => void;
	platform: CalendarPlatform;
	/** The phone's calendar day, `YYYY-MM-DD`. */
	today: string;
	/** For the caption under the date. */
	followUp: Pick<FollowUp, "when" | "datePast">;
	partnerName: string;

	/** The partner handed off moments ago (and how): hold the button back. */
	partnerOpening?: CalendarAddMethod | null;
	/** How the partner added it, for the `already` body. */
	partnerMethod?: CalendarAddMethod;
	/** The decision's details moved since it was added (`added` body). */
	changed?: boolean;
	error?: SheetError | null;
	/** A hand-off or a save is in flight. */
	busy?: boolean;
	/** A submit was tried: show field errors even on untouched fields. */
	showErrors?: boolean;

	onPrimary: () => void;
	onNotNow: () => void;
	onAddAnyway?: () => void;
	onRetry?: () => void;
	/** "Ask for it": take the request to /support. */
	onAskForIt?: () => void;
	onYes?: () => void;
	onNotYet?: () => void;
	onMarkNotAdded?: () => void;
	onDone?: () => void;
	onAddAgain?: () => void;
	onAddMine?: () => void;
	onGotIt?: () => void;
};

/** `BottomDrawer`'s widest sheet and its two 20 px gutters, plus this body's `px-1`. */
const SHEET_MAX_WIDTH = 750;
const SHEET_GUTTERS = 2 * 20 + 2 * 4;

const LABEL_CLASS = "text-[16px] font-semibold leading-[22px]";

/** The same mark as the create form's due-date field. Decorative: the button is labelled. */
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

type FooterButton = { label: string; onPress?: () => void; disabled?: boolean };

/** The two buttons every body ends with. */
function SheetFooter({ secondary, primary }: { secondary: FooterButton; primary: FooterButton }) {
	const { width, fontScale } = useWindowDimensions();
	const stacked = stackFooter(
		[secondary.label, primary.label],
		Math.min(width, SHEET_MAX_WIDTH) - SHEET_GUTTERS,
		fontScale,
	);

	return (
		<View testID="add-to-calendar-footer" className={cn("gap-2.5 pt-1", !stacked && "flex-row")}>
			<Button
				variant="secondary"
				className={cn("h-[50px] rounded-button px-5", stacked && "w-full")}
				accessibilityLabel={secondary.label}
				accessibilityState={{ disabled: Boolean(secondary.disabled) }}
				disabled={secondary.disabled}
				onPress={secondary.onPress}
			>
				<Text className={cn(LABEL_CLASS, "text-ink-2")}>{secondary.label}</Text>
			</Button>
			<Button
				className={cn("h-[50px] rounded-button px-5", stacked ? "w-full" : "min-w-0 flex-1")}
				accessibilityLabel={primary.label}
				accessibilityState={{ disabled: Boolean(primary.disabled) }}
				disabled={primary.disabled}
				onPress={primary.onPress}
			>
				<Text className={cn(LABEL_CLASS, "text-cta-fg")}>{primary.label}</Text>
			</Button>
		</View>
	);
}

/**
 * The heading of a later body. It takes focus when it appears (web), and is
 * read out (a phone), so the swap is not silent.
 */
function BodyHeading({ children }: { children: string }) {
	const ref = React.useRef<View>(null);

	React.useEffect(() => {
		// Web only: on native, focusing a plain View goes through the text-input
		// focus path, and the announcement below is what a screen reader hears.
		if (Platform.OS === "web") {
			(ref.current as unknown as { focus?: () => void } | null)?.focus?.();
		}
		AccessibilityInfo?.announceForAccessibility?.(children);
	}, [children]);

	return (
		<View ref={ref} tabIndex={-1} className="web:outline-none">
			<Title role="heading" aria-level={2}>
				{children}
			</Title>
		</View>
	);
}

/** "All day": a switch drawn in tokens (RN's own takes its colours as values). */
function AllDaySwitch({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
	return (
		<Pressable
			role="switch"
			accessibilityLabel={COPY.allDay}
			accessibilityState={{ checked: on }}
			onPress={() => onChange(!on)}
			className="min-h-[44px] flex-row items-center justify-between gap-3"
		>
			<FieldLabel>{COPY.allDay}</FieldLabel>
			<View
				className={cn(
					"h-[30px] w-[52px] justify-center rounded-chip px-[3px]",
					on ? "items-end bg-cta" : "items-start bg-ink-3",
				)}
			>
				<View className="h-[24px] w-[24px] rounded-chip bg-surface" />
			</View>
		</Pressable>
	);
}

/** One choice in the "Adding to" radiogroup. */
function DestinationRow({
	destination,
	selected,
	onPress,
}: {
	destination: Destination;
	selected: boolean;
	onPress: () => void;
}) {
	const { name, hint } = COPY.destination[destination];
	return (
		<Pressable
			role="radio"
			accessibilityLabel={name}
			accessibilityHint={hint}
			accessibilityState={{ checked: selected }}
			onPress={onPress}
			className={cn(
				"min-h-[52px] flex-row items-center gap-3 rounded-field px-3.5 py-2.5",
				selected ? "bg-person-a-tint" : "bg-surface-2",
			)}
		>
			<View
				className={cn(
					"h-5 w-5 items-center justify-center rounded-chip border-2",
					selected ? "border-person-a-deep" : "border-ink-3",
				)}
			>
				{selected ? <View className="h-2.5 w-2.5 rounded-chip bg-person-a-deep" /> : null}
			</View>
			<View className="min-w-0 flex-1">
				<Body className={cn("font-medium", selected && "text-person-a-deep")}>{name}</Body>
				<Caption className={cn(selected && "text-person-a-deep")}>{hint}</Caption>
			</View>
		</Pressable>
	);
}

function ReviewBody({
	form,
	onFormChange,
	platform,
	today,
	followUp,
	partnerName,
	partnerOpening,
	error,
	busy = false,
	showErrors = false,
	onPrimary,
	onNotNow,
	onAddAnyway,
	onRetry,
	onAskForIt,
}: Omit<AddToCalendarSheetProps, "body">) {
	const titleRef = React.useRef<React.ComponentRef<typeof TextInput>>(null);
	const dateRef = React.useRef<View>(null);
	const timeRef = React.useRef<React.ComponentRef<typeof TextInput>>(null);

	// Once, as the form opens: put focus where something is missing.
	const opened = React.useRef(false);
	React.useEffect(() => {
		if (opened.current) return;
		opened.current = true;
		const target = initialFocus(form);
		if (target === "title") titleRef.current?.focus?.();
		if (target === "date" && Platform.OS === "web") {
			(dateRef.current as unknown as { focus?: () => void } | null)?.focus?.();
		}
	}, [form]);

	const timeMissing = !form.allDay && form.time === null;
	React.useEffect(() => {
		if (showErrors && timeMissing) timeRef.current?.focus?.();
		// Only when a submit was tried, not on every keystroke after it.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [showErrors]);

	const caption = whenCaption(followUp, form, today);
	const primary = primaryAction(form, today, busy || Boolean(partnerOpening));
	const fullDate = formatDay(form.date, "full") || null;
	const chosen = COPY.destination[form.destination];

	return (
		<View testID="add-to-calendar-review" className="gap-4 px-1 pb-2 pt-1">
			<View className="gap-1.5">
				<FieldLabel>{COPY.what}</FieldLabel>
				<Input
					ref={titleRef}
					accessibilityLabel={COPY.what}
					placeholder={COPY.whatPlaceholder}
					value={form.title}
					onChangeText={(title) => onFormChange({ title })}
					returnKeyType="done"
				/>
			</View>

			<View className="gap-1.5">
				<FieldLabel>{COPY.when}</FieldLabel>
				{/* `transparentOverlay`: the picker opens its own Modal, and
				    without this it lays a second dark scrim over the drawer. */}
				<DatePickerComponent
					value={form.date}
					onChange={(date) => onFormChange({ date })}
					placeholder={COPY.whenPlaceholder}
					transparentOverlay
					renderTrigger={({ onPress, disabled }) => (
						// A button, not a field: it opens the calendar and nothing
						// is typed into it. Its name carries the whole date, so
						// "Sat, Dec 12" is never the only thing a screen reader has.
						<Pressable
							ref={dateRef}
							role="button"
							accessibilityLabel={COPY.whenLabel(fullDate)}
							accessibilityState={{ disabled: Boolean(disabled) }}
							disabled={disabled}
							onPress={() => {
								// The calendar is a Modal: a keyboard left up would
								// sit on top of it.
								Keyboard.dismiss();
								onPress();
							}}
							className={cn(
								"min-h-[44px] w-full flex-row items-center justify-between gap-2 rounded-field border-2 bg-surface-2 px-3.5 py-2.5 web:outline-none",
								// No date yet: this is the field that needs attention,
								// so it wears the focus ring until it has one.
								form.date === "" ? "border-person-a-deep" : "border-transparent",
							)}
						>
							<Body className={cn("shrink", form.date === "" && "text-ink-3")}>
								{form.date === "" ? COPY.whenPlaceholder : formatDay(form.date, "long")}
							</Body>
							<CalendarGlyph />
						</Pressable>
					)}
				/>
				{caption ? (
					caption.tone === "problem" ? (
						<Caption testID="add-to-calendar-when-caption" role="alert" className="text-destructive">
							{caption.text}
						</Caption>
					) : (
						<Caption testID="add-to-calendar-when-caption">{caption.text}</Caption>
					)
				) : null}
			</View>

			{/* One block with no gap of its own: `Reveal` brings its own 16 px,
			    inside the height it animates. */}
			<View>
				<AllDaySwitch
					on={form.allDay}
					onChange={(allDay) => {
						Keyboard.dismiss();
						onFormChange({ allDay });
					}}
				/>
				<Reveal testID="add-to-calendar-timed" open={!form.allDay}>
					<View className="gap-4">
						<View className="gap-1.5">
							<FieldLabel>{COPY.starts}</FieldLabel>
							<TimeField
								ref={timeRef}
								accessibilityLabel={COPY.starts}
								value={form.time}
								onChange={(time) => onFormChange({ time })}
								showError={showErrors && timeMissing}
								errorMessage={COPY.badTime}
							/>
						</View>
						<View className="gap-1.5">
							<FieldLabel>{COPY.howLong}</FieldLabel>
							<View
								role="radiogroup"
								accessibilityLabel={COPY.howLong}
								className="flex-row flex-wrap gap-2"
							>
								{DURATIONS.map((minutes) => {
									const selected = form.durationMinutes === minutes;
									return (
										<Chip
											key={minutes}
											// One of three, so a radio, not the chip's checkbox.
											role="radio"
											label={COPY.duration(minutes)}
											accessibilityLabel={COPY.durationLabel(minutes)}
											accessibilityState={{ checked: selected }}
											selected={selected}
											hitSlop={6}
											onPress={() => onFormChange({ durationMinutes: minutes })}
										/>
									);
								})}
							</View>
						</View>
					</View>
				</Reveal>
			</View>

			<View className="gap-1.5">
				<FieldLabel>{COPY.where}</FieldLabel>
				<Input
					accessibilityLabel={COPY.where}
					placeholder={COPY.wherePlaceholder}
					value={form.location}
					onChangeText={(location) => onFormChange({ location })}
					returnKeyType="done"
				/>
			</View>

			<View className="gap-1.5">
				<FieldLabel>{COPY.note}</FieldLabel>
				<Textarea
					accessibilityLabel={COPY.note}
					placeholder={COPY.notePlaceholder}
					value={form.notes}
					onChangeText={(notes) => onFormChange({ notes })}
				/>
			</View>

			<View className="gap-1.5">
				<FieldLabel>{COPY.addingTo}</FieldLabel>
				{form.destinationOpen ? (
					<View role="radiogroup" accessibilityLabel={COPY.addingTo} className="gap-2">
						{destinationsFor(platform).map((destination) => (
							<DestinationRow
								key={destination}
								destination={destination}
								selected={form.destination === destination}
								onPress={() =>
									onFormChange({
										destination,
										// A real choice folds the list away; "Another
										// calendar" keeps it open under its notice.
										destinationOpen: destination === "other",
									})
								}
							/>
						))}
					</View>
				) : (
					<>
						<View className="flex-row items-center justify-between gap-3">
							<Body className="min-w-0 shrink font-medium">{chosen.name}</Body>
							<Pressable
								role="button"
								accessibilityLabel={COPY.changeLabel}
								onPress={() => onFormChange({ destinationOpen: true })}
								className="min-h-[44px] justify-center pl-3"
							>
								<Text className="text-[14px] font-semibold leading-5 text-ink underline">
									{COPY.change}
								</Text>
							</Pressable>
						</View>
						<Caption>{chosen.hint}</Caption>
					</>
				)}
				{form.destination === "other" ? (
					<Notice
						testID="add-to-calendar-unsupported"
						message={COPY.unsupported}
						actions={[
							{ label: COPY.askForIt, onPress: () => onAskForIt?.() },
							{
								label: COPY.useGoogle,
								onPress: () => onFormChange({ destination: "google", destinationOpen: false }),
							},
						]}
					/>
				) : null}
			</View>

			{partnerOpening ? (
				<Notice
					testID="add-to-calendar-partner-opening"
					message={COPY.partnerOpening(partnerName, partnerOpening)}
					actions={[{ label: COPY.addAnyway, onPress: () => onAddAnyway?.() }]}
				/>
			) : null}

			{error === "open" || error === "offline" ? (
				<Notice
					testID="add-to-calendar-error"
					urgent
					message={
						error === "offline"
							? COPY.offline
							: COPY.openFailed[form.destination === "ics" ? "ics" : "google"]
					}
					actions={[{ label: COPY.tryAgain, onPress: () => onRetry?.(), disabled: busy }]}
				/>
			) : null}

			<SheetFooter
				secondary={{ label: COPY.notNow, onPress: onNotNow }}
				primary={{ label: primary.label, disabled: primary.disabled, onPress: onPrimary }}
			/>
		</View>
	);
}

/** A write from one of the later bodies did not save. */
function SaveError({ error }: { error?: SheetError | null }) {
	return error === "save" ? (
		<Notice testID="add-to-calendar-error" urgent message={COPY.notSaved} />
	) : null;
}

function AddToCalendarSheet(props: AddToCalendarSheetProps) {
	const { body, form, partnerName, partnerMethod = "google_link", changed, error, busy } = props;
	const heading = bodyHeading(body);

	// Coming *back* to the form ("Not yet", "Add again") is a swap too, and the
	// form has no heading of its own: say the sheet's title.
	const previous = React.useRef(body);
	React.useEffect(() => {
		if (previous.current !== body && body === "review") {
			AccessibilityInfo?.announceForAccessibility?.(COPY.drawerTitle);
		}
		previous.current = body;
	}, [body]);

	if (body === "review" || heading === null) {
		const { body: _body, ...review } = props;
		return <ReviewBody {...review} />;
	}

	if (body === "confirm") {
		return (
			<View testID="add-to-calendar-confirm" className="gap-4 px-1 pb-2 pt-1">
				<View className="gap-2">
					<BodyHeading>{heading}</BodyHeading>
					<Body className="font-medium">{eventSummary(form)}</Body>
					<Body className="text-ink-2">{COPY.confirm.body(partnerName)}</Body>
				</View>
				<SaveError error={error} />
				<SheetFooter
					secondary={{ label: COPY.confirm.notYet, onPress: props.onNotYet, disabled: busy }}
					primary={{ label: COPY.confirm.yes, onPress: props.onYes, disabled: busy }}
				/>
			</View>
		);
	}

	if (body === "added") {
		return (
			<View testID="add-to-calendar-added" className="gap-4 px-1 pb-2 pt-1">
				<View className="gap-2">
					<BodyHeading>{heading}</BodyHeading>
					<Body className="font-medium">{eventSummary(form)}</Body>
					<Body className="text-ink-2">{COPY.added.body(partnerName)}</Body>
				</View>
				{changed ? (
					<Notice
						testID="add-to-calendar-changed"
						message={COPY.changed}
						actions={[{ label: COPY.addAgain, onPress: () => props.onAddAgain?.() }]}
					/>
				) : null}
				<SaveError error={error} />
				<SheetFooter
					secondary={{ label: COPY.added.markNotAdded, onPress: props.onMarkNotAdded, disabled: busy }}
					primary={{ label: COPY.added.done, onPress: props.onDone }}
				/>
			</View>
		);
	}

	return (
		<View testID="add-to-calendar-already" className="gap-4 px-1 pb-2 pt-1">
			<View className="gap-2">
				<BodyHeading>{heading}</BodyHeading>
				<Body className="font-medium">{COPY.already.body(partnerName, partnerMethod)}</Body>
				<Body className="text-ink-2">{COPY.already.shared}</Body>
			</View>
			<SheetFooter
				secondary={{ label: COPY.already.addMine, onPress: props.onAddMine }}
				primary={{ label: COPY.already.gotIt, onPress: props.onGotIt }}
			/>
		</View>
	);
}

export { AddToCalendarSheet };
export type { AddToCalendarSheetProps, SheetError };
