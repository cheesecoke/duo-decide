import * as React from "react";
import { Keyboard, Platform, Pressable, View } from "react-native";
import { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { CloseGlyph, SearchGlyph } from "@/components/decision-queue/decision-card/glyphs";
import { AnimatedView } from "@/components/ui/reusables/animated/animated";
import { Character } from "@/components/ui/reusables/character/character";
import { Input } from "@/components/ui/reusables/field/field";
import { FilterChip, type FilterChipTone } from "@/components/ui/reusables/filter-chip/filter-chip";
import { IconButton } from "@/components/ui/reusables/icon-button/icon-button";
import { Text, TextClassContext } from "@/components/ui/reusables/text/text";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
	QUEUE_BUCKETS,
	type BucketCounts,
	type QueueBucket,
	type QueueFilter,
} from "@/lib/queue-filter";
import { DUR } from "@/theme/motion";
import { NEUTRAL } from "@/theme/neutrals";

/**
 * QueueFilterBar — the row under the queue's headline.
 *
 * It replaced the `duo-row` ("You & Sam · 3 open, 1 settled") and keeps its
 * job: it is still the place the two of you and what you have outstanding
 * sit. The counts just became the controls, and the fish and goose moved
 * into the chips that are theirs.
 *
 * Two faces, cross-faded:
 *
 * - **Chips** — "Your turn", "{Partner}'s turn", "Decided", each with its
 *   count; at most one selected, and none selected is "everything". Tapping
 *   the selected chip again clears it. A magnifier sits at the end.
 * - **Search** — the magnifier opens a field over the row with the keyboard
 *   up. Return, or the keyboard going away (iOS/Android), folds it back
 *   into the chips with what you typed kept as a `“beach” ×` pill at the
 *   front, so the chips then narrow the search. Cancel throws it away.
 *
 *   **Not on blur.** Folding on the field's blur unmounted Cancel before
 *   its press could land: on web the blur fires on pointer-down and
 *   react-native-web starts a press ~50 ms later, so tapping Cancel kept
 *   the search as a pill instead of clearing it. The keyboard hiding is the
 *   signal that means "I'm done typing"; a tap on Cancel does not hide it
 *   first (the queue's ScrollView persists handled taps).
 *
 * Pure: the screen owns the filter, the query and whether the field is open.
 */

type QueueFilterBarProps = {
	counts: BucketCounts;
	filter: QueueFilter;
	onFilterChange: (filter: QueueFilter) => void;
	/** The viewer's display name, for the fish's accessible name. */
	you: string;
	/** `null` when nobody is linked — the chip says "Partner's turn". */
	partner: string | null;
	query: string;
	onQueryChange: (query: string) => void;
	searchOpen: boolean;
	onOpenSearch: () => void;
	/** Fold the field back into the row, keeping the query. */
	onCloseSearch: () => void;
	/** Clear the query and fold the field away. */
	onCancelSearch: () => void;
};

const TONE: Record<QueueBucket, FilterChipTone> = { yours: "a", theirs: "b", decided: "neutral" };

function bucketLabel(bucket: QueueBucket, partner: string | null): string {
	if (bucket === "yours") return "Your turn";
	if (bucket === "theirs") return `${partner ?? "Partner"}'s turn`;
	return "Decided";
}

/** One face of the bar, faded in over `DUR.fast` when it mounts. */
function FadeIn({ children }: { children: React.ReactNode }) {
	const reducedMotion = useReducedMotion();
	const opacity = useSharedValue(reducedMotion ? 1 : 0);

	React.useEffect(() => {
		opacity.value = reducedMotion ? 1 : withTiming(1, { duration: DUR.fast });
	}, [opacity, reducedMotion]);

	const style = useAnimatedStyle(() => ({ opacity: opacity.value }), [opacity]);

	return (
		<AnimatedView style={style} className="w-full flex-row items-center gap-2">
			{children}
		</AnimatedView>
	);
}

