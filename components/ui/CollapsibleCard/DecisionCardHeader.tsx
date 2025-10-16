import React from "react";
import { View, Pressable } from "react-native";
import { Input } from "@/components/ui/Input";
import { getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import { IconChevronUp } from "@/assets/icons/IconChevronUp";
import { IconChevronDown } from "@/assets/icons/IconChevronDown";
import { IconEditNote } from "@/assets/icons/IconEditNote";
import { IconDone } from "@/assets/icons/IconDone";
import { IconClose } from "@/assets/icons/IconClose";
import { IconPoll } from "@/assets/icons/IconPoll";
import { DatePickerComponent } from "@/components/ui/DatePicker";
import {
	CardHeader,
	TopRow,
	TitleRow,
	StatusContainer,
	BottomRow,
	CardTitle,
	CardMeta,
	MetaText,
	ExpandButton,
} from "./CollapsibleCard.styles";
import { getPollColor } from "./CollapsibleCard.helpers";
import { DecisionStatusBadge } from "./DecisionStatusBadge";

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
	onEditDecision?: () => void;
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

	return (
		<CardHeader>
			<TopRow>
				<TitleRow>
					{mode === "poll" && (
						<IconPoll size={16} color={getPollColor(colorMode, currentRound, status)} />
					)}
					{isEditing ? (
						<Input
							placeholder="Enter title"
							value={editingTitle}
							onChangeText={onTitleChange}
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
						<Pressable onPress={onStartEditing} style={{ marginRight: 8 }}>
							<ExpandButton colorMode={colorMode}>
								<IconEditNote size={16} color={getColor("foreground", colorMode)} />
							</ExpandButton>
						</Pressable>
					)}
					{isCreator && onEditDecision && status === "pending" && isEditing && (
						<View style={{ flexDirection: "row", gap: 8, marginRight: 8 }}>
							<Pressable onPress={onCancelEditing}>
								<ExpandButton colorMode={colorMode}>
									<IconClose size={16} color={getColor("destructive", colorMode)} />
								</ExpandButton>
							</Pressable>
							<Pressable onPress={onSaveEditing}>
								<ExpandButton colorMode={colorMode}>
									<IconDone size={16} color={getColor("success", colorMode)} />
								</ExpandButton>
							</Pressable>
						</View>
					)}
					<DecisionStatusBadge
						mode={mode}
						status={status}
						currentRound={currentRound}
						pollVotes={pollVotes}
						userName={userName}
						partnerName={partnerName}
					/>
				</StatusContainer>
			</TopRow>
			<BottomRow>
				<CardMeta>
					<MetaText colorMode={colorMode}>Created by: {createdBy}</MetaText>
					{isEditing ? (
						<DatePickerComponent
							value={editingDeadline}
							onChange={onDeadlineChange}
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
	);
}
