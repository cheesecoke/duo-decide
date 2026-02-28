import React, { useState } from "react";
import { Pressable, View, Platform } from "react-native";
import { getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import { IconChevronUp } from "@/assets/icons/IconChevronUp";
import { IconChevronDown } from "@/assets/icons/IconChevronDown";
import { IconEditNote } from "@/assets/icons/IconEditNote";
import { IconDone } from "@/assets/icons/IconDone";
import { IconClose } from "@/assets/icons/IconClose";
import { IconPoll } from "@/assets/icons/IconPoll";
import { IconPottedPlant } from "@/assets/icons/IconPottedPlant";
import { DatePickerComponent, parseLocalDateString } from "@/components/ui/DatePicker";
import {
	CardHeader,
	TopRow,
	TitleRow,
	StatusContainer,
	BottomRow,
	CardTitle,
	CardMeta,
	MetaText,
	DeadlineEditRow,
	ExpandButtonWrap,
	ExpandButton,
	EditButtonWrap,
	EditActionsRow,
	EditActionButton,
	EditTitleInput,
} from "./CollapsibleCard.styles";
import { getPollColor, getVoteColor } from "./CollapsibleCard.helpers";
import { DecisionStatusBadge } from "./DecisionStatusBadge";

function TitleContent({
	isEditing,
	title,
	editingTitle,
	colorMode,
	onTitleChange,
}: {
	isEditing: boolean;
	title: string;
	editingTitle: string;
	colorMode: "light" | "dark";
	onTitleChange: (text: string) => void;
}) {
	if (isEditing) {
		return (
			<EditTitleInput placeholder="Enter title" value={editingTitle} onChangeText={onTitleChange} />
		);
	}
	return <CardTitle colorMode={colorMode}>{title}</CardTitle>;
}

function EditActions({
	canEdit,
	isEditing,
	colorMode,
	onStartEditing,
	onCancelEditing,
	onSaveEditing,
}: {
	canEdit: boolean;
	isEditing: boolean;
	colorMode: "light" | "dark";
	onStartEditing: () => void;
	onCancelEditing: () => void;
	onSaveEditing: () => void;
}) {
	const [cancelHovered, setCancelHovered] = useState(false);
	const [cancelPressed, setCancelPressed] = useState(false);
	const [saveHovered, setSaveHovered] = useState(false);
	const [savePressed, setSavePressed] = useState(false);
	const isWeb = Platform.OS === "web";

	if (canEdit && !isEditing) {
		return (
			<EditButtonWrap>
				<Pressable onPress={onStartEditing}>
					<ExpandButton colorMode={colorMode}>
						<IconEditNote size={16} color={getColor("foreground", colorMode)} />
					</ExpandButton>
				</Pressable>
			</EditButtonWrap>
		);
	}
	if (canEdit && isEditing) {
		return (
			<EditActionsRow>
				<View
					{...(isWeb && {
						onMouseEnter: () => setCancelHovered(true),
						onMouseLeave: () => setCancelHovered(false),
					})}
				>
					<Pressable
						onPress={onCancelEditing}
						onPressIn={() => setCancelPressed(true)}
						onPressOut={() => setCancelPressed(false)}
					>
						<EditActionButton colorMode={colorMode} $hoveredOrPressed={cancelHovered || cancelPressed}>
							<IconClose size={14} color={getColor("destructive", colorMode)} />
						</EditActionButton>
					</Pressable>
				</View>
				<View
					{...(isWeb && {
						onMouseEnter: () => setSaveHovered(true),
						onMouseLeave: () => setSaveHovered(false),
					})}
				>
					<Pressable
						onPress={onSaveEditing}
						onPressIn={() => setSavePressed(true)}
						onPressOut={() => setSavePressed(false)}
					>
						<EditActionButton colorMode={colorMode} $hoveredOrPressed={saveHovered || savePressed}>
							<IconDone size={14} color={getColor("success", colorMode)} />
						</EditActionButton>
					</Pressable>
				</View>
			</EditActionsRow>
		);
	}
	return null;
}

function DeadlineContent({
	isEditing,
	deadline,
	editingDeadline,
	colorMode,
	onDeadlineChange,
}: {
	isEditing: boolean;
	deadline: string;
	editingDeadline: string;
	colorMode: "light" | "dark";
	onDeadlineChange: (date: string) => void;
}) {
	// Format deadline for display using local date parsing to avoid timezone issues
	const formatDeadlineDisplay = (deadlineStr: string): string => {
		if (!deadlineStr) return "No deadline";
		try {
			const date = parseLocalDateString(deadlineStr);
			return date.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
			});
		} catch {
			return deadlineStr;
		}
	};

	if (isEditing) {
		return (
			<DeadlineEditRow>
				<MetaText colorMode={colorMode}>Deadline: </MetaText>
				<DatePickerComponent
					variant="inline"
					value={editingDeadline}
					onChange={onDeadlineChange}
					placeholder="Select deadline"
				/>
			</DeadlineEditRow>
		);
	}
	return <MetaText colorMode={colorMode}>Deadline: {formatDeadlineDisplay(deadline)}</MetaText>;
}

