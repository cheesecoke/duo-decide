import React, { useState } from "react";
import { View, Pressable, Platform } from "react-native";
import DatePicker from "react-native-date-picker";
import { styled, getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import { IconChevronDown } from "@/assets/icons/IconChevronDown";

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
	border: 1px solid ${({ colorMode, focused }) =>
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

const ChevronIcon = styled.View<{
	colorMode: "light" | "dark";
}>`
	margin-left: 8px;
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
			setIsOpen(true);
		}
	};

	const handleClose = () => {
		setIsOpen(false);
		setFocused(false);
	};

	const handleConfirm = (date: Date) => {
		handleDateChange(date);
		handleClose();
	};

	return (
		<DatePickerContainer>
			<Pressable onPress={handlePress} disabled={disabled}>
				<DateInputContainer colorMode={colorMode} focused={focused}>
					<DateInputText colorMode={colorMode} hasValue={!!value}>
						{value ? formatDate(selectedDate) : placeholder}
					</DateInputText>
					<ChevronIcon colorMode={colorMode}>
						<IconChevronDown size={16} color={getColor("mutedForeground", colorMode)} />
					</ChevronIcon>
				</DateInputContainer>
			</Pressable>

			<DatePicker
				modal
				open={isOpen}
				date={selectedDate}
				mode="date"
				onConfirm={handleConfirm}
				onCancel={handleClose}
				minimumDate={minDate || getDefaultMinDate()}
				maximumDate={maxDate || getDefaultMaxDate()}
				theme={colorMode === "dark" ? "dark" : "light"}
				title="Select Date"
				confirmText="Confirm"
				cancelText="Cancel"
			/>
		</DatePickerContainer>
	);
}
