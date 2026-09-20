import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";

import { IconCircleNotch } from "@/assets/icons/IconCircleNotch";
import { HistoryRow } from "@/components/history/history-row/history-row";
import {
	calculateStats,
	PAGE_SIZE,
	PARTNER_FALLBACK,
	toHistoryDecision,
	type HistoryDecision,
	type HistoryStats,
} from "@/components/history/history.model";
import { ContentLayout } from "@/components/layout";
import { ErrorStrip } from "@/components/layout/error-strip";
import { StaggerIn } from "@/components/layout/stagger-in";
import { Button } from "@/components/ui/reusables/button/button";
import { Gauge } from "@/components/ui/reusables/gauge/gauge";
import {
	Body,
	Caption,
	Display,
	Eyebrow,
	Title,
} from "@/components/ui/reusables/headline/headline";
import { Text } from "@/components/ui/reusables/text/text";
import { Tile } from "@/components/ui/reusables/tile/tile";
import { useUserContext } from "@/context/user-context-provider";
import { getCompletedDecisions, getCompletedDecisionsCount } from "@/lib/database";
import { NEUTRAL } from "@/theme/neutrals";
import { usePersonColors } from "@/theme/usePersonColors";
import type { DecisionWithOptions } from "@/types/database";

/**
 * History — FEATURE-INVENTORY §1.12, on the v2 primitives.
 *
 * Presentation and wiring. The two database calls are the ones that were
 * here before, with the same arguments in the same order: the count query and
 * the first page in one `Promise.all` on load and on Retry, and one page on
 * load-more. The arithmetic moved to `components/history/history.model.ts`
 * and is table-tested there; what is left here is the fetching, the paging
 * and the layout.
 *
 * Still no real-time subscription — unchanged from §1.12. History refreshes
 * when the screen remounts or Retry is pressed, which is the honest shape for
 * a screen about things that already happened.
 *
 * ## The four stat cards became one gauge
 *
 * §1.12 was a 4-up row of bordered cards: Total, You decided, {Partner}
 * decided, Last decider. tokens.md §3 says cards do not use borders and §7
 * gives History its own component — the half-ring `Gauge` — so all four
 * numbers moved into it and the legend beneath it. Each number is on screen
 * exactly once: the gauge's numeral is the total, the two legend rows are the
 * split, and the line under them is the last decider. There are deliberately
 * no stat tiles as well.
 *
 * The gauge's arcs are the *loaded* rows and its numeral is the count query
 * (`total`), which is why paging changes the ring and never the headline.
 *
 * ## A load-more failure no longer eats the screen
 *
 * **Ruling (Task 11).** The old code wrote a failed second page into the same
 * `error` state the initial load used, and that state replaced the whole
 * screen — so a network blip while paging threw away twenty rows the user was
 * reading. A load-more failure now keeps the rows and says so in the strip
 * above them; only an *initial* load failure replaces the screen, because
 * there is nothing behind it to keep.
 */

/** The empty stat block, before anything has loaded. */
const EMPTY_STATS: HistoryStats = {
	totalDecisions: 0,
	youDecided: 0,
	partnerDecided: 0,
	lastDecider: null,
};

/**
 * One side of the gauge's key: a 10 px dot in that person's `base` and the
 * count beside it.
 *
 * The dot is a colour *value* rather than a class because the person pair is
 * swappable at runtime (`usePersonColors`) — the same reason the gauge's own
 * arcs take values.
 */
function LegendItem({ color, label }: { color: string; label: string }) {
	return (
		<View className="flex-row items-center gap-2">
			<View
				// Decorative: the legend's meaning is in the text beside it, and
				// the gauge already carries the whole sentence for a screen
				// reader.
				accessibilityElementsHidden
				importantForAccessibility="no-hide-descendants"
				style={{ backgroundColor: color }}
				className="h-2.5 w-2.5 rounded-chip"
			/>
			<Caption>{label}</Caption>
		</View>
	);
}

