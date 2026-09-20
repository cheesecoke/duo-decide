import * as React from "react";
import { View } from "react-native";

import { Card } from "@/components/ui/reusables/card/card";
import { Chip } from "@/components/ui/reusables/chip/chip";
import { Caption, Title } from "@/components/ui/reusables/headline/headline";

/**
 * HistoryRow — one settled decision (FEATURE-INVENTORY §1.12's history item).
 *
 * Pure: every fact arrives as a prop, already formatted. The date is
 * `formatRelativeDate`'s output and the seat is `toHistoryDecision`'s
 * (`components/history/history.model.ts`), so this file has no clock, no
 * database row and no user context in it.
 *
 * ## Why `together`
 *
 * tokens.md §10's ruling: the card's rail and wash follow the person state,
 * and a **completed** decision is `together` — whoever pressed the button,
 * the pair arrived at it. Every row on this screen is therefore the gradient
 * card, which is also the card the round-2 review singled out to keep. The
 * decider's own hue is not lost: it moves to the chip.
 *
 * ## The winner strip is the queue's colour thread
 *
 * §1.12's strip was a grey inset with a yellow thumbs-up glyph in it. The
 * glyph is **dropped**: a selected chip in the decider's seat says both
 * things the strip existed to say — which option won, and whose press ended
 * it — in the same shape the Decision Queue uses for a chosen option, so the
 * two screens read as one system. `disabled` makes it inert without fading
 * it: Chip only dims a disabled chip that is *not* selected, precisely so the
 * answer stays the loudest mark on a finished card.
 *
 * The chip is a `checkbox` with `checked` and `disabled` set, which is what
 * Chip renders for any selected-and-inert pill. It is not a control — nothing
 * on this row is pressable — so two rows whose winning options happen to
 * share a title do not put two live targets with one name on the screen.
 */

type HistoryRowProps = {
	title: string;
	/** The winning option's title — the chip's label. */
	chosenOption: string;
	/** "You", or the partner's name. Already resolved. */
	decidedBy: string;
	/** The viewer is A, their partner B — the chip wears this seat. */
	decidedBySeat: "a" | "b";
	/** Already formatted: "Today", "3 days ago", "Sep 13, 2026". */
	decisionDate: string;
};

function HistoryRow({
	title,
	chosenOption,
	decidedBy,
	decidedBySeat,
	decisionDate,
}: HistoryRowProps) {
	return (
		<Card state="together">
			{/* `items-start` so a wrapped two-line title keeps the date on the
			    first line, where it is read as belonging to the title. */}
			<View className="flex-row items-start gap-3">
				<Title className="flex-1">{title}</Title>
				<Caption className="text-ink-3">{decisionDate}</Caption>
			</View>

			<View className="mt-3 flex-row flex-wrap items-center gap-2">
				{/* The seat is spelled into the testID for the same reason
				    `Card` spells its state into one: it is carried by colour,
				    and NativeWind's classes are not exercised under jest.

				    `readOnly`, not `disabled`: this row is a record, and the
				    chip is how it prints the option that won. A disabled chip
				    would still be a checkbox — one a screen reader offers and
				    then refuses — on a screen with no voting on it at all
				    (PLAN-3 final review M3). */}
				<Chip
					testID={`history-row-chip-${decidedBySeat}`}
					label={chosenOption}
					person={decidedBySeat}
					selected
					readOnly
					className="shrink"
				/>
				<Caption>by {decidedBy}</Caption>
			</View>
		</Card>
	);
}

export { HistoryRow };
export type { HistoryRowProps };
