import React, { useState, useEffect, useCallback } from "react";
import { View } from "react-native";
import { styled, getColor, getFont } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import { Text } from "@/components/ui/Text";
import ContentLayout from "@/components/layout/ContentLayout";
import { PrimaryButton } from "@/components/ui/Button";
import { IconThumbUpAlt } from "@/assets/icons/IconThumbUpAlt";
import { IconCircleNotch } from "@/assets/icons/IconCircleNotch";
import { useUserContext } from "@/context/user-context-provider";
import { getCompletedDecisions, getCompletedDecisionsCount } from "@/lib/database";
import type { DecisionWithOptions } from "@/types/database";

// UI data types
interface HistoryDecision {
	id: string;
	title: string;
	chosenOption: string;
	decidedBy: string;
	decisionDate: string;
}

interface DecisionStats {
	totalDecisions: number;
	youDecided: number;
	partnerDecided: number;
	recentStreak: string;
}

const StatsContainer = styled.View`
	margin-bottom: 28px;
`;

const StatsTitle = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-family: ${getFont("heading")};
	font-size: 18px;
	margin-bottom: 18px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
`;

const StatsGrid = styled.View`
	flex-direction: row;
	gap: 14px;
	margin-bottom: 28px;
`;

const StatCard = styled.View<{
	colorMode: "light" | "dark";
}>`
	flex: 1;
	z-index: 2;
	background-color: ${({ colorMode }) => getColor("background", colorMode)};
	border: 1px solid ${({ colorMode }) => getColor("border", colorMode)};
	border-radius: 8px;
	padding: 16px;
	align-items: center;
`;

const StatValue = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-family: ${getFont("headingBold")};
	font-size: 24px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
	margin-bottom: 4px;
`;

const StatLabel = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-family: ${getFont("body")};
	font-size: 12px;
	color: ${({ colorMode }) => getColor("mutedForeground", colorMode)};
	text-align: center;
`;

const HistoryList = styled.View`
	gap: 14px;
`;

const HistoryItem = styled.View<{
	colorMode: "light" | "dark";
}>`
	z-index: 2;
	background-color: ${({ colorMode }) => getColor("background", colorMode)};
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
	font-family: ${getFont("heading")};
	font-size: 16px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
	flex: 1;
`;

const DecisionDate = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-family: ${getFont("body")};
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
	font-family: ${getFont("bodyMedium")};
	font-size: 14px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
	flex: 1;
`;

const DecidedBy = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-family: ${getFont("body")};
	font-size: 12px;
	color: ${({ colorMode }) => getColor("mutedForeground", colorMode)};
`;

const LoadMoreButton = styled.Pressable<{
	colorMode: "light" | "dark";
	disabled?: boolean;
}>`
	background-color: ${({ colorMode }) => getColor("muted", colorMode)};
	border: 1px solid ${({ colorMode }) => getColor("border", colorMode)};
	border-radius: 8px;
	padding: 16px;
	align-items: center;
	justify-content: center;
	flex-direction: row;
	gap: 8px;
	margin-top: 16px;
	opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
`;

const LoadMoreText = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-family: ${getFont("bodyMedium")};
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
`;

const LoadingContainer = styled.View`
	flex: 1;
	justify-content: center;
	align-items: center;
	padding-top: 100px;
`;

const LoadingText = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-family: ${getFont("body")};
	color: ${({ colorMode }) => getColor("mutedForeground", colorMode)};
	font-size: 16px;
`;

const ErrorContainer = styled.View`
	flex: 1;
	justify-content: center;
	align-items: center;
	padding: 24px;
`;

const ErrorText = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-family: ${getFont("body")};
	color: ${({ colorMode }) => getColor("destructive", colorMode)};
	font-size: 16px;
	text-align: center;
	margin-bottom: 16px;
`;

const RetryButtonWrapper = styled.View`
	margin-top: 8px;
	min-width: 140px;
`;

