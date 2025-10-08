import React from "react";
import { StatusBadge, StatusText } from "./CollapsibleCard.styles";
import { getPollColor } from "./CollapsibleCard.helpers";
import { useTheme } from "@/context/theme-provider";

interface DecisionStatusBadgeProps {
	mode: "vote" | "poll";
	status: "pending" | "voted" | "completed";
	currentRound?: number;
	pollVotes?: Record<string, string>;
	users?: { YOU: string; PARTNER: string };
}

export function DecisionStatusBadge({
	mode,
	status,
	currentRound = 1,
	pollVotes = {},
	users = { YOU: "You", PARTNER: "Partner" },
}: DecisionStatusBadgeProps) {
	const { colorMode } = useTheme();

	// Get status text based on mode and status
	const getStatusText = () => {
		if (status === "completed") {
			return "Decided";
		}

		if (mode === "poll") {
			if (pollVotes[users.YOU] !== undefined && pollVotes[users.PARTNER] !== undefined) {
				return `Round ${currentRound} Complete`;
			}
			if (pollVotes[users.YOU] !== undefined) {
				return "Waiting";
			}
			return `Round ${currentRound}`;
		}

		// Vote mode
		return status === "voted" ? "Vote" : "Pending";
	};

	if (mode === "poll") {
		return (
			<StatusBadge
				colorMode={colorMode}
				status={status}
				style={{
					backgroundColor: getPollColor(colorMode, currentRound, status),
				}}
			>
				<StatusText colorMode={colorMode} status={status} style={{ color: "white" }}>
					{getStatusText()}
				</StatusText>
			</StatusBadge>
		);
	}

	// Vote mode
	return (
		<StatusBadge colorMode={colorMode} status={status}>
			<StatusText colorMode={colorMode} status={status}>
				{getStatusText()}
			</StatusText>
		</StatusBadge>
	);
}
