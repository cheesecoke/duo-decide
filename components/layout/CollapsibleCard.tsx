import React, { useState, useRef } from "react";
import { View, Pressable, Animated } from "react-native";
import { Text } from "@/components/ui/Text";
import { Input } from "@/components/ui/Input";
import { PrimaryButton, CircleButton } from "@/components/ui/Button";
import { styled, getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import { IconChevronUp } from "@/assets/icons/IconChevronUp";
import { IconChevronDown } from "@/assets/icons/IconChevronDown";
import { IconThumbUpAlt } from "@/assets/icons/IconThumbUpAlt";
import { IconTrashCan } from "@/assets/icons/IconTrashCan";
import { IconRadioButtonChecked } from "@/assets/icons/IconRadioButtonChecked";
import { IconRadioButtonUnchecked } from "@/assets/icons/IconRadioButtonUnchecked";
import { IconAdd } from "@/assets/icons/IconAdd";
import { IconEditNote } from "@/assets/icons/IconEditNote";
import { IconDone } from "@/assets/icons/IconDone";

const CardContainer = styled.View<{
	colorMode: "light" | "dark";
	expanded: boolean;
}>`
	background-color: ${({ colorMode }) => getColor("card", colorMode)};
	border-radius: 8px;
	padding: 16px;
	border: 1px solid ${({ colorMode }) => getColor("border", colorMode)};
	shadow-color: #000;
	shadow-offset: 0px 2px;
	shadow-opacity: 0.1;
	shadow-radius: 4px;
	elevation: 2;
`;

const CardHeader = styled.View`
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 12px;
`;

const HeaderContent = styled.View`
	flex: 1;
`;

const CardTitle = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 18px;
	font-weight: 600;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
	margin-bottom: 4px;
`;

const CardMeta = styled.View`
	flex-direction: row;
	gap: 16px;
`;

const MetaText = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 14px;
	color: ${({ colorMode }) => getColor("mutedForeground", colorMode)};
`;

const StatusBadge = styled.View<{
	colorMode: "light" | "dark";
	status: "pending" | "voted" | "completed";
}>`
	padding: 4px 8px;
	border-radius: 12px;
	background-color: ${({ status, colorMode }) => {
		switch (status) {
			case "completed":
				return getColor("green", colorMode);
			case "voted":
				return getColor("yellow", colorMode);
			default:
				return getColor("muted", colorMode);
		}
	}};
`;

const StatusText = styled.Text<{
	colorMode: "light" | "dark";
	status: "pending" | "voted" | "completed";
}>`
	font-size: 12px;
	font-weight: 500;
	color: ${({ status, colorMode }) => {
		switch (status) {
			case "completed":
				return getColor("greenForeground", colorMode);
			case "voted":
				return getColor("yellowForeground", colorMode);
			default:
				return getColor("mutedForeground", colorMode);
		}
	}};
`;

const ExpandButton = styled.View<{
	colorMode: "light" | "dark";
}>`
	width: 44px;
	height: 44px;
	border-radius: 22px;
	align-items: center;
	justify-content: center;
`;

const ExpandedContent = styled.View`
	margin-top: 16px;
`;

const DetailsText = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 14px;
	color: ${({ colorMode }) => getColor("mutedForeground", colorMode)};
	line-height: 20px;
	margin-bottom: 16px;
`;

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

const ActionButtonsContainer = styled.View`
	flex-direction: row;
	gap: 8px;
`;

const OptionItem = styled.View<{
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
	selected: boolean;
}>`
	font-size: 14px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
	font-weight: 400;
	flex: 1;
`;

const RadioButton = styled.View`
	width: 20px;
	height: 20px;
	align-items: center;
	justify-content: center;
`;

const ActionButtons = styled.View`
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
`;

const DecideButton = styled.View`
	flex-direction: row;
	align-items: center;
	gap: 8px;
`;

const DisabledButton = styled.View<{
	colorMode: "light" | "dark";
}>`
	background-color: ${({ colorMode }) => getColor("muted", colorMode)};
	border-radius: 20px;
	height: 40px;
	padding-horizontal: 16px;
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	gap: 8px;
	opacity: 0.5;
`;

interface DecisionOption {
	id: string;
	title: string;
	selected: boolean;
}

interface CollapsibleCardProps {
	title: string;
	createdBy: string;
	deadline: string;
	details: string;
	options: DecisionOption[];
	expanded: boolean;
	status?: "pending" | "voted" | "completed";
	decidedBy?: string;
	decidedAt?: string;
	loading?: boolean;
	onToggle: () => void;
	onDecide: (optionId: string) => void;
	onDelete: () => void;
	onOptionSelect: (optionId: string) => void;
	onUpdateOptions?: (options: DecisionOption[]) => void;
}

export function CollapsibleCard({
	title,
	createdBy,
	deadline,
	details,
	options,
	expanded,
	status = "pending",
	decidedBy,
	decidedAt,
	loading = false,
	onToggle,
	onDecide,
	onDelete,
	onOptionSelect,
	onUpdateOptions,
}: CollapsibleCardProps) {
	const { colorMode } = useTheme();
	const hasSelectedOption = options.some((option) => option.selected);
	const hasMinimumOptions = options.length >= 2;
	const canDecide = hasSelectedOption && hasMinimumOptions && status === "pending";
	const [isEditing, setIsEditing] = useState(false);
	const [editingOptions, setEditingOptions] = useState<DecisionOption[]>([]);

	const handleDecide = () => {
		const selectedOption = options.find((option) => option.selected);
		if (selectedOption) {
			onDecide(selectedOption.id);
		}
	};

	const startEditing = () => {
		setEditingOptions([...options]);
		if (options.length === 0) {
			setEditingOptions([{ id: `temp-${Date.now()}`, title: "", selected: false }]);
		}
		setIsEditing(true);
	};

	const finishEditing = () => {
		// Filter out empty options
		const validOptions = editingOptions.filter((opt) => opt.title.trim());

		// Update the parent component with the new options
		if (onUpdateOptions) {
			onUpdateOptions(validOptions);
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
				selected: false,
			},
		]);
	};

	return (
		<CardContainer colorMode={colorMode} expanded={expanded}>
			<CardHeader>
				<HeaderContent>
					<CardTitle colorMode={colorMode}>{title}</CardTitle>
					<CardMeta>
						<MetaText colorMode={colorMode}>Created by: {createdBy}</MetaText>
						<MetaText colorMode={colorMode}>Deadline: {deadline}</MetaText>
						<StatusBadge colorMode={colorMode} status={status}>
							<StatusText colorMode={colorMode} status={status}>
								{status === "completed" ? "Decided" : status === "voted" ? "Voted" : "Pending"}
							</StatusText>
						</StatusBadge>
					</CardMeta>
				</HeaderContent>
				<Pressable onPress={onToggle}>
					<ExpandButton colorMode={colorMode}>
						{expanded ? (
							<IconChevronUp size={16} color={getColor("foreground", colorMode)} />
						) : (
							<IconChevronDown size={16} color={getColor("foreground", colorMode)} />
						)}
					</ExpandButton>
				</Pressable>
			</CardHeader>

			{expanded && (
				<ExpandedContent>
					<DetailsText colorMode={colorMode}>{details}</DetailsText>

					<OptionsList>
						<OptionsHeader>
							<OptionsTitle colorMode={colorMode}>Options</OptionsTitle>
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

								{editingOptions.filter((opt) => opt.title.trim()).length < 2 && (
									<ValidationText colorMode={colorMode}>Add at least 2 options to avoid bias</ValidationText>
								)}
							</>
						) : (
							<>
								{options.length === 0 ? (
									<EmptyStateText colorMode={colorMode}>Please add options</EmptyStateText>
								) : options.length < 2 ? (
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
										<ValidationText colorMode={colorMode}>Add more than one option</ValidationText>
									</>
								) : (
									options.map((option) => (
										<Pressable key={option.id} onPress={() => onOptionSelect(option.id)}>
											<OptionItem colorMode={colorMode}>
												<OptionText colorMode={colorMode} selected={option.selected}>
													{option.title}
												</OptionText>
												<RadioButton>
													{option.selected ? (
														<IconRadioButtonChecked size={20} color={getColor("ring", colorMode)} />
													) : (
														<IconRadioButtonUnchecked size={20} color={getColor("ring", colorMode)} />
													)}
												</RadioButton>
											</OptionItem>
										</Pressable>
									))
								)}
							</>
						)}
					</OptionsList>

					<ActionButtons>
						<DecideButton>
							{status === "completed" ? (
								<DisabledButton colorMode={colorMode}>
									<IconThumbUpAlt size={16} color={getColor("green", colorMode)} />
									<Text
										style={{
											color: getColor("green", colorMode),
											fontWeight: "500",
											fontSize: 14,
										}}
									>
										Decided by {decidedBy}
									</Text>
								</DisabledButton>
							) : status === "voted" ? (
								<DisabledButton colorMode={colorMode}>
									<IconThumbUpAlt size={16} color={getColor("yellow", colorMode)} />
									<Text
										style={{
											color: getColor("yellow", colorMode),
											fontWeight: "500",
											fontSize: 14,
										}}
									>
										Waiting for partner
									</Text>
								</DisabledButton>
							) : canDecide ? (
								<PrimaryButton 
									colorMode={colorMode} 
									onPress={handleDecide}
									disabled={loading}
									style={{ opacity: loading ? 0.6 : 1 }}
								>
									<IconThumbUpAlt size={16} color={getColor("yellowForeground", colorMode)} />
									<Text
										style={{
											color: getColor("yellowForeground", colorMode),
											fontWeight: "500",
											fontSize: 14,
										}}
									>
										{loading ? "Deciding..." : "Decide"}
									</Text>
								</PrimaryButton>
							) : (
								<DisabledButton colorMode={colorMode}>
									<IconThumbUpAlt size={16} color={getColor("mutedForeground", colorMode)} />
									<Text
										style={{
											color: getColor("mutedForeground", colorMode),
											fontWeight: "500",
											fontSize: 14,
										}}
									>
										{!hasMinimumOptions ? "Need 2+ options" : "Select option"}
									</Text>
								</DisabledButton>
							)}
						</DecideButton>

						<CircleButton colorMode={colorMode} onPress={onDelete}>
							<IconTrashCan size={16} color={getColor("destructive", colorMode)} />
						</CircleButton>
					</ActionButtons>
				</ExpandedContent>
			)}
		</CardContainer>
	);
}
