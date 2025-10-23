import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import { IconThumbUpAlt } from "@/assets/icons/IconThumbUpAlt";
import { IconDone } from "@/assets/icons/IconDone";
import { IconClose } from "@/assets/icons/IconClose";
import { getPollColor } from "./CollapsibleCard.helpers";

interface VotingStatusIndicatorProps {
	userName: string;
	isCreator: boolean;
	hasVoted: boolean;
	hasSelectedOption: boolean;
	currentRound: number;
	status: "pending" | "voted" | "completed";
}

export function VotingStatusIndicator({
	userName,
	isCreator,
	hasVoted,
	hasSelectedOption,
	currentRound,
	status,
}: VotingStatusIndicatorProps) {
	const { colorMode } = useTheme();

	// Determine icon and color based on voting state
	const getStatusIcon = () => {
		// Round 3: Creator is blocked from voting
		if (currentRound === 3 && isCreator) {
			const iconColor =
				status === "completed" ? getColor("success", colorMode) : getColor("round3", colorMode);
			return <IconClose size={14} color={iconColor} />;
		}

		// User has already voted
		if (hasVoted) {
			return <IconDone size={14} color={getPollColor(colorMode, currentRound, status)} />;
		}

		// User hasn't voted yet - show thumbs up
		let iconColor: string;
		if (status === "completed") {
			iconColor = getColor("success", colorMode);
		} else if (hasSelectedOption) {
			iconColor = getPollColor(colorMode, currentRound);
		} else {
			iconColor = getColor("mutedForeground", colorMode);
		}

		return <IconThumbUpAlt size={14} color={iconColor} />;
	};

	return (
		<View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
			<Text style={{ fontSize: 14, color: getColor("foreground", colorMode) }}>{userName}:</Text>
			{getStatusIcon()}
		</View>
	);
}
