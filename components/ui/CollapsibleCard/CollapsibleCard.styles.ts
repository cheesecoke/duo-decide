import { styled, getColor, getFont, cardShadow } from "@/lib/styled";
import { Input } from "@/components/ui/Input";
import { getBorderColor } from "./CollapsibleCard.helpers";

/**
 * Outer grid cell wrapper: no border, no radius, no shadow.
 * Used so grid rows don't show a stretched bordered box when another cell in the row expands.
 * The actual card (CardContainer) is inside and has align-self: start so it doesn't stretch.
 */
export const CardCell = styled.View`
	width: 100%;
	align-self: flex-start;
`;

// Inner card (border, radius, shadow) - the part that expands/collapses
// z-index above content so cards sit on top and corner illustrations stay behind
export const CardContainer = styled.View<{
	colorMode: "light" | "dark";
	expanded: boolean;
	mode?: "vote" | "poll";
	round?: number;
	hasSelectedOption?: boolean;
	pollVotes?: Record<string, string>;
	status?: "pending" | "voted" | "completed";
}>`
	width: 100%;
	align-self: flex-start;
	z-index: 10;
	background-color: ${({ colorMode }) => getColor("background", colorMode)};
	border-radius: 8px;
	padding: 16px;
	overflow: hidden;
	border: ${({ colorMode, mode = "vote", round = 1, status = "pending" }) =>
		`1px solid ${getBorderColor(colorMode, mode, round, status)}`};
	${cardShadow}
	elevation: 2;
`;

// Header Components
export const CardHeader = styled.View`
	margin-bottom: 12px;
`;

export const TopRow = styled.View`
	flex-direction: row;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: 8px;
	gap: 12px;
`;

export const TitleRow = styled.View`
	flex-direction: row;
	align-items: center;
	gap: 8px;
	flex: 1;
	min-width: 0;
`;

export const StatusContainer = styled.View`
	flex-direction: row;
	align-items: center;
	gap: 8px;
	flex-shrink: 0;
`;

export const BottomRow = styled.View`
	flex-direction: row;
	justify-content: space-between;
	align-items: flex-start;
	gap: 12px;
`;

export const CardTitle = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-family: ${getFont("heading")};
	font-size: 18px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
	flex: 1;
`;

export const CardMeta = styled.View`
	flex: 1;
	min-width: 0;
	flex-direction: column;
	gap: 4px;
	align-items: flex-start;
`;

export const MetaText = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-family: ${getFont("body")};
	font-size: 14px;
	color: ${({ colorMode }) => getColor("mutedForeground", colorMode)};
`;

/** Row for "Deadline: " label + inline DatePicker in edit mode */
export const DeadlineEditRow = styled.View`
	flex-direction: row;
	align-items: center;
	flex-wrap: wrap;
	gap: 4px;
	min-width: 0;
`;

