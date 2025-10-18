import { styled, getColor } from "@/lib/styled";
import { Input } from "@/components/ui/Input";
import { getBorderColor } from "./CollapsibleCard.helpers";

// Main Card Container
export const CardContainer = styled.View<{
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
	border: ${({ colorMode, mode = "vote", round = 1, status = "pending" }) =>
		`1px solid ${getBorderColor(colorMode, mode, round, status)}`};
	shadow-color: #000;
	shadow-offset: 0px 2px;
	shadow-opacity: 0.1;
	shadow-radius: 4px;
	elevation: 2;
`;

// Header Components
export const CardHeader = styled.View`
	margin-bottom: 12px;
`;

export const TopRow = styled.View`
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 8px;
`;

export const TitleRow = styled.View`
	flex-direction: row;
	align-items: center;
	gap: 8px;
	flex: 1;
`;

export const StatusContainer = styled.View`
	flex-direction: row;
	align-items: center;
	gap: 8px;
`;

export const BottomRow = styled.View`
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
`;

export const CardTitle = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 18px;
	font-weight: 600;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
	flex: 1;
`;

export const CardMeta = styled.View`
	flex-direction: row;
	gap: 16px;
	align-items: center;
`;

export const MetaText = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 14px;
	color: ${({ colorMode }) => getColor("mutedForeground", colorMode)};
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
	font-size: 12px;
	font-weight: 500;
	color: white;
`;

// Button Components
export const ExpandButton = styled.View<{
	colorMode: "light" | "dark";
}>`
	width: 44px;
	height: 44px;
	border-radius: 22px;
	align-items: center;
	justify-content: center;
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

// Content Components
export const ExpandedContent = styled.View`
	margin-top: 16px;
`;

export const DetailsText = styled.Text<{
	colorMode: "light" | "dark";
}>`
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
	font-size: 16px;
	font-weight: 500;
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
	font-size: 14px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
	font-weight: 400;
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
	font-size: 14px;
	padding: 6px 8px;
	min-height: 32px;
`;

export const EmptyStateText = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 14px;
	color: ${({ colorMode }) => getColor("mutedForeground", colorMode)};
	font-style: italic;
	text-align: center;
	padding: 16px 0;
`;

export const ValidationText = styled.Text<{
	colorMode: "light" | "dark";
}>`
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
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 12px;
`;

export const PollVotingTitle = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 16px;
	font-weight: 600;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
`;

export const VotingStatusContainer = styled.View`
	flex-direction: row;
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
	font-size: 14px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
	font-weight: 400;
	flex: 1;
`;
