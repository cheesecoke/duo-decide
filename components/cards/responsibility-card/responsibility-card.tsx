import * as React from "react";
import { View } from "react-native";
import { CheckCircle } from "phosphor-react-native";

import { CardArt } from "@/components/cards/card-art/card-art";
import { DailyMark } from "@/components/cards/daily-mark/daily-mark";
import { Card } from "@/components/ui/reusables/card/card";
import { Caption } from "@/components/ui/reusables/headline/headline";
import { Text } from "@/components/ui/reusables/text/text";
import { CATEGORY_LABEL, type CardCategory } from "@/lib/responsibility-deck";
import { cn } from "@/lib/utils";
import { usePersonColors } from "@/theme/usePersonColors";

/**
 * ResponsibilityCard: the face of one card in the couple's deck.
 *
 * It is drawn as a card, not a list row: the kind in one corner, the daily
 * stamp in the other, the picture in the middle, the name under it, and along
 * the bottom who holds it and who has done it today.
 *
 * **Pure.** The card arrives as props. The screen has already turned user ids
 * into seats, because the card cannot know who is looking at it: `"a"` is the
 * viewer, `"b"` is their partner, `"none"` is not dealt yet.
 *
 * `Card` wears the holder's seat (tokens.md §10), and the art and the stamp
 * follow it, so a glance across the deck shows who is carrying what in the
 * colours the queue already taught.
 *
 * The whole face is one button that opens the card (`CardDetail`), where it
 * is marked done, handed over or removed. Nothing smaller is tappable here: a
 * deck is twenty of these, two across, and a row of 28 px controls on each
 * would be forty targets nobody could hit.
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
	/** Who has marked it done today. Empty when nobody has. */
	doneToday?: PersonSeat[];
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
	doneToday = [],
}: Pick<
	ResponsibilityCardProps,
	"title" | "category" | "daily" | "holder" | "partnerLabel" | "doneToday"
>): string {
	const held =
		holder === "none"
			? "Not dealt"
			: `Held by ${holderName(holder, partnerLabel).replace(/^You$/, "you")}`;
	const done = doneToday.map((seat) => holderName(seat, partnerLabel).replace(/^You$/, "you"));
	return [
		title,
		`${CATEGORY_LABEL[category]}${daily ? ", every day" : ""}`,
		held,
		...(done.length > 0 ? [`Done today by ${done.join(" and ")}`] : []),
	].join(". ");
}

function ResponsibilityCard(props: ResponsibilityCardProps) {
	const { title, category, daily, deckKey, holder, partnerLabel, doneToday = [], onOpen } = props;
	const person = usePersonColors();

	return (
		<Card
			state={SEAT_STATE[holder]}
			onPress={onOpen}
			accessibilityLabel={cardLabel(props)}
			accessibilityHint="Opens the card"
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

				<View className="min-h-5 w-full flex-row items-center justify-between gap-2">
					<View className="min-w-0 flex-1 flex-row items-center gap-1.5">
						<View className={cn("h-2 w-2 rounded-chip", DOT_CLASS[holder])} />
						<Caption numberOfLines={1} className={holder === "none" ? "text-ink-3" : "text-ink-2"}>
							{holderName(holder, partnerLabel)}
						</Caption>
					</View>

					{doneToday.length > 0 ? (
						<View testID="card-done-today" className="flex-row items-center gap-0.5">
							{doneToday.map((seat) => (
								<CheckCircle key={seat} size={18} weight="fill" color={person[seat].deep} />
							))}
						</View>
					) : null}
				</View>
			</View>
		</Card>
	);
}

export { ResponsibilityCard, cardLabel, holderName };
export type { CardSeat, PersonSeat, ResponsibilityCardProps };
