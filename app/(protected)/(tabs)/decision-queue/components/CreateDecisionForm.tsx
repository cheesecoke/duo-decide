import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { styled, getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import { Text } from "@/components/ui/Text";
import { Button, CircleButton, PrimaryButton } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { DatePickerComponent } from "@/components/ui/DatePicker";
import { OptionsDisplay } from "@/components/ui/CollapsibleCard/OptionsDisplay";
import { IconEditNote } from "@/assets/icons/IconEditNote";
import { IconDone } from "@/assets/icons/IconDone";
import { IconClose } from "@/assets/icons/IconClose";
import { IconTrashCan } from "@/assets/icons/IconTrashCan";
import { PlusIcon } from "@/assets/icons/plus";
import type { DecisionOption } from "@/data/mockData";
import type { OptionListWithItems } from "@/types/database";

const FormFieldContainer = styled.View`
	margin-bottom: 16px;
`;

const FieldLabel = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 16px;
	font-weight: 500;
	margin-bottom: 8px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
`;

const ToggleContainer = styled.View`
	flex-direction: row;
	gap: 8px;
	margin-bottom: 16px;
`;

const ToggleButton = styled(Pressable)<{
	colorMode: "light" | "dark";
	active: boolean;
}>`
	flex: 1;
	padding: 12px 16px;
	border-radius: 8px;
	align-items: center;
	background-color: ${({ active, colorMode }) =>
		active ? getColor("yellow", colorMode) : getColor("muted", colorMode)};
	border: 1px solid
		${({ active, colorMode }) =>
			active ? getColor("yellow", colorMode) : getColor("border", colorMode)};
`;

const ToggleButtonText = styled.Text<{
	colorMode: "light" | "dark";
	active: boolean;
}>`
	font-weight: 500;
	color: ${({ active, colorMode }) =>
		active ? getColor("yellowForeground", colorMode) : getColor("foreground", colorMode)};
`;

const OptionListSelector = styled.View<{
	colorMode: "light" | "dark";
}>`
	border: 1px solid ${({ colorMode }) => getColor("border", colorMode)};
	border-radius: 8px;
	background-color: ${({ colorMode }) => getColor("background", colorMode)};
`;

const OptionListSelectorItem = styled.View<{
	colorMode: "light" | "dark";
	isSelected?: boolean;
}>`
	padding: 12px;
	border-bottom-width: 1px;
	border-bottom-color: ${({ colorMode }) => getColor("border", colorMode)};
	background-color: ${({ isSelected, colorMode }) =>
		isSelected ? getColor("muted", colorMode) : "transparent"};
`;

const OptionListSelectorItemText = styled.Text<{
	colorMode: "light" | "dark";
	isSelected?: boolean;
}>`
	font-size: 16px;
	font-weight: ${({ isSelected }) => (isSelected ? "500" : "400")};
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
`;

const ButtonContainer = styled.View`
	flex-direction: row;
	gap: 12px;
	margin-top: 16px;
`;

const OptionsList = styled.View`
	gap: 8px;
	margin-bottom: 16px;
`;

const OptionRow = styled.View`
	flex-direction: row;
	align-items: center;
	gap: 8px;
`;

const OptionInput = styled.View`
	flex: 1;
`;

const ReadOnlyOptionItem = styled.View<{
	colorMode: "light" | "dark";
}>`
	padding: 12px 16px;
	border: 1px solid ${({ colorMode }) => getColor("border", colorMode)};
	border-radius: 6px;
	background-color: ${({ colorMode }) => getColor("background", colorMode)};
`;

const ReadOnlyOptionText = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 14px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
`;

export interface CreateDecisionFormData {
	title: string;
	description: string;
	dueDate: string;
	decisionType: "poll" | "vote";
	selectedOptionListId: string;
	selectedOptions: DecisionOption[];
	customOptions: DecisionOption[];
}

interface Props {
	formData: CreateDecisionFormData;
	onFormDataChange: (data: CreateDecisionFormData) => void;
	onSubmit: () => void;
	onCancel: () => void;
	isEditing: boolean;
	isSubmitting: boolean;
	optionLists: OptionListWithItems[];
}

export function CreateDecisionForm({
	formData,
	onFormDataChange,
	onSubmit,
	onCancel,
	isEditing,
	isSubmitting,
	optionLists,
}: Props) {
	const { colorMode } = useTheme();
	const [isEditingCustomOptions, setIsEditingCustomOptions] = useState(false);
	const [editingCustomOptions, setEditingCustomOptions] = useState<DecisionOption[]>([]);

	const handleOptionListSelect = (listId: string) => {
		const selectedList = optionLists.find((list) => list.id === listId);
		onFormDataChange({
			...formData,
			selectedOptionListId: listId,
			selectedOptions: selectedList
				? selectedList.items.map((opt) => ({ ...opt, selected: false }))
				: [],
		});
	};

	return (
		<>
			<FormFieldContainer>
				<FieldLabel colorMode={colorMode}>Title</FieldLabel>
				<Input
					placeholder="Enter title of decision"
					value={formData.title}
					onChangeText={(text) => onFormDataChange({ ...formData, title: text })}
				/>
			</FormFieldContainer>

			<FormFieldContainer>
				<FieldLabel colorMode={colorMode}>Description</FieldLabel>
				<Textarea
					placeholder="Enter description"
					value={formData.description}
					onChangeText={(text) => onFormDataChange({ ...formData, description: text })}
					style={{ minHeight: 96 }}
				/>
			</FormFieldContainer>

			<FormFieldContainer>
				<FieldLabel colorMode={colorMode}>Due date</FieldLabel>
				<DatePickerComponent
					value={formData.dueDate}
					onChange={(date) => onFormDataChange({ ...formData, dueDate: date })}
					placeholder="Select decision deadline"
				/>
			</FormFieldContainer>

			<ToggleContainer>
				<ToggleButton
					colorMode={colorMode}
					active={formData.decisionType === "poll"}
					onPress={() => onFormDataChange({ ...formData, decisionType: "poll" })}
				>
					<ToggleButtonText colorMode={colorMode} active={formData.decisionType === "poll"}>
						Poll
					</ToggleButtonText>
				</ToggleButton>
				<ToggleButton
					colorMode={colorMode}
					active={formData.decisionType === "vote"}
					onPress={() => onFormDataChange({ ...formData, decisionType: "vote" })}
				>
					<ToggleButtonText colorMode={colorMode} active={formData.decisionType === "vote"}>
						Vote
					</ToggleButtonText>
				</ToggleButton>
			</ToggleContainer>

			{optionLists.length > 0 ? (
				<FormFieldContainer>
					<FieldLabel colorMode={colorMode}>Load from Option List</FieldLabel>
					<OptionListSelector colorMode={colorMode}>
						{optionLists.map((list) => (
							<Pressable key={list.id} onPress={() => handleOptionListSelect(list.id)}>
								<OptionListSelectorItem
									colorMode={colorMode}
									isSelected={formData.selectedOptionListId === list.id}
								>
									<OptionListSelectorItemText
										colorMode={colorMode}
										isSelected={formData.selectedOptionListId === list.id}
									>
										{list.title}
									</OptionListSelectorItemText>
								</OptionListSelectorItem>
							</Pressable>
						))}
					</OptionListSelector>
				</FormFieldContainer>
			) : (
				<FormFieldContainer>
					<FieldLabel colorMode={colorMode}>Load from Option List</FieldLabel>
					<Text style={{ color: getColor("mutedForeground", colorMode), fontSize: 14 }}>
						No option lists available
					</Text>
				</FormFieldContainer>
			)}

			{formData.selectedOptionListId && (
				<FormFieldContainer>
					<FieldLabel colorMode={colorMode}>
						Select Options from {optionLists.find((l) => l.id === formData.selectedOptionListId)?.title}
					</FieldLabel>
					<OptionsDisplay
						options={formData.selectedOptions}
						onOptionPress={(optionId) => {
							onFormDataChange({
								...formData,
								selectedOptions: formData.selectedOptions.map((opt) =>
									opt.id === optionId ? { ...opt, selected: !opt.selected } : opt,
								),
							});
						}}
						radioColor={getColor("yellow", colorMode)}
						disabled={false}
						mode="vote"
					/>
				</FormFieldContainer>
			)}

			<FormFieldContainer>
				<View
					style={{
						flexDirection: "row",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: 8,
					}}
				>
					<FieldLabel colorMode={colorMode} style={{ marginBottom: 0 }}>
						Custom Options
					</FieldLabel>
					{formData.customOptions.length > 0 && (
						<View style={{ flexDirection: "row", gap: 8 }}>
							{isEditingCustomOptions ? (
								<>
									<CircleButton
										colorMode={colorMode}
										onPress={() => {
											setEditingCustomOptions([...formData.customOptions]);
											setIsEditingCustomOptions(false);
										}}
									>
										<IconClose size={14} color={getColor("destructive", colorMode)} />
									</CircleButton>
									<CircleButton
										colorMode={colorMode}
										onPress={() => {
											const validOptions = editingCustomOptions.filter((opt) => opt.title.trim() !== "");
											onFormDataChange({ ...formData, customOptions: validOptions });
											setIsEditingCustomOptions(false);
										}}
									>
										<IconDone size={14} color={getColor("success", colorMode)} />
									</CircleButton>
								</>
							) : (
								<CircleButton
									colorMode={colorMode}
									onPress={() => {
										setEditingCustomOptions([...formData.customOptions]);
										setIsEditingCustomOptions(true);
									}}
								>
									<IconEditNote size={14} color={getColor("foreground", colorMode)} />
								</CircleButton>
							)}
						</View>
					)}
				</View>

				{formData.customOptions.length > 0 ? (
					<>
						<OptionsList>
							{(isEditingCustomOptions ? editingCustomOptions : formData.customOptions).map(
								(option, index) =>
									isEditingCustomOptions ? (
										<OptionRow key={option.id}>
											<OptionInput>
												<Input
													placeholder="Enter option"
													value={option.title}
													onChangeText={(text) => {
														setEditingCustomOptions((prev) =>
															prev.map((opt, i) => (i === index ? { ...opt, title: text } : opt)),
														);
													}}
													onBlur={() => {
														const validOptions = editingCustomOptions.filter((opt) => opt.title.trim() !== "");
														if (validOptions.length > 0) {
															onFormDataChange({ ...formData, customOptions: validOptions });
														}
													}}
												/>
											</OptionInput>
											<CircleButton
												colorMode={colorMode}
												onPress={() => {
													setEditingCustomOptions((prev) => prev.filter((_, i) => i !== index));
												}}
											>
												<IconTrashCan size={16} color={getColor("destructive", colorMode)} />
											</CircleButton>
										</OptionRow>
									) : (
										<ReadOnlyOptionItem key={option.id} colorMode={colorMode}>
											<ReadOnlyOptionText colorMode={colorMode}>{option.title}</ReadOnlyOptionText>
										</ReadOnlyOptionItem>
									),
							)}
						</OptionsList>
						{isEditingCustomOptions && (
							<PrimaryButton
								colorMode={colorMode}
								onPress={() => {
									setEditingCustomOptions((prev) => [
										...prev,
										{
											id: `temp-${Date.now()}`,
											title: "",
											selected: false,
										},
									]);
								}}
								style={{ marginTop: 8 }}
							>
								<PlusIcon size={16} color={getColor("yellowForeground", colorMode)} />
								<Text
									style={{
										color: getColor("yellowForeground", colorMode),
										fontWeight: "500",
										fontSize: 16,
										marginLeft: 8,
									}}
								>
									Add Custom Option
								</Text>
							</PrimaryButton>
						)}
					</>
				) : (
					<PrimaryButton
						colorMode={colorMode}
						onPress={() => {
							const newOption = {
								id: `temp-${Date.now()}`,
								title: "",
								selected: false,
							};
							onFormDataChange({ ...formData, customOptions: [newOption] });
							setEditingCustomOptions([newOption]);
							setIsEditingCustomOptions(true);
						}}
					>
						<PlusIcon size={16} color={getColor("yellowForeground", colorMode)} />
						<Text
							style={{
								color: getColor("yellowForeground", colorMode),
								fontWeight: "500",
								fontSize: 16,
								marginLeft: 8,
							}}
						>
							Add Custom Option
						</Text>
					</PrimaryButton>
				)}
			</FormFieldContainer>

			<ButtonContainer>
				<Button variant="outline" onPress={onCancel}>
					Cancel
				</Button>
				<PrimaryButton
					colorMode={colorMode}
					onPress={onSubmit}
					disabled={isSubmitting || !formData.title.trim()}
					style={{
						opacity: isSubmitting || !formData.title.trim() ? 0.6 : 1,
					}}
				>
					<Text
						style={{
							color: getColor("yellowForeground", colorMode),
							fontWeight: "500",
							fontSize: 16,
						}}
					>
						{isSubmitting ? "Creating..." : isEditing ? "Update Decision" : "Create Decision"}
					</Text>
				</PrimaryButton>
			</ButtonContainer>
		</>
	);
}