// Status Badge Components
export const StatusBadge = styled.View<{
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

export const StatusText = styled.Text<{
	colorMode: "light" | "dark";
	status: "pending" | "voted" | "completed";
}>`
	font-family: ${getFont("bodyMedium")};
	font-size: 12px;
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

export const RoundIndicator = styled.View<{
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

export const RoundText = styled.Text`
	font-family: ${getFont("bodyMedium")};
	font-size: 12px;
	color: white;
`;

// Button Components
export const ExpandButtonWrap = styled.View`
	flex-shrink: 0;
`;

export const ExpandButton = styled.View<{
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

export const ManageButton = styled.View<{
	colorMode: "light" | "dark";
}>`
	width: 44px;
	height: 44px;
	border-radius: 22px;
	background-color: ${({ colorMode }) => getColor("muted", colorMode)};
	align-items: center;
	justify-content: center;
`;

export const ActionButtons = styled.View`
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
`;

export const DecideButton = styled.View`
	flex-direction: row;
	align-items: center;
	gap: 8px;
`;

export const DisabledButton = styled.View<{
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
	cursor: not-allowed;
`;

export const ActionButtonsContainer = styled.View`
	flex-direction: row;
	gap: 8px;
`;

// Decision card header: edit button wrap (single edit icon)
export const EditButtonWrap = styled.View`
	margin-right: 8px;
`;

// Decision card header: edit actions row (cancel + save) — compact, far right
export const EditActionsRow = styled.View`
	flex-direction: row;
	gap: 4px;
	align-items: center;
`;

/** Smaller button for X and checkmark in edit mode (same visual hover as ExpandButton) */
export const EditActionButton = styled.View<{
	colorMode: "light" | "dark";
	$hoveredOrPressed?: boolean;
}>`
	width: 32px;
	height: 32px;
	border-radius: 16px;
	align-items: center;
	justify-content: center;
	background-color: ${({ colorMode, $hoveredOrPressed }) =>
		$hoveredOrPressed ? getColor("muted", colorMode) : "transparent"};
`;

// Title input when editing (matches CardTitle weight/size)
export const EditTitleInput = styled(Input)`
	flex: 1;
	font-family: ${getFont("heading")};
	font-size: 18px;
	padding-vertical: 8px;
	padding-horizontal: 12px;
`;

// Content Components
export const ExpandedContent = styled.View`
	margin-top: 16px;
`;

export const DetailsText = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-family: ${getFont("body")};
	font-size: 14px;
	color: ${({ colorMode }) => getColor("mutedForeground", colorMode)};
	line-height: 20px;
	margin-bottom: 16px;
`;

// Options List Components
export const OptionsList = styled.View`
	margin-bottom: 16px;
`;

export const OptionsHeader = styled.View`
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 12px;
`;

export const OptionsTitle = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-family: ${getFont("bodyMedium")};
	font-size: 16px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
`;

export const OptionItem = styled.View<{
	colorMode: "light" | "dark";
}>`
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	padding-vertical: 8px;
	border-bottom-width: 1px;
	border-bottom-color: ${({ colorMode }) => getColor("border", colorMode)};
`;

export const OptionText = styled.Text<{
	colorMode: "light" | "dark";
	selected: boolean;
}>`
	font-family: ${getFont("body")};
	font-size: 14px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
	flex: 1;
`;

export const RadioButton = styled.View`
	width: 20px;
	height: 20px;
	align-items: center;
	justify-content: center;
`;

// Editable Options Components
export const EditableOptionRow = styled.View<{
	colorMode: "light" | "dark";
}>`
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	padding-vertical: 8px;
	border-bottom-width: 1px;
	border-bottom-color: ${({ colorMode }) => getColor("border", colorMode)};
`;

export const EditableInput = styled(Input)<{
	colorMode: "light" | "dark";
}>`
	flex: 1;
	margin-right: 8px;
	font-family: ${getFont("body")};
	font-size: 14px;
	padding: 6px 8px;
	min-height: 32px;
`;

export const EmptyStateText = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-family: ${getFont("body")};
	font-size: 14px;
	color: ${({ colorMode }) => getColor("mutedForeground", colorMode)};
	font-style: italic;
	text-align: center;
	padding: 16px 0;
`;

export const ValidationText = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-family: ${getFont("body")};
	font-size: 12px;
	color: ${({ colorMode }) => getColor("mutedForeground", colorMode)};
	margin-top: 8px;
	text-align: center;
`;

// Poll-specific Components
export const PollVotingContainer = styled.View`
	margin-bottom: 16px;
`;

export const PollVotingHeader = styled.View`
	flex-direction: column;
	margin-bottom: 12px;
`;

export const PollVotingTitleRow = styled.View`
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 6px;
`;

export const PollVotingTitle = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-family: ${getFont("heading")};
	font-size: 16px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
`;

export const VotingStatusContainer = styled.View`
	flex-direction: row;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
`;

// Reusable Options List Component
export const ReusableOptionsList = styled.View`
	margin-bottom: 16px;
`;

export const ReusableOptionItem = styled.View<{
	colorMode: "light" | "dark";
}>`
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	padding-vertical: 8px;
	border-bottom-width: 1px;
	border-bottom-color: ${({ colorMode }) => getColor("border", colorMode)};
`;

export const ReusableOptionText = styled.Text<{
	colorMode: "light" | "dark";
	selected: boolean;
}>`
	font-family: ${getFont("body")};
	font-size: 14px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
	flex: 1;
`;
