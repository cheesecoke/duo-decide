import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { styled, getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import { CircleButton } from "@/components/ui/Button";
import { IconChevronUp } from "@/assets/icons/IconChevronUp";
import { IconChevronDown } from "@/assets/icons/IconChevronDown";
import { IconTrashCan } from "@/assets/icons/IconTrashCan";
import { EditableOptionsList, EditableOption } from "@/components/ui/EditableOptionsList";

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

const CardDescription = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 14px;
	color: ${({ colorMode }) => getColor("mutedForeground", colorMode)};
	line-height: 18px;
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
}

export function CollapsibleListCard({
	list,
	onToggle,
	onDelete,
	onOptionsUpdate,
}: CollapsibleListCardProps) {
	const { colorMode } = useTheme();

	return (
		<CardContainer colorMode={colorMode} expanded={list.expanded}>
			<CardHeader>
				<HeaderContent>
					<CardTitle colorMode={colorMode}>{list.title}</CardTitle>
					<CardDescription colorMode={colorMode}>{list.description}</CardDescription>
				</HeaderContent>
				<Pressable onPress={onToggle}>
					<ExpandButton colorMode={colorMode}>
						{list.expanded ? (
							<IconChevronUp size={16} color={getColor("foreground", colorMode)} />
						) : (
							<IconChevronDown size={16} color={getColor("foreground", colorMode)} />
						)}
					</ExpandButton>
				</Pressable>
			</CardHeader>

			{list.expanded && (
				<ExpandedContent>
					<EditableOptionsList
						options={list.options}
						onOptionsUpdate={onOptionsUpdate}
						emptyMessage="No options in this list yet. Tap the edit button to add some!"
					/>

					<ActionButtons>
						<CircleButton colorMode={colorMode} onPress={onDelete}>
							<IconTrashCan size={16} color={getColor("destructive", colorMode)} />
						</CircleButton>
					</ActionButtons>
				</ExpandedContent>
			)}
		</CardContainer>
	);
}
