import React, { useState } from "react";
import { Pressable } from "react-native";
import { styled, getColor, getFont, cardShadow } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import { CircleButton } from "@/components/ui/Button";
import { IconChevronUp } from "@/assets/icons/IconChevronUp";
import { IconChevronDown } from "@/assets/icons/IconChevronDown";
import { IconListDashes } from "@/assets/icons/IconListDashes";
import { IconTrashCan } from "@/assets/icons/IconTrashCan";
import { EditableOptionsList, EditableOption } from "@/components/ui/EditableOptionsList";
import { Divider } from "@/components/ui/Divider";

const CardContainer = styled.View<{
	colorMode: "light" | "dark";
	expanded: boolean;
}>`
	background-color: ${({ colorMode }) => getColor("card", colorMode)};
	border-radius: 8px;
	padding: 16px;
	border: 1px solid ${({ colorMode }) => getColor("border", colorMode)};
	${cardShadow}
	elevation: 2;
`;

const CardHeader = styled.View`
	margin-bottom: 12px;
`;

/** Top row: icon + title (same line) and expand button — matches Decision Queue card */
const TopRow = styled.View`
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 8px;
	gap: 12px;
`;

const TitleRow = styled.View`
	flex-direction: row;
	align-items: center;
	gap: 8px;
	flex: 1;
	min-width: 0;
`;

const CardTitle = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-family: ${getFont("heading")};
	font-size: 18px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
`;

/** Second row: description (like Decision card’s “Created by” / details row) */
const BottomRow = styled.View`
	flex-direction: row;
	align-items: flex-start;
`;

const CardDescription = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-family: ${getFont("body")};
	font-size: 14px;
	color: ${({ colorMode }) => getColor("mutedForeground", colorMode)};
	line-height: 18px;
	flex: 1;
`;

const ExpandButton = styled.View<{
	colorMode: "light" | "dark";
	$hoveredOrPressed?: boolean;
}>`
	width: 44px;
	height: 44px;
	border-radius: 22px;
	align-items: center;
	justify-content: center;
	background-color: ${({ colorMode, $hoveredOrPressed }) =>
		$hoveredOrPressed ? getColor("muted", colorMode) : "transparent"};
`;

const ExpandedContent = styled.View`
	margin-top: 16px;
`;

const ActionButtons = styled.View`
	flex-direction: row;
	justify-content: flex-end;
	align-items: center;
	margin-top: 16px;
`;

export interface OptionList {
	id: string;
	title: string;
	description: string;
	options: EditableOption[];
	expanded: boolean;
}

interface CollapsibleListCardProps {
	list: OptionList;
	onToggle: () => void;
	onDelete: () => void;
	onOptionsUpdate: (options: EditableOption[]) => void;
	creatorId?: string | null;
	currentUserId?: string | null;
}

export function CollapsibleListCard({
	list,
	onToggle,
	onDelete,
	onOptionsUpdate,
	creatorId,
	currentUserId,
}: CollapsibleListCardProps) {
	const { colorMode } = useTheme();
	const [expandHovered, setExpandHovered] = useState(false);
	const [expandPressed, setExpandPressed] = useState(false);
	const canDelete = creatorId != null && currentUserId != null && creatorId === currentUserId;

	return (
		<CardContainer colorMode={colorMode} expanded={list.expanded}>
			<CardHeader>
				<TopRow>
					<TitleRow>
						<IconListDashes size={20} weight="fill" color={getColor("yellow", colorMode)} />
						<CardTitle colorMode={colorMode}>{list.title}</CardTitle>
					</TitleRow>
					<Pressable
						onPress={onToggle}
						onPressIn={() => setExpandPressed(true)}
						onPressOut={() => setExpandPressed(false)}
						{...(typeof window !== "undefined" && {
							onMouseEnter: () => setExpandHovered(true),
							onMouseLeave: () => setExpandHovered(false),
						})}
					>
						<ExpandButton colorMode={colorMode} $hoveredOrPressed={expandHovered || expandPressed}>
							{list.expanded ? (
								<IconChevronUp size={16} color={getColor("foreground", colorMode)} />
							) : (
								<IconChevronDown size={16} color={getColor("foreground", colorMode)} />
							)}
						</ExpandButton>
					</Pressable>
				</TopRow>
				<BottomRow>
					<CardDescription colorMode={colorMode}>{list.description}</CardDescription>
				</BottomRow>
			</CardHeader>

			{list.expanded && (
				<ExpandedContent>
					<Divider />
					<EditableOptionsList
						options={list.options}
						onOptionsUpdate={onOptionsUpdate}
						emptyMessage="No options in this list yet. Tap the edit button to add some!"
					/>

					{canDelete && (
						<ActionButtons>
							<CircleButton colorMode={colorMode} onPress={onDelete}>
								<IconTrashCan size={16} color={getColor("destructive", colorMode)} />
							</CircleButton>
						</ActionButtons>
					)}
				</ExpandedContent>
			)}
		</CardContainer>
	);
}
