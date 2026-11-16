import * as React from "react";
import { View } from "react-native";
import { CheckCircle } from "phosphor-react-native";

import { CardArt } from "@/components/cards/card-art/card-art";
import { DailyMark } from "@/components/cards/daily-mark/daily-mark";
import type {
	CardSeat,
	PersonSeat,
} from "@/components/cards/responsibility-card/responsibility-card";
import { Button } from "@/components/ui/reusables/button/button";
import { Chip } from "@/components/ui/reusables/chip/chip";
import { FieldLabel } from "@/components/ui/reusables/field/field";
import { Caption } from "@/components/ui/reusables/headline/headline";
import { Text } from "@/components/ui/reusables/text/text";
import { CATEGORY_LABEL, type CardCategory } from "@/lib/responsibility-deck";
import { cn } from "@/lib/utils";
import { usePersonColors } from "@/theme/usePersonColors";

/**
 * CardDetail: one card, opened. The body of the sheet the Cards tab shows
 * when a card is tapped.
 *
 * Top to bottom it is the three things a person opens a card to do:
 *
 *   1. **Say it's done.** The one black button. Once tapped it becomes a
 *      quiet "Done today" with an Undo beside it, so a mis-tap is one tap to
 *      fix. Either partner can mark any card: who actually did the job is the
 *      whole point of keeping count.
 *   2. **Hand it over.** The two chips are the deal; tapping the holder's
 *      chip a second time puts the card back in the deck.
 *   3. **See who's been doing it.** The last few marks, newest first.
 *
 * **Pure.** Seats, names and day labels arrive ready to print.
 */

interface CardLogEntry {
	id: string;
	who: PersonSeat;
	/** "You", or the partner's name. */
	name: string;
	/** "Today", "Yesterday", "Sat, Nov 14". */
	when: string;
}

interface CardDetailProps {
	category: CardCategory;
	daily: boolean;
	deckKey?: string | null;
	holder: CardSeat;
	/** The partner's name. `null` while no partner is linked: their chip is left out. */
	partnerLabel: string | null;
	/** The viewer has marked it done today. */
	doneByYouToday: boolean;
	log: CardLogEntry[];
	onDone: () => void;
	onUndo: () => void;
	onDeal: (seat: CardSeat) => void;
	onRemove: () => void;
}

const DOT_CLASS: Record<PersonSeat, string> = {
	a: "bg-person-a-base",
	b: "bg-person-b-base",
};

function CardDetail({
	category,
	daily,
	deckKey,
	holder,
	partnerLabel,
	doneByYouToday,
	log,
	onDone,
	onUndo,
	onDeal,
	onRemove,
}: CardDetailProps) {
	const person = usePersonColors();

	return (
		<View className="gap-5 pb-1">
			<View className="items-center gap-3">
				<CardArt deckKey={deckKey} category={category} seat={holder} size={112} />
				<View className="flex-row items-center gap-2">
					<Caption className="text-ink-3">{CATEGORY_LABEL[category]}</Caption>
					{daily ? <DailyMark seat={holder} /> : null}
				</View>
			</View>

			{doneByYouToday ? (
				<View
					testID="card-detail-done"
					className="h-14 flex-row items-center justify-between rounded-button bg-person-a-tint pl-5 pr-2"
				>
					<View className="flex-row items-center gap-2">
						<CheckCircle size={22} weight="fill" color={person.a.deep} />
						<Text className="text-[16px] font-semibold leading-[22px] text-person-a-deep">
							Done today
						</Text>
					</View>
					<Button
						variant="ghost"
						className="h-11 rounded-button px-4"
						accessibilityLabel="Undo done today"
						onPress={onUndo}
					>
						<Text className="text-row font-semibold text-person-a-deep">Undo</Text>
					</Button>
				</View>
			) : (
				<Button
					className="h-14 w-full rounded-button"
					accessibilityLabel="I did this today"
					onPress={onDone}
				>
					<Text className="text-[16px] font-semibold leading-[22px] text-cta-fg">I did this today</Text>
				</Button>
			)}

			<View className="gap-1.5">
				<FieldLabel>Who holds it</FieldLabel>
				<View role="group" accessibilityLabel="Who holds it" className="flex-row flex-wrap gap-2">
					<Chip
						person="a"
						label="You"
						selected={holder === "a"}
						onPress={() => onDeal(holder === "a" ? "none" : "a")}
					/>
					{partnerLabel ? (
						<Chip
							person="b"
							label={partnerLabel}
							selected={holder === "b"}
							onPress={() => onDeal(holder === "b" ? "none" : "b")}
						/>
					) : null}
				</View>
			</View>

			<View className="gap-1.5">
				<FieldLabel>Lately</FieldLabel>
				{log.length === 0 ? (
					<Caption className="text-ink-3">Nobody has marked this one done yet.</Caption>
				) : (
					<View testID="card-detail-log" className="rounded-field bg-surface-2 px-4">
						{log.map((entry, index) => (
							<View
								key={entry.id}
								className={cn(
									"min-h-11 flex-row items-center justify-between gap-3",
									index > 0 && "border-t border-line",
								)}
							>
								<View className="min-w-0 flex-1 flex-row items-center gap-2">
									<View className={cn("h-2 w-2 rounded-chip", DOT_CLASS[entry.who])} />
									<Text numberOfLines={1} className="text-row font-medium text-ink">
										{entry.name}
									</Text>
								</View>
								<Text className="text-row text-ink-2">{entry.when}</Text>
							</View>
						))}
					</View>
				)}
			</View>

			<View className="border-t border-line pt-2">
				<Button
					variant="ghost"
					className="h-12 w-full rounded-button"
					accessibilityLabel="Remove card"
					onPress={onRemove}
				>
					<Text className="text-row font-semibold text-destructive">Remove card</Text>
				</Button>
			</View>
		</View>
	);
}

export { CardDetail };
export type { CardDetailProps, CardLogEntry };
