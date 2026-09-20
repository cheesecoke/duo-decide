import React, { useState } from "react";
import { Modal, Pressable, View } from "react-native";

import { Button } from "@/components/ui/reusables/button/button";
import { Body, Caption } from "@/components/ui/reusables/headline/headline";
import { Text } from "@/components/ui/reusables/text/text";
import { cn } from "@/lib/utils";
import { NEUTRAL } from "@/theme/neutrals";
import { SHADOW } from "@/theme/shadows";
import { IconEditNote } from "@/assets/icons/IconEditNote";

/**
 * The deadline calendar (FEATURE-INVENTORY §1.10b).
 *
 * §1.10b keeps the component itself; what changed in the cleanup task is the
 * styling system underneath it — every `styled` surface here is now a
 * token class (tokens.md §3/§4/§5). Behaviour, props and callbacks are
 * untouched: `renderTrigger`, `variant`, `transparentOverlay`, the local-date
 * helpers and the min/max clamp all work exactly as before.
 *
 * Callers on the v2 system hand in their own trigger (`renderTrigger`); the
 * field below is what is drawn when they do not.
 */

/** `.datefield` — the slab the picker draws when no trigger is handed in. */
const FIELD_CLASS =
	"w-full flex-row items-center justify-between gap-2 rounded-field bg-surface-2 px-3.5 py-2.5";
/** The inline variant sits inside card meta text, so it paints nothing. */
const FIELD_INLINE_CLASS = "w-full flex-row items-center justify-between gap-2 py-0.5";

