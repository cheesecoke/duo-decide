import * as React from "react";
import { View, type TextInput } from "react-native";

import { Input } from "@/components/ui/reusables/field/field";
import { Caption } from "@/components/ui/reusables/headline/headline";
import { SegmentedToggle } from "@/components/ui/reusables/segmented-toggle/segmented-toggle";
import { cn } from "@/lib/utils";

/**
 * TimeField — a time of day, typed.
 *
 * The app has no time picker (`components/ui/DatePicker.tsx` is date-only),
 * and a wheel or a clock face is a lot of control for "7:30". This is one
 * text field that reads what people actually type (`7`, `730`, `7:30`,
 * `19:30`, `7pm`) plus an AM | PM toggle, and it is the same control on web
 * and iOS.
 *
 * The value goes in and out as 24-hour `HH:mm`, or `null` when what is typed
 * is not a time (including nothing at all).
 *
 * ## AM or PM
 *
 * Nobody types "pm" for dinner. Until the person says otherwise, the hour
 * picks: **12 and 1 to 7 are pm, 8 to 11 are am**. They say otherwise by
 * tapping the toggle (which then sticks), by typing a suffix (`7am`), or by
 * typing a 24-hour time (`19:30`, `0:15`), which sets the toggle to match.
 *
 * ## When it complains
 *
 * Not while typing: "7:" is on its way to being a time. The field turns
 * invalid when it is left holding something that is not a time, or when the
 * caller sets `showError` (a submit with the field still empty).
 */

type Meridiem = "am" | "pm";

type ParsedTime = {
	/** 24-hour `HH:mm`. */
	time: string;
	meridiem: Meridiem;
	/** True when the text itself said am or pm (a suffix, or a 24-hour hour). */
	explicit: boolean;
};

/** What the field says when it is holding something that is not a time. */
const TIME_FIELD_ERROR = "Try a time like 7:30.";

const pad = (value: number): string => String(value).padStart(2, "0");

/** 12 and 1 to 7 are pm (lunch, dinner); 8 to 11 are am. `hour` is 1 to 12. */
function defaultMeridiem(hour: number): Meridiem {
	return hour === 12 || hour <= 7 ? "pm" : "am";
}

/**
 * Reads a typed time. Pure.
 *
 * @param text     Whatever is in the field.
 * @param meridiem The toggle, when the person has set it. Left out (or
 *   `null`), the hour picks (`defaultMeridiem`). A suffix or a 24-hour hour
 *   in the text always wins over it.
 * @returns `null` when the text is not a time.
 */
function parseTimeInput(text: string, meridiem?: Meridiem | null): ParsedTime | null {
	const typed = (text ?? "")
		.trim()
		.toLowerCase()
		// "p.m." → "pm"; a dot between digits ("7.30") is left for the pattern.
		.replace(/([apm])\./g, "$1");
	const match = /^(\d{1,2})(?:[:.]?(\d{2}))?\s*(am?|pm?)?$/.exec(typed);
	if (!match) return null;

	const hour = Number(match[1]);
	const minute = match[2] === undefined ? 0 : Number(match[2]);
	const suffix: Meridiem | null = match[3] ? (match[3].startsWith("a") ? "am" : "pm") : null;
	if (minute > 59 || hour > 23) return null;

	// A 24-hour hour says which half of the day by itself.
	if (hour === 0 || hour > 12) {
		if (suffix) return null;
		return {
			time: `${pad(hour)}:${pad(minute)}`,
			meridiem: hour >= 12 ? "pm" : "am",
			explicit: true,
		};
	}

	const half = suffix ?? meridiem ?? defaultMeridiem(hour);
	const hour24 = half === "am" ? hour % 12 : (hour % 12) + 12;
	return { time: `${pad(hour24)}:${pad(minute)}`, meridiem: half, explicit: suffix !== null };
}

/** `19:30` → `{ text: "7:30", meridiem: "pm" }`, for showing a value in the field. */
function splitTime(value: string | null | undefined): { text: string; meridiem: Meridiem } | null {
	const match = /^(\d{1,2}):(\d{2})$/.exec(value ?? "");
	if (!match) return null;
	const [hour, minute] = [Number(match[1]), Number(match[2])];
	if (hour > 23 || minute > 59) return null;
	return {
		text: `${hour % 12 === 0 ? 12 : hour % 12}:${pad(minute)}`,
		meridiem: hour >= 12 ? "pm" : "am",
	};
}

const MERIDIEM_OPTIONS = [
	{ value: "am", label: "AM" },
	{ value: "pm", label: "PM" },
];

