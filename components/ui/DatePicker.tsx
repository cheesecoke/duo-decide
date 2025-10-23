import React, { useState } from "react";
import { View, Pressable, Modal } from "react-native";
import { styled, getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import { IconEditNote } from "@/assets/icons/IconEditNote";

const DatePickerContainer = styled.View`
	position: relative;
`;

const DateInputContainer = styled.View<{
	colorMode: "light" | "dark";
	focused: boolean;
}>`
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	border: 1px solid
		${({ colorMode, focused }) =>
			focused ? getColor("yellow", colorMode) : getColor("border", colorMode)};
	border-radius: 8px;
	background-color: ${({ colorMode }) => getColor("background", colorMode)};
`;

const DateInputText = styled.Text<{
	colorMode: "light" | "dark";
	hasValue: boolean;
}>`
	font-size: 16px;
	color: ${({ colorMode, hasValue }) =>
		hasValue ? getColor("foreground", colorMode) : getColor("mutedForeground", colorMode)};
	flex: 1;
`;

const EditIcon = styled.View<{
	colorMode: "light" | "dark";
}>`
	margin-left: 8px;
	padding: 4px;
`;

// Calendar popup container
const CalendarPopup = styled.View<{
	colorMode: "light" | "dark";
}>`
	background-color: ${({ colorMode }) => getColor("background", colorMode)};
	border: 1px solid ${({ colorMode }) => getColor("border", colorMode)};
	border-radius: 12px;
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
	padding: 16px;
	min-width: 280px;
	elevation: 10;
`;

const CalendarHeader = styled.View`
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 16px;
`;

const MonthYearText = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 18px;
	font-weight: 600;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
`;

const NavButton = styled.Pressable<{
	colorMode: "light" | "dark";
}>`
	padding: 8px;
	border-radius: 6px;
	background-color: ${({ colorMode }) => getColor("muted", colorMode)};
`;

const NavButtonText = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 16px;
	font-weight: 600;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
`;

const WeekDaysContainer = styled.View`
	flex-direction: row;
	margin-bottom: 8px;
`;

const WeekDay = styled.Text<{
	colorMode: "light" | "dark";
}>`
	flex: 1;
	text-align: center;
	font-size: 12px;
	font-weight: 500;
	color: ${({ colorMode }) => getColor("mutedForeground", colorMode)};
	padding: 8px 0;
`;

const CalendarGrid = styled.View`
	flex-direction: row;
	flex-wrap: wrap;
`;

const DayButton = styled.Pressable<{
	colorMode: "light" | "dark";
	isSelected: boolean;
	isToday: boolean;
	isOtherMonth: boolean;
}>`
	width: 36px;
	height: 36px;
	align-items: center;
	justify-content: center;
	margin: 2px;
	border-radius: 18px;
	background-color: ${({ colorMode, isSelected, isToday }) => {
		if (isSelected) return getColor("yellow", colorMode);
		if (isToday) return getColor("muted", colorMode);
		return "transparent";
	}};
`;

const DayText = styled.Text<{
	colorMode: "light" | "dark";
	isSelected: boolean;
	isToday: boolean;
	isOtherMonth: boolean;
}>`
	font-size: 14px;
	font-weight: ${({ isSelected, isToday }) => (isSelected || isToday ? "600" : "400")};
	color: ${({ colorMode, isSelected, isToday, isOtherMonth }) => {
		if (isSelected) return getColor("background", colorMode);
		if (isOtherMonth) return getColor("mutedForeground", colorMode);
		if (isToday) return getColor("yellow", colorMode);
		return getColor("foreground", colorMode);
	}};
`;

const ActionButtons = styled.View<{
	colorMode: "light" | "dark";
}>`
	flex-direction: row;
	justify-content: flex-end;
	gap: 8px;
	margin-top: 16px;
	padding-top: 16px;
	border-top-width: 1px;
	border-top-color: ${({ colorMode }) => getColor("border", colorMode)};
`;

const ActionButton = styled.Pressable<{
	colorMode: "light" | "dark";
	variant: "primary" | "secondary";
}>`
	padding: 8px 16px;
	border-radius: 6px;
	background-color: ${({ colorMode, variant }) =>
		variant === "primary" ? getColor("yellow", colorMode) : "transparent"};
	border: ${({ colorMode, variant }) =>
		variant === "secondary" ? `1px solid ${getColor("border", colorMode)}` : "none"};
`;

const ActionButtonText = styled.Text<{
	colorMode: "light" | "dark";
	variant: "primary" | "secondary";
}>`
	font-size: 14px;
	font-weight: 500;
	color: ${({ colorMode, variant }) =>
		variant === "primary" ? getColor("background", colorMode) : getColor("foreground", colorMode)};
`;

interface DatePickerProps {
	value: string;
	onChange: (date: string) => void;
	placeholder?: string;
	disabled?: boolean;
	minDate?: Date;
	maxDate?: Date;
}

export function DatePickerComponent({
	value,
	onChange,
	placeholder = "Select date",
	disabled = false,
	minDate,
	maxDate,
}: DatePickerProps) {
	const { colorMode } = useTheme();
	const [isOpen, setIsOpen] = useState(false);
	const [focused, setFocused] = useState(false);
	const [currentMonth, setCurrentMonth] = useState(new Date());

	// Convert string date to Date object
	const selectedDate = value ? new Date(value) : new Date();

	// Format date for display
	const formatDate = (date: Date): string => {
		return date.toLocaleDateString("en-US", {
			weekday: "short",
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	// Get default min date (next week)
	const getDefaultMinDate = (): Date => {
		const date = new Date();
		date.setDate(date.getDate() + 7);
		return date;
	};

	// Get default max date (next month)
	const getDefaultMaxDate = (): Date => {
		const date = new Date();
		date.setMonth(date.getMonth() + 1);
		return date;
	};

	const handleDateChange = (date: Date) => {
		const isoString = date.toISOString().split("T")[0];
		onChange(isoString);
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
		<DatePickerContainer>
			<Pressable onPress={handlePress} disabled={disabled}>
				<DateInputContainer colorMode={colorMode} focused={focused}>
					<DateInputText colorMode={colorMode} hasValue={!!value}>
						{value ? formatDate(selectedDate) : placeholder}
					</DateInputText>
					<EditIcon colorMode={colorMode}>
						<IconEditNote size={16} color={getColor("mutedForeground", colorMode)} />
					</EditIcon>
				</DateInputContainer>
			</Pressable>

			<Modal visible={isOpen} transparent={true} animationType="fade" onRequestClose={handleClose}>
				<View
					style={{
						flex: 1,
						justifyContent: "center",
						alignItems: "center",
						backgroundColor: "rgba(0, 0, 0, 0.5)",
					}}
				>
					<CalendarPopup colorMode={colorMode}>
						<CalendarHeader>
							<NavButton colorMode={colorMode} onPress={() => navigateMonth("prev")}>
								<NavButtonText colorMode={colorMode}>‹</NavButtonText>
							</NavButton>

							<MonthYearText colorMode={colorMode}>
								{currentMonth.toLocaleDateString("en-US", {
									month: "long",
									year: "numeric",
								})}
							</MonthYearText>

							<NavButton colorMode={colorMode} onPress={() => navigateMonth("next")}>
								<NavButtonText colorMode={colorMode}>›</NavButtonText>
							</NavButton>
						</CalendarHeader>

						<WeekDaysContainer>
							{weekDays.map((day) => (
								<WeekDay key={day} colorMode={colorMode}>
									{day}
								</WeekDay>
							))}
						</WeekDaysContainer>

						<CalendarGrid>
							{generateCalendarDays().map((day, index) => (
								<DayButton
									key={index}
									colorMode={colorMode}
									isSelected={day.isSelected}
									isToday={day.isToday}
									isOtherMonth={!day.isCurrentMonth}
									onPress={() => !day.isDisabled && handleDateSelect(day.date)}
									disabled={day.isDisabled}
								>
									<DayText
										colorMode={colorMode}
										isSelected={day.isSelected}
										isToday={day.isToday}
										isOtherMonth={!day.isCurrentMonth}
									>
										{day.date.getDate()}
									</DayText>
								</DayButton>
							))}
						</CalendarGrid>

						<ActionButtons colorMode={colorMode}>
							<ActionButton colorMode={colorMode} variant="secondary" onPress={handleClose}>
								<ActionButtonText colorMode={colorMode} variant="secondary">
									Cancel
								</ActionButtonText>
							</ActionButton>
						</ActionButtons>
					</CalendarPopup>
				</View>
			</Modal>
		</DatePickerContainer>
	);
}