/** Format a Date as local YYYY-MM-DD (avoids UTC off-by-one from toISOString). */
export function dateToLocalDateString(date: Date): string {
	const y = date.getFullYear();
	const m = date.getMonth() + 1;
	const d = date.getDate();
	return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Parse YYYY-MM-DD as local date (avoids UTC interpretation of new Date(string)). */
export function parseLocalDateString(s: string): Date {
	const [y, m, d] = s.split("-").map(Number);
	return new Date(y, m - 1, d);
}

interface DatePickerProps {
	value: string;
	onChange: (date: string) => void;
	placeholder?: string;
	disabled?: boolean;
	minDate?: Date;
	maxDate?: Date;
	/** When true, uses 14px body font and mutedForeground to match card meta text (e.g. "Created by", "Deadline: No deadline") */
	variant?: "default" | "inline";
	/** When true, modal backdrop is transparent. Use when DatePicker is inside another modal (e.g. Create Decision drawer) to avoid stacked dark overlays. */
	transparentOverlay?: boolean;
	/**
	 * Draw the field that opens the calendar, instead of the one below.
	 *
	 * The picker draws a `.datefield`-shaped trigger of its own, but a caller
	 * that needs the mark, the copy or the press target to differ hands one in
	 * (the mock's `.datefield`,
	 * design-refs/mocks/decision-queue-round-3.html:266). `label` is already
	 * resolved: the formatted date, or the placeholder when there is none.
	 * The calendar overlay itself is unchanged either way.
	 */
	renderTrigger?: (props: {
		label: string;
		onPress: () => void;
		disabled?: boolean;
	}) => React.ReactNode;
}

export function DatePickerComponent({
	value,
	onChange,
	placeholder = "Select date",
	disabled = false,
	minDate,
	maxDate,
	variant = "default",
	transparentOverlay = false,
	renderTrigger,
}: DatePickerProps) {
	const inline = variant === "inline";
	const [isOpen, setIsOpen] = useState(false);
	const [focused, setFocused] = useState(false);
	const [currentMonth, setCurrentMonth] = useState(new Date());

	// Parse value as local date so display matches stored YYYY-MM-DD
	const selectedDate = value ? parseLocalDateString(value) : new Date();

	// Format date for display
	const formatDate = (date: Date): string => {
		return date.toLocaleDateString("en-US", {
			weekday: "short",
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	// Default range: today through 1 year out so all visible calendar dates are selectable
	const getDefaultMinDate = (): Date => {
		const date = new Date();
		date.setHours(0, 0, 0, 0);
		return date;
	};

	const getDefaultMaxDate = (): Date => {
		const date = new Date();
		date.setFullYear(date.getFullYear() + 1);
		date.setHours(0, 0, 0, 0);
		return date;
	};

	const handleDateChange = (date: Date) => {
		onChange(dateToLocalDateString(date));
	};

	const handlePress = () => {
		if (!disabled) {
			setIsOpen(!isOpen);
			setFocused(true);
		}
	};

	const handleClose = () => {
		setIsOpen(false);
		setFocused(false);
	};

	const handleDateSelect = (date: Date) => {
		handleDateChange(date);
		handleClose();
	};

	// Generate calendar days
	const generateCalendarDays = () => {
		const year = currentMonth.getFullYear();
		const month = currentMonth.getMonth();

		const firstDay = new Date(year, month, 1);
		const startDate = new Date(firstDay);
		startDate.setDate(startDate.getDate() - firstDay.getDay());

		const days = [];
		const today = new Date();
		const minDateLimit = minDate || getDefaultMinDate();
		const maxDateLimit = maxDate || getDefaultMaxDate();

		for (let i = 0; i < 42; i++) {
			const date = new Date(startDate);
			date.setDate(startDate.getDate() + i);

			const isCurrentMonth = date.getMonth() === month;
			const isSelected = !!(value && date.toDateString() === selectedDate.toDateString());
			const isToday = date.toDateString() === today.toDateString();
			const isDisabled = date < minDateLimit || date > maxDateLimit;

			days.push({
				date,
				isCurrentMonth,
				isSelected,
				isToday,
				isDisabled,
			});
		}

		return days;
	};

	const navigateMonth = (direction: "prev" | "next") => {
		const newMonth = new Date(currentMonth);
		if (direction === "prev") {
			newMonth.setMonth(newMonth.getMonth() - 1);
		} else {
			newMonth.setMonth(newMonth.getMonth() + 1);
		}
		setCurrentMonth(newMonth);
	};

	const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

	return (
		<View className="relative">
			{renderTrigger ? (
				renderTrigger({
					label: value ? formatDate(selectedDate) : placeholder,
					onPress: handlePress,
					disabled,
				})
			) : (
				<Pressable
					onPress={handlePress}
					disabled={disabled}
					className={cn(
						inline ? FIELD_INLINE_CLASS : FIELD_CLASS,
						// The focus ring is the same `person-a-base` edge every
						// field in the system grows, drawn as a border only when
						// there is a slab to draw it on.
						!inline && "border-2 border-transparent",
						!inline && focused && "border-person-a-base",
						disabled && "opacity-50",
					)}
				>
					{inline ? (
						<Caption className="shrink">{value ? formatDate(selectedDate) : placeholder}</Caption>
					) : (
						<Body className={cn("shrink", !value && "text-ink-3")}>
							{value ? formatDate(selectedDate) : placeholder}
						</Body>
					)}
					<View className={inline ? "ml-1.5 p-1" : "ml-2 p-1"}>
						<IconEditNote size={inline ? 14 : 16} color={NEUTRAL.ink2} />
					</View>
				</Pressable>
			)}

			<Modal visible={isOpen} transparent={true} animationType="fade" onRequestClose={handleClose}>
				<View
					className={cn("flex-1 items-center justify-center px-6", !transparentOverlay && "bg-scrim")}
				>
					<View
						className="w-full min-w-[280px] max-w-[400px] self-center rounded-card bg-surface p-4"
						style={SHADOW.float}
					>
						<View className="mb-4 flex-row items-center justify-between">
							<Pressable
								role="button"
								accessibilityLabel="Previous month"
								className="rounded-chip bg-surface-2 p-2"
								onPress={() => navigateMonth("prev")}
							>
								<Text className="text-[16px] font-semibold leading-[22px] text-ink">‹</Text>
							</Pressable>

							<Body className="font-semibold">
								{currentMonth.toLocaleDateString("en-US", {
									month: "long",
									year: "numeric",
								})}
							</Body>

							<Pressable
								role="button"
								accessibilityLabel="Next month"
								className="rounded-chip bg-surface-2 p-2"
								onPress={() => navigateMonth("next")}
							>
								<Text className="text-[16px] font-semibold leading-[22px] text-ink">›</Text>
							</Pressable>
						</View>

						<View className="mb-2 w-[280px] flex-row self-center">
							{weekDays.map((day) => (
								<Text
									key={day}
									className="flex-1 py-2 text-center text-[12px] font-medium leading-4 text-ink-2"
								>
									{day}
								</Text>
							))}
						</View>

						<View className="w-[280px] flex-row flex-wrap self-center">
							{generateCalendarDays().map((day, index) => (
								<Pressable
									key={index}
									className={cn(
										"m-0.5 h-9 w-9 items-center justify-center rounded-chip",
										day.isSelected && "bg-person-a-base",
										!day.isSelected && day.isToday && "bg-surface-2",
										day.isDisabled && "opacity-40",
									)}
									onPress={() => !day.isDisabled && handleDateSelect(day.date)}
									disabled={day.isDisabled}
								>
									<Text
										className={cn(
											"text-[14px] leading-5",
											day.isSelected || day.isToday ? "font-semibold" : "font-normal",
											day.isSelected && "text-person-a-deep",
											!day.isSelected && day.isToday && "text-person-a-deep",
											!day.isSelected && !day.isToday && !day.isCurrentMonth && "text-ink-3",
											!day.isSelected && !day.isToday && day.isCurrentMonth && "text-ink",
										)}
									>
										{day.date.getDate()}
									</Text>
								</Pressable>
							))}
						</View>

						<View className="mt-4 flex-row justify-end gap-2 border-t border-line pt-4">
							<Button variant="ghost" className="rounded-button px-4" onPress={handleClose}>
								<Text className="text-[14px] font-medium leading-5 text-ink">Cancel</Text>
							</Button>
						</View>
					</View>
				</View>
			</Modal>
		</View>
	);
}