type TimeFieldProps = {
	/** 24-hour `HH:mm`, or `null` for no time. */
	value: string | null;
	/** Called with `HH:mm`, or `null` while the text is not a time. */
	onChange: (value: string | null) => void;
	/** Required: the input has no visible label of its own. */
	accessibilityLabel: string;
	placeholder?: string;
	/** Show the error now, even untouched or empty (a submit was tried). */
	showError?: boolean;
	errorMessage?: string;
	disabled?: boolean;
	className?: string;
	testID?: string;
};

const TimeField = React.forwardRef<React.ComponentRef<typeof TextInput>, TimeFieldProps>(
	function TimeField(
		{
			value,
			onChange,
			accessibilityLabel,
			placeholder = "7:30",
			showError = false,
			errorMessage = TIME_FIELD_ERROR,
			disabled = false,
			className,
			testID = "time-field",
		},
		ref,
	) {
		const initial = splitTime(value);
		const [text, setText] = React.useState(initial?.text ?? "");
		const [meridiem, setMeridiem] = React.useState<Meridiem>(initial?.meridiem ?? "pm");
		/** The person set the toggle (or the text said am/pm): stop guessing from the hour. */
		const [pinned, setPinned] = React.useState(initial !== null);
		const [blurred, setBlurred] = React.useState(false);

		// A value that arrives from outside (a prefill landing late) is shown.
		// One the field itself just sent is left alone, so typing "7" does not
		// get rewritten to "7:00" under the caret.
		const lastSent = React.useRef<string | null>(value);
		React.useEffect(() => {
			if (value === lastSent.current) return;
			lastSent.current = value;
			const next = splitTime(value);
			setText(next?.text ?? "");
			if (next) {
				setMeridiem(next.meridiem);
				setPinned(true);
			}
		}, [value]);

		const send = (next: string | null) => {
			lastSent.current = next;
			onChange(next);
		};

		const onChangeText = (typed: string) => {
			setText(typed);
			const parsed = parseTimeInput(typed, pinned ? meridiem : null);
			if (parsed) {
				setMeridiem(parsed.meridiem);
				if (parsed.explicit) setPinned(true);
			}
			send(parsed?.time ?? null);
		};

		const onMeridiemChange = (next: string) => {
			const half = next as Meridiem;
			setMeridiem(half);
			setPinned(true);
			// Drop a typed suffix or 24-hour hour: the toggle was just given the last word.
			const shown = splitTime(parseTimeInput(text, half)?.time);
			if (!shown) return;
			const parsed = parseTimeInput(shown.text, half);
			setText(shown.text);
			send(parsed?.time ?? null);
		};

		const onBlur = () => {
			setBlurred(true);
			// Tidy what was typed: "730" and "19:30" both rest as "7:30".
			const shown = splitTime(parseTimeInput(text, pinned ? meridiem : null)?.time);
			if (shown) setText(shown.text);
		};

		const parsed = parseTimeInput(text, pinned ? meridiem : null);
		const invalid = parsed === null && (showError || (blurred && text.trim() !== ""));

		return (
			<View testID={testID} className={cn("gap-1.5", className)}>
				<View className="flex-row items-center gap-2">
					<View className="min-w-0 flex-1">
						<Input
							ref={ref}
							testID={`${testID}-input`}
							accessibilityLabel={accessibilityLabel}
							aria-invalid={invalid}
							value={text}
							onChangeText={onChangeText}
							onFocus={() => setBlurred(false)}
							onBlur={onBlur}
							placeholder={placeholder}
							invalid={invalid}
							editable={!disabled}
							// Digits with the colon one tap away on iOS; a plain
							// keyboard elsewhere, so "pm" can still be typed.
							keyboardType="numbers-and-punctuation"
							autoCapitalize="none"
							autoCorrect={false}
							returnKeyType="done"
							maxLength={8}
						/>
					</View>
					<View pointerEvents={disabled ? "none" : "auto"} className={cn(disabled && "opacity-50")}>
						<SegmentedToggle
							accessibilityLabel={`${accessibilityLabel}, AM or PM`}
							className="w-[124px]"
							options={MERIDIEM_OPTIONS}
							value={meridiem}
							onChange={onMeridiemChange}
						/>
					</View>
				</View>
				{invalid ? (
					<Caption testID={`${testID}-error`} role="alert" className="text-destructive">
						{errorMessage}
					</Caption>
				) : null}
			</View>
		);
	},
);

export { defaultMeridiem, parseTimeInput, splitTime, TIME_FIELD_ERROR, TimeField };
export type { Meridiem, ParsedTime, TimeFieldProps };
