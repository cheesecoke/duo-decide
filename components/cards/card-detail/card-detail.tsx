import * as React from "react";
import { Pressable, View } from "react-native";
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
 * A card is a standing responsibility, so nothing here is ever "finished".
 * What gets recorded is **the days it was done**, so the couple can see the
 * pattern: how often, and when it slips.
 *
 *   1. **Log a day.** Only the holder can: the card is theirs. The black
 *      button is today; the strip under it is the last seven days, and
 *      tapping a day logs it or takes it back ("I watered the plants on the
 *      15th"). For the other partner the strip is the same picture, read
 *      only.
 *   2. **Hand it over.** The two chips are the deal; tapping the holder's
 *      chip a second time puts the card back in the deck.
 *   3. **See the pattern.** The latest logged days, newest first.
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

interface CardDay {
	/** `YYYY-MM-DD`. */
	day: string;
	/** One letter: "M", "T", "W". */
	weekday: string;
	/** Day of the month: "15". */
	date: string;
	/** What a screen reader hears: "Sunday, November 15", or "Today". */
	label: string;
	/** The holder has logged it. */
	done: boolean;
}

interface CardDetailProps {
	category: CardCategory;
	daily: boolean;
	deckKey?: string | null;
	holder: CardSeat;
	/** The partner's name. `null` while no partner is linked: their chip is left out. */
	partnerLabel: string | null;
	/** The last seven days, oldest first, today last. */
	week: CardDay[];
	log: CardLogEntry[];
	/** Logs a day, or takes it back if it is already logged. Holder only. */
	onToggleDay: (day: string, done: boolean) => void;
	onDeal: (seat: CardSeat) => void;
	onRemove: () => void;
}

const DOT_CLASS: Record<PersonSeat, string> = {
	a: "bg-person-a-base",
	b: "bg-person-b-base",
};

const DAY_DONE_CLASS: Record<CardSeat, string> = {
	a: "bg-person-a-tint",
	b: "bg-person-b-tint",
	none: "bg-surface-2",
};

const DAY_DONE_TEXT: Record<CardSeat, string> = {
	a: "text-person-a-deep",
	b: "text-person-b-deep",
	none: "text-ink-2",
};

function CardDetail({
	category,
	daily,
	deckKey,
	holder,
	partnerLabel,
	week,
	log,
	onToggleDay,
	onDeal,
	onRemove,
}: CardDetailProps) {
	const person = usePersonColors();
	const canLog = holder === "a";
	const today = week[week.length - 1];
	const holderIs = holder === "b" ? (partnerLabel ?? "Your partner") : null;

	return (
		<View className="gap-5 pb-1">
			<View className="items-center gap-3">
				<CardArt deckKey={deckKey} category={category} seat={holder} size={112} />
				<View className="flex-row items-center gap-2">
					<Caption className="text-ink-3">{CATEGORY_LABEL[category]}</Caption>
					{daily ? <DailyMark seat={holder} /> : null}
				</View>
			</View>

			{canLog && today ? (
				today.done ? (
					<View
						testID="card-detail-done"
						className="h-14 flex-row items-center justify-between rounded-button bg-person-a-tint pl-5 pr-2"
					>
						<View className="flex-row items-center gap-2">
							<CheckCircle size={22} weight="fill" color={person.a.deep} />
							<Text className="text-[16px] font-semibold leading-[22px] text-person-a-deep">
								Did it today
							</Text>
						</View>
						<Button
							variant="ghost"
							className="h-11 rounded-button px-4"
							accessibilityLabel="Undo today"
							onPress={() => onToggleDay(today.day, true)}
						>
							<Text className="text-row font-semibold text-person-a-deep">Undo</Text>
						</Button>
					</View>
				) : (
					<Button
						className="h-14 w-full rounded-button"
						accessibilityLabel="I did this today"
						onPress={() => onToggleDay(today.day, false)}
					>
						<Text className="text-[16px] font-semibold leading-[22px] text-cta-fg">I did this today</Text>
					</Button>
				)
			) : null}

			<View className="gap-1.5">
				<FieldLabel>The last 7 days</FieldLabel>
				<View testID="card-detail-week" className="flex-row justify-between">
					{week.map((day) => {
						const face = (
							<>
								<Text
									className={cn(
										"text-[12px] font-medium leading-[16px]",
										day.done ? DAY_DONE_TEXT[holder] : "text-ink-3",
									)}
								>
									{day.weekday}
								</Text>
								<Text
									className={cn("text-row font-semibold", day.done ? DAY_DONE_TEXT[holder] : "text-ink-2")}
								>
									{day.date}
								</Text>
							</>
						);
						const dayClass = cn(
							"h-14 w-11 items-center justify-center rounded-field",
							day.done ? DAY_DONE_CLASS[holder] : "bg-surface-2",
						);
						const label = `${day.label}, ${day.done ? "done" : "not logged"}`;

						return canLog ? (
							<Pressable
								key={day.day}
								role="checkbox"
								accessibilityLabel={label}
								accessibilityState={{ checked: day.done }}
								onPress={() => onToggleDay(day.day, day.done)}
								className={cn(dayClass, "active:opacity-70")}
							>
								{face}
							</Pressable>
						) : (
							<View key={day.day} accessible accessibilityLabel={label} className={dayClass}>
								{face}
							</View>
						);
					})}
				</View>
				<Caption className="text-ink-3">
					{canLog
						? "Tap a day to log it, or to take it back."
						: holderIs
							? `${holderIs} holds this card, so ${holderIs} logs it.`
							: "Deal this card to one of you to start logging it."}
				</Caption>
			</View>

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
					<Caption className="text-ink-3">No days logged yet.</Caption>
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
export type { CardDay, CardDetailProps, CardLogEntry };
