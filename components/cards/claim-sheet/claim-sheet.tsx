import * as React from "react";
import { Pressable, View } from "react-native";
import {
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { CheckCircle } from "phosphor-react-native";

import { CardArt } from "@/components/cards/card-art/card-art";
import { DailyMark } from "@/components/cards/daily-mark/daily-mark";
import type {
	CardSeat,
	PersonSeat,
} from "@/components/cards/responsibility-card/responsibility-card";
import { AnimatedView } from "@/components/ui/reusables/animated/animated";
import { Button } from "@/components/ui/reusables/button/button";
import { Character } from "@/components/ui/reusables/character/character";
import { Body, Caption } from "@/components/ui/reusables/headline/headline";
import { Text } from "@/components/ui/reusables/text/text";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { CATEGORY_LABEL, type CardCategory } from "@/lib/responsibility-deck";
import { cn } from "@/lib/utils";
import { DUR, SPRING } from "@/theme/motion";
import { usePersonColors } from "@/theme/usePersonColors";

/**
 * ClaimSheet: the body of the sheet a card opens into. It answers one
 * question, **whose card is this?**
 *
 * Top: the card's picture and what holding it means. Then the two of you,
 * side by side, as the Fish (you) and the Goose (your partner). Tap one and
 * the card is theirs: the tile presses in, the character hops, and the
 * screen closes the sheet a beat later (`CLAIM_CLOSE_DELAY`) so the pick is
 * seen to land.
 *
 * Tapping the person who already holds it changes nothing and still closes,
 * so "yes, that's right" is one tap too. Giving the card back to the deck
 * and removing it are the two quiet buttons underneath.
 *
 * Nothing here tracks whether the job got done. That is a later feature; a
 * card is first of all something one of you owns.
 *
 * **Pure.** The screen has turned user ids into seats and owns the writes.
 */

/** How long the screen waits after a pick before closing the sheet (ms). */
const CLAIM_CLOSE_DELAY = 480;

interface ClaimSheetProps {
	category: CardCategory;
	daily: boolean;
	deckKey?: string | null;
	/** What the card asks of its holder. `null` on a card the couple wrote. */
	about: string | null;
	holder: CardSeat;
	/** The partner's name. `null` while no partner is linked: their tile is left out. */
	partnerLabel: string | null;
	/** A person to give the card to, or `"none"` to put it back in the deck. */
	onDeal: (seat: CardSeat) => void;
	onRemove: () => void;
}

const TILE_CLASS: Record<PersonSeat, string> = {
	a: "bg-person-a-tint",
	b: "bg-person-b-tint",
};

const NAME_CLASS: Record<PersonSeat, string> = {
	a: "text-person-a-deep",
	b: "text-person-b-deep",
};

function PersonTile({
	seat,
	name,
	holds,
	picked,
	dimmed,
	onPick,
}: {
	seat: PersonSeat;
	name: string;
	/** Holds the card right now. */
	holds: boolean;
	/** Was just tapped: the character hops. */
	picked: boolean;
	/** The other person was just tapped. */
	dimmed: boolean;
	onPick: () => void;
}) {
	const person = usePersonColors();
	const reducedMotion = useReducedMotion();
	const scale = useSharedValue(1);

	React.useEffect(() => {
		if (!picked || reducedMotion) return;
		// One press-in and one settle (tokens.md §8: nothing bounces twice).
		scale.value = withSequence(
			withTiming(0.94, { duration: DUR.fast }),
			withSpring(1, SPRING.gentle),
		);
	}, [picked, reducedMotion, scale]);

	const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }), [scale]);

	return (
		<AnimatedView style={style} className={cn("min-w-0 flex-1", dimmed && "opacity-40")}>
			<Pressable
				role="button"
				accessibilityLabel={
					holds ? `${name}, holds this card` : `Give this card to ${name === "You" ? "you" : name}`
				}
				accessibilityState={{ selected: holds }}
				onPress={onPick}
				className={cn(
					"items-center gap-1 rounded-tile px-3 pb-4 pt-3 active:opacity-80",
					TILE_CLASS[seat],
				)}
			>
				<Character
					kind={seat === "a" ? "fish" : "goose"}
					person={seat}
					size={96}
					pose={picked ? "celebrate" : "idle"}
					name={name}
				/>
				<Text
					numberOfLines={1}
					className={cn("text-[18px] font-semibold leading-[24px]", NAME_CLASS[seat])}
				>
					{name}
				</Text>
				{/* The line is always there, so the tile does not jump when it fills in. */}
				<View className="h-5 flex-row items-center gap-1">
					{holds || picked ? (
						<>
							<CheckCircle size={16} weight="fill" color={person[seat].deep} />
							<Caption className={NAME_CLASS[seat]}>{seat === "a" ? "Yours" : "Theirs"}</Caption>
						</>
					) : (
						<Caption className={NAME_CLASS[seat]}>Tap to give</Caption>
					)}
				</View>
			</Pressable>
		</AnimatedView>
	);
}

function ClaimSheet({
	category,
	daily,
	deckKey,
	about,
	holder,
	partnerLabel,
	onDeal,
	onRemove,
}: ClaimSheetProps) {
	/** The tile tapped in this opening of the sheet, until the sheet closes. */
	const [picked, setPicked] = React.useState<PersonSeat | null>(null);

	const pick = (seat: PersonSeat) => {
		if (picked) return;
		setPicked(seat);
		onDeal(seat);
	};

	// The art and the stamp follow the pick at once, without waiting for the write.
	const shown: CardSeat = picked ?? holder;

	return (
		<View className="gap-5 pb-1">
			<View className="items-center gap-3">
				<CardArt deckKey={deckKey} category={category} seat={shown} size={96} />
				<View className="flex-row items-center gap-2">
					<Caption className="text-ink-3">{CATEGORY_LABEL[category]}</Caption>
					{daily ? <DailyMark seat={shown} /> : null}
				</View>
				{about ? <Body className="text-center text-ink-2">{about}</Body> : null}
			</View>

			<View className="gap-2">
				<Text role="heading" aria-level={2} className="text-center text-row font-semibold text-ink">
					Whose card is this?
				</Text>
				<View role="radiogroup" accessibilityLabel="Whose card is this?" className="flex-row gap-3">
					<PersonTile
						seat="a"
						name="You"
						holds={holder === "a"}
						picked={picked === "a"}
						dimmed={picked === "b"}
						onPick={() => pick("a")}
					/>
					{partnerLabel ? (
						<PersonTile
							seat="b"
							name={partnerLabel}
							holds={holder === "b"}
							picked={picked === "b"}
							dimmed={picked === "a"}
							onPick={() => pick("b")}
						/>
					) : null}
				</View>
			</View>

			<View className="border-t border-line pt-2">
				{holder !== "none" ? (
					<Button
						variant="ghost"
						className="h-12 w-full rounded-button"
						accessibilityLabel="Put back in the deck"
						onPress={() => onDeal("none")}
					>
						<Text className="text-row font-semibold text-ink-2">Put back in the deck</Text>
					</Button>
				) : null}
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

export { CLAIM_CLOSE_DELAY, ClaimSheet };
export type { ClaimSheetProps };
