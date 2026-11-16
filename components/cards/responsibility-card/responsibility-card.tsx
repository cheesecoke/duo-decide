import * as React from "react";
import { View } from "react-native";
import {
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withSpring,
	withTiming,
} from "react-native-reanimated";

import { CardArt } from "@/components/cards/card-art/card-art";
import { DailyMark } from "@/components/cards/daily-mark/daily-mark";
import { AnimatedView } from "@/components/ui/reusables/animated/animated";
import { Card } from "@/components/ui/reusables/card/card";
import { Caption } from "@/components/ui/reusables/headline/headline";
import { Text } from "@/components/ui/reusables/text/text";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { CATEGORY_LABEL, type CardCategory } from "@/lib/responsibility-deck";
import { cn } from "@/lib/utils";
import { DUR, SPRING } from "@/theme/motion";

/**
 * ResponsibilityCard: the face of one card in the couple's deck.
 *
 * It is drawn as a card, not a list row: the kind in one corner, the daily
 * stamp in the other, the picture in the middle, the name under it, and along
 * the bottom who owns it.
 *
 * **Pure.** The card arrives as props. The screen has already turned user ids
 * into seats, because the card cannot know who is looking at it: `"a"` is the
 * viewer, `"b"` is their partner, `"none"` is not dealt yet.
 *
 * `Card` wears the holder's seat (tokens.md §10), and the art and the stamp
 * follow it, so a glance across the deck shows who is carrying what in the
 * colours the queue already taught. When the card changes hands it pops once,
 * so the eye finds the card that was just claimed after the sheet closes.
 *
 * The whole face is one button that opens the claim sheet (`ClaimSheet`).
 * Nothing smaller is tappable here: a deck is dozens of these, two across,
 * and a row of small controls on each would be targets nobody could hit.
 */

type CardSeat = "a" | "b" | "none";
type PersonSeat = Exclude<CardSeat, "none">;

interface ResponsibilityCardProps {
	title: string;
	category: CardCategory;
	/** Comes round every day and can't be put off. */
	daily: boolean;
	/** Set on starter-deck cards; picks the picture. */
	deckKey?: string | null;
	holder: CardSeat;
	/** The partner's name. `null` while no partner is linked. */
	partnerLabel: string | null;
	onOpen: () => void;
}

const SEAT_STATE = { a: "a", b: "b", none: "neutral" } as const;

const DOT_CLASS: Record<CardSeat, string> = {
	a: "bg-person-a-base",
	b: "bg-person-b-base",
	none: "bg-ink-3",
};

/** "You", the partner's name, or "Not dealt". */
function holderName(holder: CardSeat, partnerLabel: string | null): string {
	if (holder === "a") return "You";
	if (holder === "b") return partnerLabel ?? "Partner";
	return "Not dealt";
}

/** What a screen reader hears for the whole face. */
function cardLabel({
	title,
	category,
	daily,
	holder,
	partnerLabel,
}: Pick<
	ResponsibilityCardProps,
	"title" | "category" | "daily" | "holder" | "partnerLabel"
>): string {
	const owner =
		holder === "a" ? "Yours" : holder === "b" ? `${partnerLabel ?? "Your partner"}'s` : "Not dealt";
	return [title, `${CATEGORY_LABEL[category]}${daily ? ", every day" : ""}`, owner].join(". ");
}

function ResponsibilityCard(props: ResponsibilityCardProps) {
	const { title, category, daily, deckKey, holder, partnerLabel, onOpen } = props;
	const reducedMotion = useReducedMotion();
	const scale = useSharedValue(1);

	const previousHolder = React.useRef(holder);
	React.useEffect(() => {
		const changed = previousHolder.current !== holder;
		previousHolder.current = holder;
		if (!changed || holder === "none" || reducedMotion) return;
		scale.value = withSequence(
			withTiming(1.05, { duration: DUR.fast }),
			withSpring(1, SPRING.gentle),
		);
	}, [holder, reducedMotion, scale]);

	const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }), [scale]);

	return (
		<AnimatedView style={popStyle}>
			<Card
				state={SEAT_STATE[holder]}
				onPress={onOpen}
				accessibilityLabel={cardLabel(props)}
				accessibilityHint="Opens the card to choose who owns it"
				className="active:opacity-80"
			>
				<View className="items-center gap-3">
					<View className="min-h-6 w-full flex-row items-center justify-between gap-2">
						<Caption className="text-ink-3">{CATEGORY_LABEL[category]}</Caption>
						{daily ? <DailyMark seat={holder} /> : null}
					</View>

					<CardArt deckKey={deckKey} category={category} seat={holder} size={76} />

					{/* Two lines reserved, so a row of cards keeps one baseline. */}
					<View className="min-h-10 w-full justify-center">
						<Text numberOfLines={2} className="text-center text-row font-semibold text-ink">
							{title}
						</Text>
					</View>

					<View className="min-h-5 w-full flex-row items-center justify-center gap-1.5">
						<View className={cn("h-2 w-2 rounded-chip", DOT_CLASS[holder])} />
						<Caption numberOfLines={1} className={holder === "none" ? "text-ink-3" : "text-ink-2"}>
							{holderName(holder, partnerLabel)}
						</Caption>
					</View>
				</View>
			</Card>
		</AnimatedView>
	);
}

export { ResponsibilityCard, cardLabel, holderName };
export type { CardSeat, PersonSeat, ResponsibilityCardProps };
