import React from "react";
import { Text } from "@/components/ui/Text";
import { PrimaryButton } from "@/components/ui/Button";
import { getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import { IconThumbUpAlt } from "@/assets/icons/IconThumbUpAlt";
import { DecideButton, DisabledButton } from "./CollapsibleCard.styles";
import { getPollColor } from "./CollapsibleCard.helpers";

interface DecisionDecideButtonProps {
	mode: "vote" | "poll";
	status: "pending" | "voted" | "completed";
	currentRound: number;
	isCreator: boolean;
	canDecide: boolean;
	hasMinimumOptions: boolean;
	pollVotes: Record<string, string>;
	users: { YOU: string; PARTNER: string };
	decidedBy?: string;
	loading: boolean;
	onDecide: () => void;
}

export function DecisionDecideButton({
	mode,
	status,
	currentRound,
	isCreator,
	canDecide,
	hasMinimumOptions,
	pollVotes,
	users,
	decidedBy,
	loading,
	onDecide,
}: DecisionDecideButtonProps) {
	const { colorMode } = useTheme();

	// Decision is already completed
	if (status === "completed") {
		return (
			<DecideButton>
				<DisabledButton colorMode={colorMode}>
					<IconThumbUpAlt size={16} color={getColor("green", colorMode)} />
					<Text style={{ color: getColor("green", colorMode), fontWeight: "500", fontSize: 14 }}>
						Decided by {decidedBy}
					</Text>
				</DisabledButton>
			</DecideButton>
		);
	}

	// Waiting for partner (user already voted or is creator in vote mode)
	const isWaitingForPartner = status === "voted" && (isCreator || (mode === "poll" && pollVotes[users.YOU] !== undefined));
	if (isWaitingForPartner) {
		return (
			<DecideButton>
				<DisabledButton colorMode={colorMode}>
					<IconThumbUpAlt size={16} color={getColor("yellow", colorMode)} />
					<Text style={{ color: getColor("yellow", colorMode), fontWeight: "500", fontSize: 14 }}>
						Waiting for partner
					</Text>
				</DisabledButton>
			</DecideButton>
		);
	}

	// Poll mode: User already submitted vote for this round
	const hasUserVotedInPoll = mode === "poll" && pollVotes[users.YOU] !== undefined;
	if (hasUserVotedInPoll) {
		return (
			<DecideButton>
				<DisabledButton colorMode={colorMode}>
					<IconThumbUpAlt size={16} color={getPollColor(colorMode, currentRound)} />
					<Text style={{ color: getPollColor(colorMode, currentRound), fontWeight: "500", fontSize: 14 }}>
						Vote Submitted
					</Text>
				</DisabledButton>
			</DecideButton>
		);
	}

	// Poll mode Round 3: Creator is blocked from voting
	const isCreatorBlockedInRound3 = mode === "poll" && currentRound === 3 && isCreator;
	if (isCreatorBlockedInRound3) {
		return (
			<DecideButton>
				<DisabledButton colorMode={colorMode}>
					<IconThumbUpAlt size={16} color={getColor("round3", colorMode)} />
					<Text style={{ color: getColor("round3", colorMode), fontWeight: "500", fontSize: 14 }}>
						Creator Blocked
					</Text>
				</DisabledButton>
			</DecideButton>
		);
	}

	// Vote mode: Creator cannot decide (only partner can)
	const isCreatorInVoteMode = mode === "vote" && isCreator;
	if (isCreatorInVoteMode) {
		return (
			<DecideButton>
				<DisabledButton colorMode={colorMode}>
					<IconThumbUpAlt size={16} color={getColor("mutedForeground", colorMode)} />
					<Text style={{ color: getColor("mutedForeground", colorMode), fontWeight: "500", fontSize: 14 }}>
						Wait for partner to vote
					</Text>
				</DisabledButton>
			</DecideButton>
		);
	}

	// User can decide - show active button
	if (canDecide) {
		const backgroundColor = mode === "poll" ? getPollColor(colorMode, currentRound) : getColor("yellow", colorMode);
		const buttonText = loading ? "Submitting..." : mode === "poll" ? "Submit Vote" : "Decide";

		return (
			<DecideButton>
				<PrimaryButton
					colorMode={colorMode}
					onPress={onDecide}
					disabled={loading}
					style={{
						opacity: loading ? 0.6 : 1,
						backgroundColor,
					}}
				>
					<IconThumbUpAlt size={16} color="white" />
					<Text style={{ color: "white", fontWeight: "500", fontSize: 14 }}>{buttonText}</Text>
				</PrimaryButton>
			</DecideButton>
		);
	}

	// Default: Not ready to decide yet
	const disabledMessage = !hasMinimumOptions ? "Need 2+ options" : "Select option";
	return (
		<DecideButton>
			<DisabledButton colorMode={colorMode}>
				<IconThumbUpAlt size={16} color={getColor("mutedForeground", colorMode)} />
				<Text style={{ color: getColor("mutedForeground", colorMode), fontWeight: "500", fontSize: 14 }}>
					{disabledMessage}
				</Text>
			</DisabledButton>
		</DecideButton>
	);
}
