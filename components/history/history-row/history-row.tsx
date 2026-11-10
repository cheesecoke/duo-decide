import * as React from "react";
import { View } from "react-native";

import {
	ArchiveGlyph,
	CardMenu,
	CardMenuTrigger,
	TrashGlyph,
	useCardMenu,
	type CardMenuItem,
} from "@/components/ui/reusables/card-menu/card-menu";
import { Card } from "@/components/ui/reusables/card/card";
import { Caption, Title } from "@/components/ui/reusables/headline/headline";
import { DecidedOptionRow } from "@/components/ui/reusables/option-row/option-row";

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
 * decider's own hue is not lost: it moves to the winner row.
 *
 * ## The winner is the decision card's winner row
 *
 * The winning option is printed with `DecidedOptionRow`
 * (`reusables/option-row/option-row.tsx`) — the same square `rounded-field`
 * row, tint and tick a decided card in the queue gives its winner, so the two
 * screens read as one system. It used to be a rounded `Chip` pill, and a pill
 * has no room for what options are: sentences, and pasted links that wrapped
 * into a broken-looking capsule. The row gives the text the card's full
 * width.
 *
 * The row wears the **decider's** seat (the queue's winner is always the
 * viewer's, A), so it still says both things §1.12's strip existed to say —
 * which option won, and whose press ended it.
 *
 * It is read-only: not a control, with no role or name of its own, so two
 * rows whose winning options share a title do not put two live targets with
 * one name on the screen. A link inside it is still its own target
 * (`OptionText`) and opens as it does in the queue.
 */

type HistoryRowProps = {
	title: string;
	/** The winning option's title, exactly as stored. */
	chosenOption: string;
	/** "You", or the partner's name. Already resolved. */
	decidedBy: string;
	/** The viewer is A, their partner B — the winner row wears this seat. */
	decidedBySeat: "a" | "b";
	/** Already formatted: "Today", "3 days ago", "Sep 13, 2026". */
	decisionDate: string;
	/** Archived off the queue — the ⋮ menu then offers "Move back to queue". */
	archived?: boolean;
	/** ⋮ → Delete. The screen confirms; the row only asks. No handler, no ⋮. */
	onDelete?: () => void;
	/** ⋮ → Move back to queue, shown only when `archived`. */
	onMoveToQueue?: () => void;
};

function HistoryRow({
	title,
	chosenOption,
	decidedBy,
	decidedBySeat,
	decisionDate,
	archived = false,
	onDelete,
	onMoveToQueue,
}: HistoryRowProps) {
	const menu = useCardMenu();
	const menuItems: CardMenuItem[] = [
		...(archived && onMoveToQueue
			? [{ label: "Move back to queue", icon: <ArchiveGlyph />, onPress: onMoveToQueue }]
			: []),
		...(onDelete
			? [{ label: "Delete", destructive: true, icon: <TrashGlyph />, onPress: onDelete }]
			: []),
	];

	return (
		<Card state="together">
			{/* `items-start` so a wrapped two-line title keeps the date on the
			    first line, where it is read as belonging to the title. */}
			<View className="flex-row items-start gap-3">
				<Title className="flex-1">{title}</Title>
				<Caption className="text-ink-3">{decisionDate}</Caption>
				{menuItems.length > 0 ? <CardMenuTrigger menu={menu} /> : null}
			</View>
			{/* The panel floats in its own Modal, hung off the ⋮ it measures
			    (reusables/card-menu), so the card's clipping no longer reaches
			    it and a tap anywhere outside it closes it. */}
			{menuItems.length > 0 ? (
				<CardMenu menu={menu} testID="history-row-menu" items={menuItems} />
			) : null}

			{/* The seat is spelled into the testID for the same reason `Card`
			    spells its state into one: it is carried by colour, and
			    NativeWind's classes are not exercised under jest. */}
			<DecidedOptionRow
				testID={`history-row-winner-${decidedBySeat}`}
				title={chosenOption}
				seat={decidedBySeat}
				className="mt-3"
			/>
			<Caption className="mt-2">by {decidedBy}</Caption>
		</Card>
	);
}

export { HistoryRow };
export type { HistoryRowProps };
