import React, { useState, useEffect } from "react";
import { View } from "react-native";
import { styled, getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import { Text } from "@/components/ui/Text";
import ContentLayout from "@/components/layout/ContentLayout";
import { IconThumbUpAlt } from "@/assets/icons/IconThumbUpAlt";
import {
	MOCK_HISTORY,
	MOCK_STATS,
	USERS,
	simulateApiDelay,
	type HistoryDecision,
	type DecisionStats,
} from "@/data/mockData";

const StatsContainer = styled.View`
	margin-bottom: 24px;
`;

const StatsTitle = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 18px;
	font-weight: 600;
	margin-bottom: 16px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
`;

const StatsGrid = styled.View`
	flex-direction: row;
	gap: 12px;
	margin-bottom: 24px;
`;

const StatCard = styled.View<{
	colorMode: "light" | "dark";
}>`
	flex: 1;
	background-color: ${({ colorMode }) => getColor("card", colorMode)};
	border: 1px solid ${({ colorMode }) => getColor("border", colorMode)};
	border-radius: 8px;
	padding: 16px;
	align-items: center;
`;

const StatValue = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 24px;
	font-weight: bold;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
	margin-bottom: 4px;
`;

const StatLabel = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 12px;
	color: ${({ colorMode }) => getColor("mutedForeground", colorMode)};
	text-align: center;
`;

const HistoryList = styled.View`
	gap: 12px;
`;

const HistoryItem = styled.View<{
	colorMode: "light" | "dark";
}>`
	background-color: ${({ colorMode }) => getColor("card", colorMode)};
	border: 1px solid ${({ colorMode }) => getColor("border", colorMode)};
	border-radius: 8px;
	padding: 16px;
`;

const HistoryHeader = styled.View`
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 8px;
`;

const HistoryTitle = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 16px;
	font-weight: 600;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
	flex: 1;
`;

const DecisionDate = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 12px;
	color: ${({ colorMode }) => getColor("mutedForeground", colorMode)};
`;

const ChosenOption = styled.View<{
	colorMode: "light" | "dark";
}>`
	flex-direction: row;
	align-items: center;
	gap: 8px;
	margin-top: 8px;
	padding: 8px 12px;
	background-color: ${({ colorMode }) => getColor("muted", colorMode)};
	border-radius: 6px;
`;

const ChosenText = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 14px;
	font-weight: 500;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
	flex: 1;
`;

const DecidedBy = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 12px;
	color: ${({ colorMode }) => getColor("mutedForeground", colorMode)};
`;

const LoadMoreButton = styled.View<{
	colorMode: "light" | "dark";
}>`
	background-color: ${({ colorMode }) => getColor("muted", colorMode)};
	border: 1px solid ${({ colorMode }) => getColor("border", colorMode)};
	border-radius: 8px;
	padding: 16px;
	align-items: center;
	margin-top: 16px;
`;

const LoadMoreText = styled.Text<{
	colorMode: "light" | "dark";
}>`
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
	font-weight: 500;
`;

export default function History() {
	const { colorMode } = useTheme();
	const [loading, setLoading] = useState(true);
	const [decisions, setDecisions] = useState<HistoryDecision[]>([]);
	const [stats, setStats] = useState<DecisionStats>({
		totalDecisions: 0,
		youDecided: 0,
		partnerDecided: 0,
		recentStreak: "You",
	});

	useEffect(() => {
		const loadHistory = async () => {
			setLoading(true);
			await simulateApiDelay(800);

			setDecisions(MOCK_HISTORY);
			setStats(MOCK_STATS);

			setLoading(false);
		};

		loadHistory();
	}, []);

	if (loading) {
		return (
			<ContentLayout scrollable={true}>
				<View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 100 }}>
					<Text style={{ color: getColor("mutedForeground", colorMode) }}>
						Loading decision history...
					</Text>
				</View>
			</ContentLayout>
		);
	}

	return (
		<ContentLayout scrollable={true}>
			<StatsContainer>
				<StatsTitle colorMode={colorMode}>Decision Analytics</StatsTitle>
				<StatsGrid>
					<StatCard colorMode={colorMode}>
						<StatValue colorMode={colorMode}>{stats.totalDecisions}</StatValue>
						<StatLabel colorMode={colorMode}>Total{"\n"}Decisions</StatLabel>
					</StatCard>
					<StatCard colorMode={colorMode}>
						<StatValue colorMode={colorMode}>{stats.youDecided}</StatValue>
						<StatLabel colorMode={colorMode}>You{"\n"}Decided</StatLabel>
					</StatCard>
					<StatCard colorMode={colorMode}>
						<StatValue colorMode={colorMode}>{stats.partnerDecided}</StatValue>
						<StatLabel colorMode={colorMode}>
							{USERS.PARTNER}
							{"\n"}Decided
						</StatLabel>
					</StatCard>
					<StatCard colorMode={colorMode}>
						<StatValue colorMode={colorMode} style={{ fontSize: 16 }}>
							{stats.recentStreak}
						</StatValue>
						<StatLabel colorMode={colorMode}>Last{"\n"}Decider</StatLabel>
					</StatCard>
				</StatsGrid>
			</StatsContainer>

			<StatsTitle colorMode={colorMode}>Recent Decisions</StatsTitle>
			<HistoryList>
				{decisions.map((decision) => (
					<HistoryItem key={decision.id} colorMode={colorMode}>
						<HistoryHeader>
							<HistoryTitle colorMode={colorMode}>{decision.title}</HistoryTitle>
							<DecisionDate colorMode={colorMode}>{decision.decisionDate}</DecisionDate>
						</HistoryHeader>

						<ChosenOption colorMode={colorMode}>
							<IconThumbUpAlt size={16} color={getColor("yellow", colorMode)} />
							<ChosenText colorMode={colorMode}>{decision.chosenOption}</ChosenText>
							<DecidedBy colorMode={colorMode}>by {decision.decidedBy}</DecidedBy>
						</ChosenOption>
					</HistoryItem>
				))}

				<LoadMoreButton colorMode={colorMode}>
					<LoadMoreText colorMode={colorMode}>Load More History</LoadMoreText>
				</LoadMoreButton>
			</HistoryList>
		</ContentLayout>
	);
}
