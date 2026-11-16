import * as React from "react";
import { View } from "react-native";

import {
	CardMenu,
	CardMenuTrigger,
	TrashGlyph,
	useCardMenu,
	type CardMenuItem,
} from "@/components/ui/reusables/card-menu/card-menu";
import { Card } from "@/components/ui/reusables/card/card";
import { Chip } from "@/components/ui/reusables/chip/chip";
import { Caption } from "@/components/ui/reusables/headline/headline";
import { Text } from "@/components/ui/reusables/text/text";
import { CATEGORY_LABEL, type CardCategory } from "@/lib/responsibility-deck";

/**
 * ResponsibilityCard: one job in the couple's shared life, and who holds it.
 *
 * **Pure.** The card arrives as props and every action leaves as a callback.
 * The screen has already turned the holder's user id into a seat, because the
 * card cannot know who is looking at it: `"a"` is the viewer, `"b"` is their
 * partner, `"none"` is not dealt yet.
 *
 * `Card` wears the holder's seat (tokens.md §10: the rail and wash follow the
 * person state), so a glance down the list shows who is carrying what in the
 * colours the queue already taught.
 *
 * One holder, never both: there is no "together" seat here on purpose. The
 * point of a card is that one person owns the whole job.
 *
 * The two chips are the deal. Tapping the holder's own chip a second time
 * puts the card back in the deck, and the ⋯ menu says so in words for anyone
 * who would not guess it.
 */

type CardSeat = "a" | "b" | "none";

interface ResponsibilityCardProps {
	title: string;
	category: CardCategory;
	/** Comes round every day and can't be put off. */
	daily: boolean;
	holder: CardSeat;
	/** The viewer's own chip. Always "You". */
	youLabel?: string;
	/** The partner's name. `null` while no partner is linked: their chip is left out. */
	partnerLabel: string | null;
	onDeal: (seat: CardSeat) => void;
	onRemove: () => void;
}

const SEAT_STATE = { a: "a", b: "b", none: "neutral" } as const;

/** "Home", or "Home · Daily". */
function cardMeta(category: CardCategory, daily: boolean): string {
	return daily ? `${CATEGORY_LABEL[category]} · Daily` : CATEGORY_LABEL[category];
}

function ResponsibilityCard({
	title,
	category,
	daily,
	holder,
	youLabel = "You",
	partnerLabel,
	onDeal,
	onRemove,
}: ResponsibilityCardProps) {
	const menu = useCardMenu();

	const items: CardMenuItem[] = [
		...(holder === "none" ? [] : [{ label: "Put back in the deck", onPress: () => onDeal("none") }]),
		{ label: "Remove card", destructive: true, icon: <TrashGlyph />, onPress: onRemove },
	];

	return (
		<View className="relative">
			<Card state={SEAT_STATE[holder]} role="group" accessibilityLabel={title}>
				<View className="flex-row items-start gap-2.5">
					<View className="min-w-0 flex-1 gap-0.5">
						<Text className="text-row font-semibold text-ink">{title}</Text>
						<Caption className="text-ink-3">{cardMeta(category, daily)}</Caption>
					</View>

					{/* Named after the card: a deck is twenty of these on one screen. */}
					<CardMenuTrigger menu={menu} label={`More for ${title}`} />
				</View>

				<View
					role="group"
					accessibilityLabel={`Who holds ${title}`}
					className="mt-3 flex-row flex-wrap gap-2"
				>
					<Chip
						size="sm"
						person="a"
						label={youLabel}
						selected={holder === "a"}
						onPress={() => onDeal(holder === "a" ? "none" : "a")}
					/>
					{partnerLabel ? (
						<Chip
							size="sm"
							person="b"
							label={partnerLabel}
							selected={holder === "b"}
							onPress={() => onDeal(holder === "b" ? "none" : "b")}
						/>
					) : null}
				</View>
			</Card>

			<CardMenu menu={menu} testID="responsibility-card-menu" items={items} />
		</View>
	);
}

export { ResponsibilityCard, cardMeta };
export type { CardSeat, ResponsibilityCardProps };
