import * as React from "react";
import { View } from "react-native";

import { Character } from "@/components/ui/reusables/character/character";
import { Caption } from "@/components/ui/reusables/headline/headline";
import { Text, TextClassContext } from "@/components/ui/reusables/text/text";
import { cn } from "@/lib/utils";

import {
	COPY,
	type DecisionRound,
	type Person,
	type RoundTone,
	type VoterMark,
} from "./decision-card.model";

/**
 * The poll body's head: the round label, then the two people side by side
 * (FEATURE-INVENTORY §1.10a — "Two `VotingStatusIndicator`s side by side").
 *
 * Each person is a `Character` at 32 px (tokens.md §9: the 32 px mark stands
 * in for an avatar "next to each person's vote") **plus a line of text**. The
 * text is not decoration: a Character's accessible label is only "Fish,
 * Chase" — its pose is invisible to a screen reader — so a character can
 * never be the sole carrier of a status. The words come from the model
 * (`COPY.voter`) so they are pinned in the same table as the mark itself.
 *
 * The round label is the first link in tokens.md §10's round-colour thread.
 */

type PollRoundProps = {
	round: DecisionRound;
	tone: RoundTone;
	you: Person;
	youMark: VoterMark;
	partner: Person;
	partnerMark: VoterMark;
};

/** The round label's colour. `neutral` cannot reach here — poll always has one. */
const TONE_TEXT: Record<RoundTone, string> = {
	a: "text-person-a-deep",
	b: "text-person-b-deep",
	together: "text-ink",
	neutral: "text-ink-2",
};

/**
 * Pose and muting are separate axes on `Character`, and the four marks use
 * both: "selected" and "idle" are the same pose — you have not acted either
 * way — and it is the colour that says one of them has a pick in flight.
 */
const POSE: Record<VoterMark, "idle" | "celebrate" | "blocked"> = {
	idle: "idle",
	selected: "idle",
	voted: "celebrate",
	blocked: "blocked",
};

function Voter({ person, mark }: { person: Person; mark: VoterMark }) {
	return (
		<View className="flex-row items-center gap-2">
			<Character
				kind={person.person === "a" ? "fish" : "goose"}
				person={person.person}
				size={32}
				pose={POSE[mark]}
				// Nobody is drawn in their own colour until they have done
				// something: full colour on an untouched seat reads as "acted".
				muted={mark === "idle"}
				name={person.name}
			/>
			<Caption>{COPY.voter(person.name, mark)}</Caption>
		</View>
	);
}

function PollRound({ round, tone, you, youMark, partner, partnerMark }: PollRoundProps) {
	return (
		<View testID="decision-card-poll-round">
			<TextClassContext.Provider
				value={cn("text-[13px] font-semibold leading-[18px]", TONE_TEXT[tone])}
			>
				<Text>{COPY.round(round)}</Text>
			</TextClassContext.Provider>

			<View className="mt-3 flex-row flex-wrap items-center gap-x-4 gap-y-2">
				<Voter person={you} mark={youMark} />
				<Voter person={partner} mark={partnerMark} />
			</View>
		</View>
	);
}

export { PollRound };
export type { PollRoundProps };
