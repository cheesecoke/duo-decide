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
import { IconPoll } from "@/assets/icons/IconPoll";
import { IconClose } from "@/assets/icons/IconClose";
import { Textarea } from "@/components/ui/Textarea";
import { DatePickerComponent } from "@/components/ui/DatePicker";
import { USERS } from "@/data/mockData";

const CardContainer = styled.View<{
	colorMode: "light" | "dark";
	expanded: boolean;
	mode?: "vote" | "poll";
	round?: number;
	hasSelectedOption?: boolean;
	pollVotes?: Record<string, string>;
	status?: "pending" | "voted" | "completed";
}>`
	background-color: ${({ colorMode }) => getColor("card", colorMode)};
	border-radius: 8px;
	padding: 16px;
	border: ${({ colorMode, mode, round, hasSelectedOption, pollVotes, status }) => {
		// For poll mode, use success green when completed, otherwise use round color
		if (mode === "poll") {
			let borderColor;
			if (status === "completed") {
				borderColor = getColor("success", colorMode);
			} else {
				switch (round) {
					case 1:
						borderColor = getColor("round1", colorMode);
						break;
					case 2:
						borderColor = getColor("round2", colorMode);
						break;
					case 3:
						borderColor = getColor("round3", colorMode);
						break;
					default:
						borderColor = getColor("success", colorMode);
				}
			}

			return `1px solid ${borderColor}`;
		}
		// For vote mode, use green when decided, yellow when pending
		return `1px solid ${status === "completed" ? getColor("green", colorMode) : getColor("yellow", colorMode)}`;
	}};
	shadow-color: #000;
	shadow-offset: 0px 2px;
	shadow-opacity: 0.1;
	shadow-radius: 4px;
	elevation: 2;
`;

const CardHeader = styled.View`
	margin-bottom: 12px;
`;

const TopRow = styled.View`
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 8px;
`;

const TitleRow = styled.View`
	flex-direction: row;
	align-items: center;
	gap: 8px;
	flex: 1;
`;

const StatusContainer = styled.View`
	flex-direction: row;
	align-items: center;
	gap: 8px;
`;

const BottomRow = styled.View`
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
`;

const CardTitle = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 18px;
	font-weight: 600;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
	flex: 1;
`;

const CardMeta = styled.View`
	flex-direction: row;
	gap: 16px;
	align-items: center;
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

const RoundIndicator = styled.View<{
	colorMode: "light" | "dark";
	round: number;
}>`
	padding: 4px 8px;
	border-radius: 12px;
	background-color: ${({ round, colorMode }) => {
		switch (round) {
			case 1:
				return getColor("round1", colorMode);
			case 2:
				return getColor("round2", colorMode);
			case 3:
				return getColor("round3", colorMode);
			default:
				return getColor("success", colorMode);
		}
	}};
`;

const RoundText = styled.Text`
	font-size: 12px;
	font-weight: 500;
	color: white;
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

// Poll-specific components
const PollVotingContainer = styled.View`
	margin-bottom: 16px;
`;

const PollVotingHeader = styled.View`
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 12px;
`;

const PollVotingTitle = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 16px;
	font-weight: 600;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
`;

const VotingStatusContainer = styled.View`
	flex-direction: row;
	align-items: center;
	gap: 8px;
`;

// Reusable Options List Component
const ReusableOptionsList = styled.View`
	margin-bottom: 16px;
`;

const ReusableOptionItem = styled.View<{
	colorMode: "light" | "dark";
}>`
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	padding-vertical: 8px;
	border-bottom-width: 1px;
	border-bottom-color: ${({ colorMode }) => getColor("border", colorMode)};
`;