function ExpandChevron({
	expanded,
	colorMode,
}: {
	expanded: boolean;
	colorMode: "light" | "dark";
}) {
	const color = getColor("foreground", colorMode);
	return expanded ? (
		<IconChevronUp size={16} color={color} />
	) : (
		<IconChevronDown size={16} color={color} />
	);
}

interface DecisionCardHeaderProps {
	title: string;
	createdBy: string;
	userName: string;
	partnerName: string;
	deadline: string;
	expanded: boolean;
	status: "pending" | "voted" | "completed";
	mode: "vote" | "poll";
	currentRound: number;
	pollVotes: Record<string, string>;
	isCreator: boolean;
	isEditing: boolean;
	editingTitle: string;
	editingDeadline: string;
	onToggle: () => void;
	/** Presence enables edit button; CollapsibleCard passes (payload) => void for save */
	onEditDecision?: (payload: {
		title: string;
		details: string;
		deadline: string;
		options: { id: string; title: string; selected: boolean }[];
	}) => void;
	onStartEditing: () => void;
	onSaveEditing: () => void;
	onCancelEditing: () => void;
	onTitleChange: (text: string) => void;
	onDeadlineChange: (date: string) => void;
}

export function DecisionCardHeader({
	title,
	createdBy,
	userName,
	partnerName,
	deadline,
	expanded,
	status,
	mode,
	currentRound,
	pollVotes,
	isCreator,
	isEditing,
	editingTitle,
	editingDeadline,
	onToggle,
	onEditDecision,
	onStartEditing,
	onSaveEditing,
	onCancelEditing,
	onTitleChange,
	onDeadlineChange,
}: DecisionCardHeaderProps) {
	const { colorMode } = useTheme();
	const [expandHovered, setExpandHovered] = useState(false);
	const [expandPressed, setExpandPressed] = useState(false);

	const canEdit = Boolean(isCreator && onEditDecision && status === "pending");

	return (
		<CardHeader>
			<TopRow>
				<TitleRow>
					{mode === "poll" && (
						<IconPoll size={20} color={getPollColor(colorMode, currentRound, status)} />
					)}
					{mode === "vote" && (
						<IconPottedPlant size={20} weight="fill" color={getVoteColor(colorMode, status)} />
					)}
					<TitleContent
						isEditing={isEditing}
						title={title}
						editingTitle={editingTitle}
						colorMode={colorMode}
						onTitleChange={onTitleChange}
					/>
				</TitleRow>
				<StatusContainer>
					<EditActions
						canEdit={canEdit}
						isEditing={isEditing}
						colorMode={colorMode}
						onStartEditing={onStartEditing}
						onCancelEditing={onCancelEditing}
						onSaveEditing={onSaveEditing}
					/>
					{!isEditing && (
						<DecisionStatusBadge
							mode={mode}
							status={status}
							currentRound={currentRound}
							pollVotes={pollVotes}
							userName={userName}
							partnerName={partnerName}
						/>
					)}
				</StatusContainer>
			</TopRow>
			<BottomRow>
				<CardMeta>
					<MetaText colorMode={colorMode}>Created by: {createdBy}</MetaText>
					<DeadlineContent
						isEditing={isEditing}
						deadline={deadline}
						editingDeadline={editingDeadline}
						colorMode={colorMode}
						onDeadlineChange={onDeadlineChange}
					/>
				</CardMeta>
				<ExpandButtonWrap>
					<Pressable
						onPress={onToggle}
						onPressIn={() => setExpandPressed(true)}
						onPressOut={() => setExpandPressed(false)}
						onMouseEnter={() => setExpandHovered(true)}
						onMouseLeave={() => setExpandHovered(false)}
					>
						<ExpandButton colorMode={colorMode} $hoveredOrPressed={expandHovered || expandPressed}>
							<ExpandChevron expanded={expanded} colorMode={colorMode} />
						</ExpandButton>
					</Pressable>
				</ExpandButtonWrap>
			</BottomRow>
		</CardHeader>
	);
}
