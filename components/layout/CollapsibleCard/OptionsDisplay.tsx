import React from "react";
import { View, Pressable } from "react-native";
import { getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import { IconRadioButtonChecked } from "@/assets/icons/IconRadioButtonChecked";
import { IconRadioButtonUnchecked } from "@/assets/icons/IconRadioButtonUnchecked";
import {
	EmptyStateText,
	ValidationText,
	OptionItem,
	OptionText,
	RadioButton,
	ReusableOptionsList,
	ReusableOptionItem,
	ReusableOptionText,
} from "./CollapsibleCard.styles";

interface DecisionOption {
	id: string;
	title: string;
	selected: boolean;
}

interface OptionsDisplayProps {
	options: DecisionOption[];
	onOptionPress: (optionId: string) => void;
	radioColor?: string;
	disabled?: boolean;
	mode?: "vote" | "poll";
}

export function OptionsDisplay({ options, onOptionPress, radioColor, disabled = false, mode }: OptionsDisplayProps) {
	const { colorMode } = useTheme();

	// No options at all
	if (options.length === 0) {
		return <EmptyStateText colorMode={colorMode}>Please add options</EmptyStateText>;
	}

	// Only one option - show validation message
	if (options.length < 2) {
		const validationMessage = mode === "vote" ? "Add more than one option" : "Add at least 2 options to avoid bias";

		return (
			<>
				{options.map((option) => (
					<View key={option.id}>
						<OptionItem colorMode={colorMode}>
							<OptionText colorMode={colorMode} selected={false}>
								{option.title}
							</OptionText>
							<RadioButton>
								<IconRadioButtonUnchecked size={20} color={getColor("mutedForeground", colorMode)} />
							</RadioButton>
						</OptionItem>
					</View>
				))}
				<ValidationText colorMode={colorMode}>{validationMessage}</ValidationText>
			</>
		);
	}

	// Multiple options - show as interactive list
	return (
		<ReusableOptionsList>
			{options.map((option) => (
				<Pressable
					key={option.id}
					onPress={() => !disabled && onOptionPress(option.id)}
					disabled={disabled}
					style={{ opacity: disabled ? 0.6 : 1 }}
				>
					<ReusableOptionItem colorMode={colorMode}>
						<ReusableOptionText colorMode={colorMode} selected={option.selected}>
							{option.title}
						</ReusableOptionText>
						<RadioButton>
							{option.selected ? (
								<IconRadioButtonChecked size={20} color={radioColor || getColor("ring", colorMode)} />
							) : (
								<IconRadioButtonUnchecked size={20} color={getColor("ring", colorMode)} />
							)}
						</RadioButton>
					</ReusableOptionItem>
				</Pressable>
			))}
		</ReusableOptionsList>
	);
}