export default function History() {
	const { userContext, loading: userLoading, error: userError } = useUserContext();
	const person = usePersonColors();

	const [loading, setLoading] = useState(true);
	/** The initial load's failure — this one replaces the screen. */
	const [error, setError] = useState<string | null>(null);
	/** A failed *second* page — the strip above the rows the user still has. */
	const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

	const [decisions, setDecisions] = useState<HistoryDecision[]>([]);
	const [stats, setStats] = useState<HistoryStats>(EMPTY_STATS);
	const [offset, setOffset] = useState(0);
	const [hasMore, setHasMore] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	/** Every raw row loaded so far — the stats are recomputed over all of them. */
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
		setLoadMoreError(null);
		setOffset(0);
		setHasMore(true);

		try {
			// The count and the first page together — the count is over every
			// completed decision, the page is twenty of them.
			const [countResult, decisionsResult] = await Promise.all([
				getCompletedDecisionsCount(userContext.coupleId),
				getCompletedDecisions(userContext.coupleId, { limit: PAGE_SIZE, offset: 0 }),
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

			const nextStats = calculateStats(
				completedDecisions,
				userContext.userId,
				userContext.partnerName,
			);
			if (countResult.data !== null) nextStats.totalDecisions = countResult.data;

			setDecisions(
				completedDecisions
					.map((decision) => toHistoryDecision(decision, userContext))
					.filter((row): row is HistoryDecision => row !== null),
			);
			setStats(nextStats);
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
		setLoadMoreError(null);

		const result = await getCompletedDecisions(userContext.coupleId, {
			limit: PAGE_SIZE,
			offset: offset,
		});

		if (result.error) {
			// The rows already on screen stay on screen — see the docblock.
			setLoadMoreError(result.error);
			setLoadingMore(false);
			return;
		}

		const newDecisions = result.data || [];
		setHasMore(newDecisions.length === PAGE_SIZE);

		const updatedAllDecisions = [...allCompletedDecisions, ...newDecisions];
		setAllCompletedDecisions(updatedAllDecisions);

		setDecisions((previous) => [
			...previous,
			...newDecisions
				.map((decision) => toHistoryDecision(decision, userContext))
				.filter((row): row is HistoryDecision => row !== null),
		]);

		// Recalculated over every loaded row, with the headline number left to
		// the count query (§1.12).
		const nextStats = calculateStats(
			updatedAllDecisions,
			userContext.userId,
			userContext.partnerName,
		);
		if (totalCount !== null) nextStats.totalDecisions = totalCount;
		setStats(nextStats);

		setOffset(offset + PAGE_SIZE);
		setLoadingMore(false);
	};

	if (loading || userLoading) {
		return (
			<ContentLayout scrollable={true}>
				<View className="flex-1 items-center justify-center gap-3">
					<IconCircleNotch size={24} color={NEUTRAL.ink2} />
					<Caption>Loading decision history…</Caption>
				</View>
			</ContentLayout>
		);
	}

	if (error || userError) {
		return (
			<ContentLayout scrollable={true}>
				<View className="flex-1 items-center justify-center gap-5 px-6">
					<Body className="text-center text-destructive">
						{error || userError || "Something went wrong"}
					</Body>
					{/* The only retry affordance in the app (§1.12); it calls the
					    same loader the screen mounts with. */}
					<Button
						className="h-14 rounded-button px-8"
						accessibilityLabel="Retry loading history"
						onPress={loadHistory}
					>
						<Text className="text-[16px] font-semibold leading-[22px]">Retry</Text>
					</Button>
				</View>
			</ContentLayout>
		);
	}

	const partnerName = userContext?.partnerName || PARTNER_FALLBACK;

	return (
		<ContentLayout scrollable={true}>
			{loadMoreError ? <ErrorStrip message={loadMoreError} /> : null}

			<View className="mb-6">
				<Eyebrow>History</Eyebrow>
				<Display className="mt-2">
					Everything you&apos;ve <Display.Strong>settled</Display.Strong>
				</Display>
			</View>

			{/* The four old stat cards, as one ring and its key. */}
			<View className="mb-8 items-center">
				<Gauge
					a={stats.youDecided}
					b={stats.partnerDecided}
					total={stats.totalDecisions}
					label="decisions"
					size={220}
					accessibilityLabel={`${stats.totalDecisions} decisions: you decided ${stats.youDecided}, ${partnerName} decided ${stats.partnerDecided}`}
				/>

				<View className="mt-4 flex-row flex-wrap items-center justify-center gap-x-5 gap-y-2">
					<LegendItem color={person.a.base} label={`You · ${stats.youDecided}`} />
					<LegendItem color={person.b.base} label={`${partnerName} · ${stats.partnerDecided}`} />
				</View>

				{stats.lastDecider ? (
					<Caption className="mt-2 text-ink-3">Last decided by {stats.lastDecider}</Caption>
				) : null}
			</View>

			<Title className="mb-3">Recent decisions</Title>

			{decisions.length === 0 ? (
				// The tile is the button, and it goes where the decisions are
				// made — there is nothing to create from this screen.
				<View testID="history-empty">
					<Tile
						title="No completed decisions yet"
						subtitle="Complete decisions to see them here."
						tint="surface-2"
						onPress={() => router.navigate("/(protected)/(tabs)")}
					/>
				</View>
			) : (
				// A plain column, not the masonry the queue and Options use:
				// History has always been single-column and its rows are short.
				decisions.map((decision, index) => (
					<StaggerIn key={decision.id} index={index}>
						<HistoryRow {...decision} />
					</StaggerIn>
				))
			)}

			{hasMore ? (
				<Button
					variant="secondary"
					className="mt-2 h-14 w-full rounded-button"
					accessibilityLabel={loadingMore ? "Loading more history" : "Load More History"}
					disabled={loadingMore}
					onPress={handleLoadMore}
				>
					{loadingMore ? <IconCircleNotch size={16} color={NEUTRAL.ink2} /> : null}
					<Text className="text-[16px] font-semibold leading-[22px]">
						{loadingMore ? "Loading…" : "Load More History"}
					</Text>
				</Button>
			) : null}
		</ContentLayout>
	);
}