// Helper function to format date
const formatDate = (dateString: string): string => {
	const date = new Date(dateString);
	const now = new Date();
	const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

	if (diffInDays === 0) return "Today";
	if (diffInDays === 1) return "Yesterday";
	if (diffInDays < 7) return `${diffInDays} days ago`;

	return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

// Helper function to transform DecisionWithOptions to HistoryDecision
const transformToHistoryDecision = (
	decision: DecisionWithOptions,
	userContext: { userId: string; userName: string; partnerName: string | null },
): HistoryDecision | null => {
	// Find the final decision option
	const finalOption = (decision.options || []).find((opt) => opt.id === decision.final_decision);

	if (!finalOption || !decision.decided_at || !decision.decided_by) {
		return null;
	}

	// Determine who decided
	const decidedBy =
		decision.decided_by === userContext.userId ? "You" : userContext.partnerName || "Partner";

	return {
		id: decision.id,
		title: decision.title,
		chosenOption: finalOption.title,
		decidedBy,
		decisionDate: formatDate(decision.decided_at),
	};
};

// Helper function to calculate stats from completed decisions
const calculateStats = (
	completedDecisions: DecisionWithOptions[],
	userId: string,
): DecisionStats => {
	const youDecided = completedDecisions.filter((d) => d.decided_by === userId).length;
	const partnerDecided = completedDecisions.length - youDecided;

	// Find most recent decision
	const sortedDecisions = [...completedDecisions].sort((a, b) => {
		const dateA = new Date(a.decided_at || 0).getTime();
		const dateB = new Date(b.decided_at || 0).getTime();
		return dateB - dateA;
	});

	const recentDecider = sortedDecisions[0]?.decided_by === userId ? "You" : "Partner";

	return {
		totalDecisions: completedDecisions.length,
		youDecided,
		partnerDecided,
		recentStreak: recentDecider,
	};
};

const PAGE_SIZE = 20;

export default function History() {
	const { colorMode } = useTheme();
	const { userContext, loading: userLoading, error: userError } = useUserContext();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [decisions, setDecisions] = useState<HistoryDecision[]>([]);
	const [stats, setStats] = useState<DecisionStats>({
		totalDecisions: 0,
		youDecided: 0,
		partnerDecided: 0,
		recentStreak: "You",
	});
	const [offset, setOffset] = useState(0);
	const [hasMore, setHasMore] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [allCompletedDecisions, setAllCompletedDecisions] = useState<DecisionWithOptions[]>([]);
	const [totalCount, setTotalCount] = useState<number | null>(null);

	const loadHistory = useCallback(async () => {
		if (userLoading || !userContext?.coupleId) {
			if (!userLoading && !userContext?.coupleId) {
				setError("Unable to load user context");
				setLoading(false);
			}
			return;
		}

		setLoading(true);
		setError(null);
		setOffset(0);
		setHasMore(true);

		try {
			// Fetch total count and first page in parallel
			const [countResult, decisionsResult] = await Promise.all([
				getCompletedDecisionsCount(userContext.coupleId),
				getCompletedDecisions(userContext.coupleId, {
					limit: PAGE_SIZE,
					offset: 0,
				}),
			]);

			if (countResult.data !== null && countResult.error === null) {
				setTotalCount(countResult.data);
			}

			if (decisionsResult.error) {
				setError(decisionsResult.error);
				setLoading(false);
				return;
			}

			const completedDecisions = decisionsResult.data || [];
			setAllCompletedDecisions(completedDecisions);

			setHasMore(completedDecisions.length === PAGE_SIZE);

			const historyDecisions = completedDecisions
				.map((decision) => transformToHistoryDecision(decision, userContext))
				.filter((d): d is HistoryDecision => d !== null);

			const calculatedStats = calculateStats(completedDecisions, userContext.userId);
			if (countResult.data !== null) {
				calculatedStats.totalDecisions = countResult.data;
			}

			setDecisions(historyDecisions);
			setStats(calculatedStats);
			setOffset(PAGE_SIZE);
		} finally {
			setLoading(false);
		}
	}, [userContext, userLoading]);

	useEffect(() => {
		loadHistory();
	}, [loadHistory]);

	const handleLoadMore = async () => {
		if (loadingMore || !hasMore || !userContext?.coupleId) return;

		setLoadingMore(true);
		setError(null);

		const result = await getCompletedDecisions(userContext.coupleId, {
			limit: PAGE_SIZE,
			offset: offset,
		});

		if (result.error) {
			setError(result.error);
			setLoadingMore(false);
			return;
		}

		const newDecisions = result.data || [];

		// Update hasMore based on whether we got a full page
		setHasMore(newDecisions.length === PAGE_SIZE);

		// Append to all completed decisions for stats calculation
		const updatedAllDecisions = [...allCompletedDecisions, ...newDecisions];
		setAllCompletedDecisions(updatedAllDecisions);

		// Transform new decisions to UI format
		const transformed = newDecisions
			.map((decision) => transformToHistoryDecision(decision, userContext))
			.filter((d): d is HistoryDecision => d !== null);

		// Append to existing decisions
		setDecisions((prev) => [...prev, ...transformed]);

		// Recalculate stats from all loaded decisions (preserve total from count)
		const calculatedStats = calculateStats(updatedAllDecisions, userContext.userId);
		if (totalCount !== null) {
			calculatedStats.totalDecisions = totalCount;
		}
		setStats(calculatedStats);

		setOffset(offset + PAGE_SIZE);
		setLoadingMore(false);
	};

	if (loading || userLoading) {
		return (
			<ContentLayout scrollable={true}>
				<LoadingContainer>
					<IconCircleNotch size={24} color={getColor("mutedForeground", colorMode)} />
					<LoadingText colorMode={colorMode}>Loading decision history...</LoadingText>
				</LoadingContainer>
			</ContentLayout>
		);
	}

	if (error || userError) {
		return (
			<ContentLayout scrollable={true}>
				<ErrorContainer>
					<ErrorText colorMode={colorMode}>{error || userError || "Something went wrong"}</ErrorText>
					<RetryButtonWrapper>
						<PrimaryButton
							colorMode={colorMode}
							onPress={loadHistory}
							accessibilityLabel="Retry loading history"
						>
							Retry
						</PrimaryButton>
					</RetryButtonWrapper>
				</ErrorContainer>
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
							{userContext?.partnerName || "Partner"}
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
				{decisions.length === 0 ? (
					<View style={{ padding: 32, alignItems: "center" }}>
						<Text style={{ color: getColor("mutedForeground", colorMode), textAlign: "center" }}>
							No completed decisions yet.{"\n"}Complete decisions to see them here!
						</Text>
					</View>
				) : (
					<>
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

						{hasMore && (
							<LoadMoreButton colorMode={colorMode} onPress={handleLoadMore} disabled={loadingMore}>
								{loadingMore && <IconCircleNotch size={16} color={getColor("foreground", colorMode)} />}
								<LoadMoreText colorMode={colorMode}>
									{loadingMore ? "Loading..." : "Load More History"}
								</LoadMoreText>
							</LoadMoreButton>
						)}
					</>
				)}
			</HistoryList>
		</ContentLayout>
	);
}
