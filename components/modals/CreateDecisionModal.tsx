import React, { useState } from "react";
import { View, ScrollView, Pressable } from "react-native";
import { styled, getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import { PrimaryButton, CircleButton } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { DatePickerComponent } from "@/components/ui/DatePicker";
import { Text } from "@/components/ui/Text";
import { IconClose } from "@/assets/icons/IconClose";
import { PlusIcon } from "@/assets/icons/plus";
import { IconTrashCan } from "@/assets/icons/IconTrashCan";

const ModalOverlay = styled.View`
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(0, 0, 0, 0.5);
	justify-content: center;
	align-items: center;
	padding: 20px;
	z-index: 1000;
`;

const ModalContainer = styled.View<{
	colorMode: "light" | "dark";
}>`
	background-color: ${({ colorMode }) => getColor("card", colorMode)};
	border-radius: 12px;
	padding: 24px;
	width: 100%;
	max-width: 400px;
	max-height: 80%;
`;

const ModalHeader = styled.View`
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 24px;
`;

const ModalTitle = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 20px;
	font-weight: bold;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
`;

const CloseButton = styled.View<{
	colorMode: "light" | "dark";
}>`
	width: 44px;
	height: 44px;
	border-radius: 22px;
	background-color: ${({ colorMode }) => getColor("muted", colorMode)};
	align-items: center;
	justify-content: center;
`;

const FormContainer = styled.View`
	gap: 16px;
`;

const FormRow = styled.View`
	flex-direction: row;
	align-items: center;
	gap: 12px;
`;

const FormField = styled.View`
	flex: 1;
`;

const FieldLabel = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 14px;
	font-weight: 500;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
	margin-bottom: 8px;
`;

const ToggleContainer = styled.View<{
	colorMode: "light" | "dark";
}>`
	flex-direction: row;
	background-color: ${({ colorMode }) => getColor("muted", colorMode)};
	border-radius: 8px;
	padding: 4px;
`;

const ToggleOption = styled.View<{
	colorMode: "light" | "dark";
	selected: boolean;
}>`
	flex: 1;
	padding: 8px 16px;
	border-radius: 6px;
	align-items: center;
	background-color: ${({ colorMode, selected }) =>
		selected ? getColor("yellow", colorMode) : "transparent"};
`;

const ToggleText = styled.Text<{
	colorMode: "light" | "dark";
	selected: boolean;
}>`
	font-size: 14px;
	font-weight: 500;
	color: ${({ colorMode, selected }) =>
		selected ? getColor("yellowForeground", colorMode) : getColor("foreground", colorMode)};
`;

const OptionsSection = styled.View`
	margin-top: 8px;
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
	font-weight: 600;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
`;

const AddOptionButton = styled.View<{
	colorMode: "light" | "dark";
}>`
	flex-direction: row;
	align-items: center;
	gap: 8px;
	padding: 8px 12px;
	background-color: ${({ colorMode }) => getColor("muted", colorMode)};
	border-radius: 8px;
`;

const AddOptionText = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 14px;
	font-weight: 500;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
`;

const OptionsList = styled.View`
	gap: 8px;
`;

const OptionItem = styled.View<{
	colorMode: "light" | "dark";
}>`
	flex-direction: row;
	align-items: center;
	gap: 12px;
	padding: 12px;
	background-color: ${({ colorMode }) => getColor("muted", colorMode)};
	border-radius: 8px;
`;

const OptionInput = styled.View`
	flex: 1;
`;

const DeleteOptionButton = styled.View<{
	colorMode: "light" | "dark";
}>`
	width: 44px;
	height: 44px;
	border-radius: 22px;
	background-color: ${({ colorMode }) => getColor("destructive", colorMode)};
	align-items: center;
	justify-content: center;
`;

interface CreateDecisionModalProps {
	visible: boolean;
	onClose: () => void;
	onCreate: (decision: {
		title: string;
		description: string;
		dueDate: string;
		decisionType: "poll" | "vote";
		options: string[];
	}) => void;
}

export function CreateDecisionModal({ visible, onClose, onCreate }: CreateDecisionModalProps) {
	const { colorMode } = useTheme();
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [dueDate, setDueDate] = useState("");
	const [decisionType, setDecisionType] = useState<"poll" | "vote">("vote");
	const [options, setOptions] = useState<string[]>([]);
	const [newOption, setNewOption] = useState("");

	const handleAddOption = () => {
		if (newOption.trim()) {
			setOptions([...options, newOption.trim()]);
			setNewOption("");
		}
	};

	const handleRemoveOption = (index: number) => {
		setOptions(options.filter((_, i) => i !== index));
	};

	const handleCreate = () => {
		if (title.trim() && description.trim() && dueDate.trim() && options.length > 0) {
			onCreate({
				title: title.trim(),
				description: description.trim(),
				dueDate: dueDate.trim(),
				decisionType,
				options,
			});
			// Reset form
			setTitle("");
			setDescription("");
			setDueDate("");
			setDecisionType("poll");
			setOptions([]);
			setNewOption("");
			onClose();
		}
	};

	if (!visible) return null;

	return (
		<ModalOverlay>
			<ModalContainer colorMode={colorMode}>
				<ModalHeader>
					<ModalTitle colorMode={colorMode}>Create Decision</ModalTitle>
					<CircleButton colorMode={colorMode} onPress={onClose}>
						<IconClose size={16} color={getColor("foreground", colorMode)} />
					</CircleButton>
				</ModalHeader>

				<ScrollView showsVerticalScrollIndicator={false}>
					<FormContainer>
						<FormRow>
							<FormField>
								<FieldLabel colorMode={colorMode}>Due date</FieldLabel>
								<DatePickerComponent
									value={dueDate}
									onChange={setDueDate}
									placeholder="Select decision deadline"
								/>
							</FormField>
							<View style={{ width: 120 }}>
								<FieldLabel colorMode={colorMode}>Type</FieldLabel>
								<ToggleContainer colorMode={colorMode}>
									<Pressable onPress={() => setDecisionType("poll")}>
										<ToggleOption colorMode={colorMode} selected={decisionType === "poll"}>
											<ToggleText colorMode={colorMode} selected={decisionType === "poll"}>
												Poll
											</ToggleText>
										</ToggleOption>
									</Pressable>
									<Pressable onPress={() => setDecisionType("vote")}>
										<ToggleOption colorMode={colorMode} selected={decisionType === "vote"}>
											<ToggleText colorMode={colorMode} selected={decisionType === "vote"}>
												Vote
											</ToggleText>
										</ToggleOption>
									</Pressable>
								</ToggleContainer>
							</View>
						</FormRow>

						<FormField>
							<FieldLabel colorMode={colorMode}>Title</FieldLabel>
							<Input placeholder="Enter title of decision" value={title} onChangeText={setTitle} />
						</FormField>

						<FormField>
							<FieldLabel colorMode={colorMode}>Description</FieldLabel>
							<Textarea
								placeholder="Enter description"
								value={description}
								onChangeText={setDescription}
								multiline
								numberOfLines={3}
							/>
						</FormField>

						<OptionsSection>
							<OptionsHeader>
								<OptionsTitle colorMode={colorMode}>Options</OptionsTitle>
								<Pressable onPress={handleAddOption}>
									<AddOptionButton colorMode={colorMode}>
										<PlusIcon size={16} color={getColor("foreground", colorMode)} />
										<AddOptionText colorMode={colorMode}>Add Option</AddOptionText>
									</AddOptionButton>
								</Pressable>
							</OptionsHeader>

							<FormField>
								<Input
									placeholder="Enter option text"
									value={newOption}
									onChangeText={setNewOption}
									onSubmitEditing={handleAddOption}
								/>
							</FormField>

							<OptionsList>
								{options.map((option, index) => (
									<OptionItem key={index} colorMode={colorMode}>
										<OptionInput>
											<Text>{option}</Text>
										</OptionInput>
										<Pressable onPress={() => handleRemoveOption(index)}>
											<DeleteOptionButton colorMode={colorMode}>
												<IconTrashCan size={12} color="white" />
											</DeleteOptionButton>
										</Pressable>
									</OptionItem>
								))}
							</OptionsList>
						</OptionsSection>

						<PrimaryButton colorMode={colorMode} onPress={handleCreate}>
							<Text
								style={{
									color: getColor("yellowForeground", colorMode),
									fontWeight: "500",
									fontSize: 16,
								}}
							>
								Create Decision
							</Text>
						</PrimaryButton>
					</FormContainer>
				</ScrollView>
			</ModalContainer>
		</ModalOverlay>
	);
}