/** What you searched for, kept in the row once the keyboard has gone. */
function QueryPill({
	query,
	onEdit,
	onClear,
}: {
	query: string;
	onEdit: () => void;
	onClear: () => void;
}) {
	return (
		<View className="min-h-10 flex-row items-center rounded-chip border border-line bg-surface pl-3 pr-1">
			<Pressable
				role="button"
				accessibilityLabel={`Search: ${query}. Edit search`}
				onPress={onEdit}
				hitSlop={{ top: 2, bottom: 2 }}
				className="max-w-[160px] flex-row items-center gap-1.5 py-1"
			>
				<SearchGlyph size={14} color={NEUTRAL.ink2} />
				<TextClassContext.Provider value="text-[15px] font-medium leading-5 text-ink">
					<Text numberOfLines={1}>“{query}”</Text>
				</TextClassContext.Provider>
			</Pressable>
			<Pressable
				role="button"
				accessibilityLabel="Clear search"
				onPress={onClear}
				hitSlop={{ top: 6, bottom: 6, left: 4, right: 6 }}
				className="ml-1 h-8 w-8 items-center justify-center rounded-chip"
			>
				<CloseGlyph size={14} color={NEUTRAL.ink2} />
			</Pressable>
		</View>
	);
}

/** The search face: the field, and Cancel. */
function SearchFace({
	query,
	onQueryChange,
	onCloseSearch,
	onCancelSearch,
}: Pick<QueueFilterBarProps, "query" | "onQueryChange" | "onCloseSearch" | "onCancelSearch">) {
	// Through a ref so a new callback identity does not re-subscribe.
	const close = React.useRef(onCloseSearch);
	close.current = onCloseSearch;

	// Dismissing the keyboard (drag, tap outside, the hide key) is "done
	// typing": fold into the pill. Web has no keyboard event; Return folds
	// there, and Cancel is always reachable because nothing else folds it.
	React.useEffect(() => {
		if (Platform.OS === "web") return;
		const sub = Keyboard.addListener("keyboardDidHide", () => close.current());
		return () => sub.remove();
	}, []);

	return (
		<View testID="queue-filter-bar" className="mt-4">
			<FadeIn>
				<View className="min-w-0 flex-1">
					<Input
						testID="queue-search-input"
						accessibilityLabel="Search decisions"
						placeholder="Search decisions"
						value={query}
						onChangeText={onQueryChange}
						autoFocus
						autoCorrect={false}
						autoCapitalize="none"
						returnKeyType="search"
						clearButtonMode="while-editing"
						onSubmitEditing={onCloseSearch}
					/>
				</View>
				<Pressable
					role="button"
					accessibilityLabel="Cancel search"
					onPress={onCancelSearch}
					hitSlop={8}
					className="min-h-10 shrink-0 justify-center px-1"
				>
					<TextClassContext.Provider value="text-[15px] font-medium leading-5 text-ink-2">
						<Text>Cancel</Text>
					</TextClassContext.Provider>
				</Pressable>
			</FadeIn>
		</View>
	);
}

function QueueFilterBar({
	counts,
	filter,
	onFilterChange,
	you,
	partner,
	query,
	onQueryChange,
	searchOpen,
	onOpenSearch,
	onCloseSearch,
	onCancelSearch,
}: QueueFilterBarProps) {
	if (searchOpen) {
		return (
			<SearchFace
				query={query}
				onQueryChange={onQueryChange}
				onCloseSearch={onCloseSearch}
				onCancelSearch={onCancelSearch}
			/>
		);
	}

	return (
		<View testID="queue-filter-bar" className="mt-4">
			<FadeIn>
				<View
					accessibilityLabel="Filter decisions"
					className="min-w-0 flex-1 flex-row flex-wrap items-center gap-2"
				>
					{query ? <QueryPill query={query} onEdit={onOpenSearch} onClear={onCancelSearch} /> : null}
					{QUEUE_BUCKETS.map((bucket) => (
						<FilterChip
							key={bucket}
							testID={`queue-filter-${bucket}`}
							label={bucketLabel(bucket, partner)}
							count={counts[bucket]}
							tone={TONE[bucket]}
							selected={filter === bucket}
							onPress={() => onFilterChange(filter === bucket ? "all" : bucket)}
							leading={
								bucket === "yours" ? (
									<Character kind="fish" size={32} name={you} />
								) : bucket === "theirs" && partner ? (
									<Character kind="goose" size={32} name={partner} />
								) : undefined
							}
						/>
					))}
				</View>
				{query ? null : (
					<IconButton
						label="Search decisions"
						onPress={onOpenSearch}
						className="h-10 w-10 shrink-0 self-start"
						hitSlop={2}
					>
						<SearchGlyph size={18} color={NEUTRAL.ink2} />
					</IconButton>
				)}
			</FadeIn>
		</View>
	);
}

export { QueueFilterBar, bucketLabel };
export type { QueueFilterBarProps };