const ReusableOptionText = styled.Text<{
	colorMode: "light" | "dark";
	selected: boolean;
}>`
	font-size: 14px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
	font-weight: 400;
	flex: 1;
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
	mode?: "vote" | "poll";
	currentRound?: 1 | 2 | 3;
	pollVotes?: Record<string, string>; // userId -> optionId for current round
	onToggle: () => void;
	onDecide: (optionId: string) => void;
	onDelete: () => void;
	onOptionSelect: (optionId: string) => void;
	onUpdateOptions?: (options: DecisionOption[]) => void;
	onPollVote?: (optionId: string) => void;
	onEditDecision?: () => void;
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
	mode = "vote",
	currentRound = 1,
	pollVotes = {},
	onToggle,
	onDecide,
	onDelete,
	onOptionSelect,
	onUpdateOptions,
	onPollVote,
	onEditDecision,
}: CollapsibleCardProps) {
	const { colorMode } = useTheme();
	const isCreator = createdBy === USERS.YOU;
	const hasSelectedOption = options.some((option) => option.selected);
	const hasMinimumOptions = options.length >= 2;
	const canDecide =
		hasSelectedOption &&
		hasMinimumOptions &&
		(status === "pending" || (status === "voted" && !isCreator));
	const [isEditing, setIsEditing] = useState(false);
	const [editingOptions, setEditingOptions] = useState<DecisionOption[]>([]);
	const [editingTitle, setEditingTitle] = useState(title);
	const [editingDetails, setEditingDetails] = useState(details);
	const [editingDeadline, setEditingDeadline] = useState(deadline);

	const handleDecide = () => {
		const selectedOption = options.find((option) => option.selected);
		if (selectedOption) {
			onDecide(selectedOption.id);
		}
	};

	const finishEditing = () => {
		// Filter out empty options
		const validOptions = editingOptions.filter((opt) => opt.title.trim());

		// Update the parent component with the new options
		if (onUpdateOptions) {
			onUpdateOptions(validOptions);
		}
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

	const startInlineEditing = () => {
		setEditingTitle(title);
		setEditingDetails(details);
		setEditingDeadline(deadline);
		setEditingOptions([...options]);
		setIsEditing(true);

		// Force the card to expand when entering edit mode
		if (!expanded) {
			onToggle();
		}
	};

	const saveInlineEditing = () => {
		// Call the onEditDecision callback with the updated data
		if (onEditDecision) {
			onEditDecision();
		}
		setIsEditing(false);
	};

	const cancelInlineEditing = () => {
		setEditingTitle(title);
		setEditingDetails(details);
		setEditingDeadline(deadline);
		setEditingOptions([...options]);
		setIsEditing(false);
	};

	// Reusable options list component
	const renderOptionsList = (
		optionsToRender: DecisionOption[],
		onOptionPress: (optionId: string) => void,
		radioColor?: string,
		disabled?: boolean,
	) => {
		return (
			<ReusableOptionsList>
				{optionsToRender.map((option) => (
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
	};

	return (
		<CardContainer
			colorMode={colorMode}
			expanded={expanded}
			mode={mode}
			round={currentRound}
			hasSelectedOption={hasSelectedOption}
			pollVotes={pollVotes}
			status={status}
		>
			<CardHeader>
				<TopRow>
					<TitleRow>
						{mode === "poll" && (
							<IconPoll
								size={16}
								color={
									status === "completed"
										? getColor("success", colorMode)
										: currentRound === 1
											? getColor("round1", colorMode)
											: currentRound === 2
												? getColor("round2", colorMode)
												: currentRound === 3
													? getColor("round3", colorMode)
													: getColor("success", colorMode)
								}
							/>
						)}
						{isEditing ? (
							<Input
								placeholder="Enter title"
								value={editingTitle}
								onChangeText={setEditingTitle}
								style={{
									flex: 1,
									fontSize: 18,
									fontWeight: "600",
									paddingVertical: 8,
									paddingHorizontal: 12,
								}}
							/>
						) : (
							<CardTitle colorMode={colorMode}>{title}</CardTitle>
						)}
					</TitleRow>
					<StatusContainer>
						{isCreator && onEditDecision && status === "pending" && !isEditing && (
							<Pressable onPress={startInlineEditing} style={{ marginRight: 8 }}>
								<ExpandButton colorMode={colorMode}>
									<IconEditNote size={16} color={getColor("foreground", colorMode)} />
								</ExpandButton>
							</Pressable>
						)}
						{isCreator && onEditDecision && status === "pending" && isEditing && (
							<View style={{ flexDirection: "row", gap: 8, marginRight: 8 }}>
								<Pressable onPress={cancelInlineEditing}>
									<ExpandButton colorMode={colorMode}>
										<IconClose size={16} color={getColor("destructive", colorMode)} />
									</ExpandButton>
								</Pressable>
								<Pressable onPress={saveInlineEditing}>
									<ExpandButton colorMode={colorMode}>
										<IconDone size={16} color={getColor("success", colorMode)} />
									</ExpandButton>
								</Pressable>
							</View>
						)}
						{mode === "poll" ? (
							<StatusBadge
								colorMode={colorMode}
								status={status}
								style={{
									backgroundColor:
										status === "completed"
											? getColor("success", colorMode)
											: currentRound === 1
												? getColor("round1", colorMode)
												: currentRound === 2
													? getColor("round2", colorMode)
													: currentRound === 3
														? getColor("round3", colorMode)
														: getColor("success", colorMode),
								}}
							>
								<StatusText colorMode={colorMode} status={status} style={{ color: "white" }}>
									{status === "completed"
										? "Decided"
										: pollVotes?.[USERS.YOU] !== undefined && pollVotes?.[USERS.PARTNER] !== undefined
											? `Round ${currentRound} Complete`
											: pollVotes?.[USERS.YOU] !== undefined
												? "Waiting"
												: `Round ${currentRound}`}
								</StatusText>
							</StatusBadge>
						) : (
							<StatusBadge colorMode={colorMode} status={status}>
								<StatusText colorMode={colorMode} status={status}>
									{status === "completed" ? "Decided" : status === "voted" ? "Vote" : "Pending"}
								</StatusText>
							</StatusBadge>
						)}
					</StatusContainer>
				</TopRow>
				<BottomRow>
					<CardMeta>
						<MetaText colorMode={colorMode}>Created by: {createdBy}</MetaText>
						{isEditing ? (
							<DatePickerComponent
								value={editingDeadline}
								onChange={setEditingDeadline}
								placeholder="Select deadline"
							/>
						) : (
							<MetaText colorMode={colorMode}>Deadline: {deadline}</MetaText>
						)}
					</CardMeta>
					<Pressable onPress={onToggle}>
						<ExpandButton colorMode={colorMode}>
							{expanded ? (
								<IconChevronUp size={16} color={getColor("foreground", colorMode)} />
							) : (
								<IconChevronDown size={16} color={getColor("foreground", colorMode)} />
							)}
						</ExpandButton>
					</Pressable>
				</BottomRow>
			</CardHeader>

			{expanded && (
				<ExpandedContent>
					{isEditing ? (
						<Textarea
							placeholder="Enter description"
							value={editingDetails}
							onChangeText={setEditingDetails}
							multiline
							numberOfLines={3}
							style={{
								minHeight: 80,
								fontSize: 14,
								lineHeight: 20,
								marginBottom: 16,
								paddingVertical: 8,
								paddingHorizontal: 12,
							}}
						/>
					) : (
						<DetailsText colorMode={colorMode}>{details}</DetailsText>
					)}

					{mode === "poll" && (
						<PollVotingContainer>
							<PollVotingHeader>
								<PollVotingTitle colorMode={colorMode}>Round {currentRound}:</PollVotingTitle>
								<View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
									<VotingStatusContainer>
										<View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
											<Text style={{ fontSize: 14, color: getColor("foreground", colorMode) }}>
												{USERS.YOU}:
											</Text>
											{currentRound === 3 && createdBy === USERS.YOU ? (
												<IconClose
													size={14}
													color={
														status === "completed"
															? getColor("success", colorMode)
															: getColor("round3", colorMode)
													}
												/>
											) : pollVotes[USERS.YOU] !== undefined ? (
												<IconDone
													size={14}
													color={
														status === "completed"
															? getColor("success", colorMode)
															: currentRound === 1
																? getColor("round1", colorMode)
																: currentRound === 2
																	? getColor("round2", colorMode)
																	: currentRound === 3
																		? getColor("round3", colorMode)
																		: getColor("success", colorMode)
													}
												/>
											) : (
												<IconThumbUpAlt
													size={14}
													color={
														status === "completed"
															? getColor("success", colorMode)
															: hasSelectedOption
																? currentRound === 1
																	? getColor("round1", colorMode)
																	: currentRound === 2
																		? getColor("round2", colorMode)
																		: currentRound === 3
																			? getColor("round3", colorMode)
																			: getColor("success", colorMode)
																: getColor("mutedForeground", colorMode)
													}
												/>
											)}
										</View>
										<View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
											<Text style={{ fontSize: 14, color: getColor("foreground", colorMode) }}>
												{USERS.PARTNER}:
											</Text>
											{currentRound === 3 && createdBy === USERS.PARTNER ? (
												<IconClose
													size={14}
													color={
														status === "completed"
															? getColor("success", colorMode)
															: getColor("round3", colorMode)
													}
												/>
											) : (
												<IconThumbUpAlt
													size={14}
													color={
														status === "completed"
															? getColor("success", colorMode)
															: pollVotes[USERS.PARTNER] !== undefined
																? currentRound === 1
																	? getColor("round1", colorMode)
																	: currentRound === 2
																		? getColor("round2", colorMode)
																		: currentRound === 3
																			? getColor("round3", colorMode)
																			: getColor("success", colorMode)
																: getColor("mutedForeground", colorMode)
													}
												/>
											)}
										</View>
									</VotingStatusContainer>
									{createdBy === USERS.YOU && isEditing && (
										<Pressable onPress={addNewEditingOption}>
											<ManageButton colorMode={colorMode}>
												<IconAdd size={14} color={getColor("foreground", colorMode)} />
											</ManageButton>
										</Pressable>
									)}
								</View>
							</PollVotingHeader>

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
										<ValidationText colorMode={colorMode}>
											Add at least 2 options to avoid bias
										</ValidationText>
									)}
								</>
							) : (
								<>
									{options.length === 0 ? (
										<EmptyStateText colorMode={colorMode}>Please add options</EmptyStateText>
									) : options.length < 2 ? (
										<>
											{renderOptionsList(
												options,
												(optionId) => onPollVote?.(optionId),
												status === "completed"
													? getColor("success", colorMode)
													: currentRound === 1
														? getColor("round1", colorMode)
														: currentRound === 2
															? getColor("round2", colorMode)
															: currentRound === 3
																? getColor("round3", colorMode)
																: getColor("success", colorMode),
												pollVotes?.[USERS.YOU] !== undefined ||
													(currentRound === 3 && createdBy === USERS.YOU) ||
													status === "completed",
											)}
											<ValidationText colorMode={colorMode}>
												Add at least 2 options to avoid bias
											</ValidationText>
										</>
									) : (
										renderOptionsList(
											options,
											(optionId) => onPollVote?.(optionId),
											status === "completed"
												? getColor("success", colorMode)
												: currentRound === 1
													? getColor("round1", colorMode)
													: currentRound === 2
														? getColor("round2", colorMode)
														: currentRound === 3
															? getColor("round3", colorMode)
															: getColor("success", colorMode),
											pollVotes?.[USERS.YOU] !== undefined ||
												(currentRound === 3 && createdBy === USERS.YOU) ||
												status === "completed",
										)
									)}
								</>
							)}
						</PollVotingContainer>
					)}

					{mode === "vote" && (
						<OptionsList>
							<OptionsHeader>
								<OptionsTitle colorMode={colorMode}>Options</OptionsTitle>
								{createdBy === USERS.YOU && isEditing && (
									<Pressable onPress={addNewEditingOption}>
										<ManageButton colorMode={colorMode}>
											<IconAdd size={14} color={getColor("foreground", colorMode)} />
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
										<ValidationText colorMode={colorMode}>
											Add at least 2 options to avoid bias
										</ValidationText>
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
										renderOptionsList(
											options,
											onOptionSelect,
											status === "completed" ? getColor("green", colorMode) : getColor("yellow", colorMode),
											status === "completed", // Disable when vote is completed
										)
									)}
								</>
							)}
						</OptionsList>
					)}

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
							) : status === "voted" &&
							  (isCreator || (mode === "poll" && pollVotes[USERS.YOU] !== undefined)) ? (
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
							) : canDecide &&
							  !(
									mode === "poll" &&
									(pollVotes[USERS.YOU] !== undefined || (currentRound === 3 && createdBy === USERS.YOU))
							  ) &&
							  !(mode === "vote" && isCreator) ? (
								<PrimaryButton
									colorMode={colorMode}
									onPress={handleDecide}
									disabled={loading}
									style={{
										opacity: loading ? 0.6 : 1,
										backgroundColor:
											mode === "poll"
												? currentRound === 1
													? getColor("round1", colorMode)
													: currentRound === 2
														? getColor("round2", colorMode)
														: currentRound === 3
															? getColor("round3", colorMode)
															: getColor("success", colorMode)
												: mode === "vote"
													? getColor("yellow", colorMode)
													: undefined,
									}}
								>
									<IconThumbUpAlt size={16} color="white" />
									<Text
										style={{
											color: "white",
											fontWeight: "500",
											fontSize: 14,
										}}
									>
										{loading ? "Submitting..." : mode === "poll" ? "Submit Vote" : "Decide"}
									</Text>
								</PrimaryButton>
							) : mode === "poll" && pollVotes[USERS.YOU] !== undefined ? (
								<DisabledButton colorMode={colorMode}>
									<IconThumbUpAlt
										size={16}
										color={
											currentRound === 1
												? getColor("round1", colorMode)
												: currentRound === 2
													? getColor("round2", colorMode)
													: currentRound === 3
														? getColor("round3", colorMode)
														: getColor("success", colorMode)
										}
									/>
									<Text
										style={{
											color:
												currentRound === 1
													? getColor("round1", colorMode)
													: currentRound === 2
														? getColor("round2", colorMode)
														: currentRound === 3
															? getColor("round3", colorMode)
															: getColor("success", colorMode),
											fontWeight: "500",
											fontSize: 14,
										}}
									>
										Vote Submitted
									</Text>
								</DisabledButton>
							) : mode === "poll" && currentRound === 3 && createdBy === USERS.YOU ? (
								<DisabledButton colorMode={colorMode}>
									<IconThumbUpAlt size={16} color={getColor("round3", colorMode)} />
									<Text
										style={{
											color: getColor("round3", colorMode),
											fontWeight: "500",
											fontSize: 14,
										}}
									>
										Creator Blocked
									</Text>
								</DisabledButton>
							) : mode === "vote" && isCreator ? (
								<DisabledButton colorMode={colorMode}>
									<IconThumbUpAlt size={16} color={getColor("mutedForeground", colorMode)} />
									<Text
										style={{
											color: getColor("mutedForeground", colorMode),
											fontWeight: "500",
											fontSize: 14,
										}}
									>
										Wait for partner to vote
									</Text>
								</DisabledButton>
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
