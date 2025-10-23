import React, { useState } from "react";
import { Pressable } from "react-native";
import { styled, getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import { Input } from "@/components/ui/Input";
import { IconAdd } from "@/assets/icons/IconAdd";
import { IconEditNote, IconDone } from "@/assets/icons";

const OptionsList = styled.View`
	margin-bottom: 16px;
`;

const OptionsHeader = styled.View`
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 12px;
`;

const OptionsTitle = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 16px;
	font-weight: 500;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
`;

const ManageButton = styled.View<{
	colorMode: "light" | "dark";
}>`
	width: 44px;
	height: 44px;
	border-radius: 22px;
	background-color: ${({ colorMode }) => getColor("muted", colorMode)};
	align-items: center;
	justify-content: center;
`;

const ActionButtonsContainer = styled.View`
	flex-direction: row;
	gap: 8px;
`;

const EditableOptionRow = styled.View<{
	colorMode: "light" | "dark";
}>`
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	padding-vertical: 8px;
	border-bottom-width: 1px;
	border-bottom-color: ${({ colorMode }) => getColor("border", colorMode)};
`;

const OptionText = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 14px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
	font-weight: 400;
	flex: 1;
`;

const EditableInput = styled(Input)<{
	colorMode: "light" | "dark";
}>`
	flex: 1;
	margin-right: 8px;
	font-size: 14px;
	padding: 6px 8px;
	min-height: 32px;
`;

const EmptyStateText = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 14px;
	color: ${({ colorMode }) => getColor("mutedForeground", colorMode)};
	font-style: italic;
	text-align: center;
	padding: 16px 0;
`;

const ValidationText = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 12px;
	color: ${({ colorMode }) => getColor("mutedForeground", colorMode)};
	margin-top: 8px;
	text-align: center;
`;

export interface EditableOption {
	id: string;
	title: string;
}

interface EditableOptionsListProps {
	options: EditableOption[];
	onOptionsUpdate?: (options: EditableOption[]) => void;
	title?: string;
	emptyMessage?: string;
	showValidation?: boolean;
	minOptions?: number;
}

export function EditableOptionsList({
	options,
	onOptionsUpdate,
	title = "Options",
	emptyMessage = "No options added yet. Tap the edit button to add some!",
	showValidation = false,
	minOptions = 2,
}: EditableOptionsListProps) {
	const { colorMode } = useTheme();
	const [isEditing, setIsEditing] = useState(false);
	const [editingOptions, setEditingOptions] = useState<EditableOption[]>([]);

	const startEditing = () => {
		setEditingOptions([...options]);
		if (options.length === 0) {
			setEditingOptions([{ id: `temp-${Date.now()}`, title: "" }]);
		}
		setIsEditing(true);
	};

	const finishEditing = () => {
		// Filter out empty options
		const validOptions = editingOptions.filter((opt) => opt.title.trim());

		// Update the parent component with the new options
		if (onOptionsUpdate) {
			onOptionsUpdate(validOptions);
		}

		setIsEditing(false);
	};

	const updateEditingOption = (id: string, title: string) => {
		setEditingOptions((prev) => prev.map((opt) => (opt.id === id ? { ...opt, title } : opt)));
	};

	const addNewEditingOption = () => {
		setEditingOptions((prev) => [
			...prev,
			{
				id: `temp-${Date.now()}`,
				title: "",
			},
		]);
	};

	return (
		<OptionsList>
			<OptionsHeader>
				<OptionsTitle colorMode={colorMode}>{title}</OptionsTitle>
				{isEditing ? (
					<ActionButtonsContainer>
						<Pressable onPress={addNewEditingOption}>
							<ManageButton colorMode={colorMode}>
								<IconAdd size={14} color={getColor("foreground", colorMode)} />
							</ManageButton>
						</Pressable>
						<Pressable onPress={finishEditing}>
							<ManageButton colorMode={colorMode}>
								<IconDone size={14} color={getColor("foreground", colorMode)} />
							</ManageButton>
						</Pressable>
					</ActionButtonsContainer>
				) : (
					<Pressable onPress={startEditing}>
						<ManageButton colorMode={colorMode}>
							<IconEditNote size={14} color={getColor("foreground", colorMode)} />
						</ManageButton>
					</Pressable>
				)}
			</OptionsHeader>

			{isEditing ? (
				<>
					{editingOptions.map((option) => (
						<EditableOptionRow key={option.id} colorMode={colorMode}>
							<EditableInput
								colorMode={colorMode}
								placeholder="Enter option"
								value={option.title}
								onChangeText={(text) => updateEditingOption(option.id, text)}
							/>
						</EditableOptionRow>
					))}

					{showValidation && editingOptions.filter((opt) => opt.title.trim()).length < minOptions && (
						<ValidationText colorMode={colorMode}>Add at least {minOptions} options</ValidationText>
					)}
				</>
			) : (
				<>
					{options.length === 0 ? (
						<EmptyStateText colorMode={colorMode}>{emptyMessage}</EmptyStateText>
					) : (
						options.map((option) => (
							<EditableOptionRow key={option.id} colorMode={colorMode}>
								<OptionText colorMode={colorMode}>{option.title}</OptionText>
							</EditableOptionRow>
						))
					)}
				</>
			)}
		</OptionsList>
	);
}
