import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { CircleButton } from "@/components/ui/Button";
import { getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import { IconTrashCan } from "@/assets/icons/IconTrashCan";
import { IconAdd } from "@/assets/icons/IconAdd";
import { Textarea } from "@/components/ui/Textarea";
import {
	CardContainer,
	ExpandedContent,
	DetailsText,
	OptionsList,
	OptionsHeader,
	OptionsTitle,
	ManageButton,
	ActionButtons,
	PollVotingContainer,
	PollVotingHeader,
	PollVotingTitle,
	VotingStatusContainer,
} from "./CollapsibleCard.styles";
import { getPollColor } from "./CollapsibleCard.helpers";
import { DecisionCardHeader } from "./DecisionCardHeader";
import { DecisionDecideButton } from "./DecisionDecideButton";
import { VotingStatusIndicator } from "./VotingStatusIndicator";
import { EditableOptionsList } from "./EditableOptionsList";
import { OptionsDisplay } from "./OptionsDisplay";

interface DecisionOption {
	id: string;
	title: string;
	selected: boolean;
}

interface CollapsibleCardProps {
	title: string;
	createdBy: string;
	userName: string;
	partnerName: string;
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
	userName,
	partnerName,
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
	const isCreator = createdBy === userName;
	const hasSelectedOption = options.some((option) => option.selected);
	const hasMinimumOptions = options.length >= 2;
	// Check if user has already voted in current round (for polls)
	const hasUserVotedInCurrentRound = mode === "poll" && pollVotes[userName] !== undefined;

	const canDecide =
		hasSelectedOption &&
		hasMinimumOptions &&
		!hasUserVotedInCurrentRound && // User hasn't voted in current round
		(mode === "vote"
			? status === "pending" || (status === "voted" && !isCreator) // Vote mode: only partner votes
			: true); // Poll mode: both users can always vote (until they've voted in current round)
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
			<DecisionCardHeader
				title={title}
				createdBy={createdBy}
				userName={userName}
				partnerName={partnerName}
				deadline={deadline}
				expanded={expanded}
				status={status}
				mode={mode}
				currentRound={currentRound}
				pollVotes={pollVotes}
				isCreator={isCreator}
				isEditing={isEditing}
				editingTitle={editingTitle}
				editingDeadline={editingDeadline}
				onToggle={onToggle}
				onEditDecision={onEditDecision}
				onStartEditing={startInlineEditing}
				onSaveEditing={saveInlineEditing}
				onCancelEditing={cancelInlineEditing}
				onTitleChange={setEditingTitle}
				onDeadlineChange={setEditingDeadline}
			/>

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
										<VotingStatusIndicator
											userName={userName}
											isCreator={createdBy === userName}
											hasVoted={pollVotes[userName] !== undefined}
											hasSelectedOption={hasSelectedOption}
											currentRound={currentRound}
											status={status}
										/>
										<VotingStatusIndicator
											userName={partnerName}
											isCreator={createdBy === partnerName}
											hasVoted={pollVotes[partnerName] !== undefined}
											hasSelectedOption={false}
											currentRound={currentRound}
											status={status}
										/>
									</VotingStatusContainer>
									{createdBy === userName && isEditing && (
										<Pressable onPress={addNewEditingOption}>
											<ManageButton colorMode={colorMode}>
												<IconAdd size={14} color={getColor("foreground", colorMode)} />
											</ManageButton>
										</Pressable>
									)}
								</View>
							</PollVotingHeader>

							{isEditing ? (
								<EditableOptionsList options={editingOptions} onUpdateOption={updateEditingOption} />
							) : (
								<OptionsDisplay
									options={options}
									onOptionPress={(optionId) => onPollVote?.(optionId)}
									radioColor={getPollColor(colorMode, currentRound, status)}
									disabled={
										pollVotes?.[userName] !== undefined ||
										(currentRound === 3 && createdBy === userName) ||
										status === "completed"
									}
									mode="poll"
								/>
							)}
						</PollVotingContainer>
					)}

					{mode === "vote" && (
						<OptionsList>
							<OptionsHeader>
								<OptionsTitle colorMode={colorMode}>Options</OptionsTitle>
								{createdBy === userName && isEditing && (
									<Pressable onPress={addNewEditingOption}>
										<ManageButton colorMode={colorMode}>
											<IconAdd size={14} color={getColor("foreground", colorMode)} />
										</ManageButton>
									</Pressable>
								)}
							</OptionsHeader>

							{isEditing ? (
								<EditableOptionsList options={editingOptions} onUpdateOption={updateEditingOption} />
							) : (
								<OptionsDisplay
									options={options}
									onOptionPress={onOptionSelect}
									radioColor={
										status === "completed" ? getColor("green", colorMode) : getColor("yellow", colorMode)
									}
									disabled={status === "completed"}
									mode="vote"
								/>
							)}
						</OptionsList>
					)}

					<ActionButtons>
						<DecisionDecideButton
							mode={mode}
							status={status}
							currentRound={currentRound}
							isCreator={isCreator}
							canDecide={canDecide}
							hasMinimumOptions={hasMinimumOptions}
							pollVotes={pollVotes}
							userName={userName}
							partnerName={partnerName}
							decidedBy={decidedBy}
							loading={loading}
							onDecide={handleDecide}
						/>

						{createdBy === userName && (
							<CircleButton colorMode={colorMode} onPress={onDelete}>
								<IconTrashCan size={16} color={getColor("destructive", colorMode)} />
							</CircleButton>
						)}
					</ActionButtons>
				</ExpandedContent>
			)}
		</CardContainer>
	);
}
