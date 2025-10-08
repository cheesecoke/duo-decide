import React from "react";
import { useTheme } from "@/context/theme-provider";
import { EditableOptionRow, EditableInput, ValidationText } from "./CollapsibleCard.styles";

interface DecisionOption {
	id: string;
	title: string;
	selected: boolean;
}

interface EditableOptionsListProps {
	options: DecisionOption[];
	onUpdateOption: (id: string, title: string) => void;
}

export function EditableOptionsList({ options, onUpdateOption }: EditableOptionsListProps) {
	const { colorMode } = useTheme();
	const validOptionCount = options.filter((opt) => opt.title.trim()).length;
	const needsMoreOptions = validOptionCount < 2;

	return (
		<>
			{options.map((option) => (
				<EditableOptionRow key={option.id} colorMode={colorMode}>
					<EditableInput
						colorMode={colorMode}
						placeholder="Enter option"
						value={option.title}
						onChangeText={(text) => onUpdateOption(option.id, text)}
					/>
				</EditableOptionRow>
			))}

			{needsMoreOptions && (
				<ValidationText colorMode={colorMode}>Add at least 2 options to avoid bias</ValidationText>
			)}
		</>
	);
}
