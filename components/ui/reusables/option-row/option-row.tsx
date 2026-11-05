import * as React from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { OptionText } from "@/components/ui/reusables/option-text/option-text";
import { cn } from "@/lib/utils";
import { NEUTRAL } from "@/theme/neutrals";

/**
 * OptionRow — the pieces of an option row that more than one screen draws.
 *
 * The decision card's option list (`decision-queue/decision-card/
 * option-rows.tsx`) is a square `rounded-field` box of rows: the option's
 * text on the left, wrapping at the row's full width, and its mark on the far
 * right. It replaced the rounded `Chip` pills, which had no room for what
 * options actually are — sentences, and pasted links that wrapped into a
 * broken-looking capsule.
 *
 * - `OptionMark` — the mark: an empty ring, or a filled circle with a tick in
 *   a seat's `deep`.
 * - `OptionRowContent` — the text and the mark, laid out as one row. The
 *   card's pressable radio row and `DecidedOptionRow` both render it, so the
 *   two can't drift.
 * - `DecidedOptionRow` — a decided winner on its own, read-only: one row in
 *   the box, on the seat's `tint`, with the tick. The History screen prints
 *   each decision's winner with it.
 *
 * ## Seats
 *
 * The card's pick is always person A's (the viewer is always A, CLAUDE.md).
 * A history row's winner wears whoever decided it, so the seat is a prop
 * here, defaulting to A.
 */

type Seat = "a" | "b";

const MARK_FILL = { a: "bg-person-a-deep", b: "bg-person-b-deep" } as const;
const WINNER_FILL = { a: "bg-person-a-tint", b: "bg-person-b-tint" } as const;
const WINNER_TEXT = { a: "text-person-a-deep", b: "text-person-b-deep" } as const;

/** One row's box: at least 48 pt tall, text and mark on one line. */
const OPTION_ROW_LAYOUT = "min-h-12 flex-row items-center gap-3 px-4 py-3";

/** The box the rows sit in. */
const OPTION_ROWS_BOX = "overflow-hidden rounded-field border border-line bg-surface";

/** A heavier tick than `CheckGlyph`: it sits on a 24 px fill, not on a page. */
function TickGlyph() {
	return (
		<Svg testID="option-row-tick" width={14} height={14} viewBox="0 0 24 24" fill="none">
			<Path
				d="M5 12.5 9.5 17 19 7"
				stroke={NEUTRAL.surface}
				strokeWidth={3.25}
				strokeLinecap="round"
				strokeLinejoin="round"
				fill="none"
			/>
		</Svg>
	);
}

type OptionMarkProps = {
	checked: boolean;
	/** Fades an empty ring to 40 %. A checked mark never steps back. */
	muted?: boolean;
	/** Whose `deep` a checked mark is filled with. */
	seat?: Seat;
};

/**
 * No label of its own: the row it sits in carries the state (a radio's
 * `checked`, or on a history row the "by …" line beside it).
 */
function OptionMark({ checked, muted = false, seat = "a" }: OptionMarkProps) {
	return checked ? (
		<View
			testID="option-row-mark-checked"
			className={cn("h-6 w-6 shrink-0 items-center justify-center rounded-full", MARK_FILL[seat])}
		>
			<TickGlyph />
		</View>
	) : (
		<View
			testID="option-row-mark-empty"
			className={cn("h-6 w-6 shrink-0 rounded-full border-2 border-ink-3", muted && "opacity-40")}
		/>
	);
}

type OptionRowContentProps = {
	/** The option's title, exactly as stored. Links in it stay tappable. */
	title: string;
	checked: boolean;
	/** The decided winner: its text takes the seat's `deep`. */
	winner?: boolean;
	/** A dead row that is not the pick: its text and ring fade to 40 %. */
	muted?: boolean;
	seat?: Seat;
};

/**
 * The text and the mark. The caller owns the row around them (its layout is
 * `OPTION_ROW_LAYOUT`) — a `Pressable` radio on the card, a plain `View` on a
 * history row.
 */
function OptionRowContent({
	title,
	checked,
	winner = false,
	muted = false,
	seat = "a",
}: OptionRowContentProps) {
	return (
		<>
			<OptionText
				text={title}
				tone={seat}
				className={cn(
					"min-w-0 flex-1 text-row text-ink",
					checked && "font-semibold",
					winner && WINNER_TEXT[seat],
					muted && "opacity-40",
				)}
			/>
			<OptionMark checked={checked} muted={muted} seat={seat} />
		</>
	);
}

type DecidedOptionRowProps = {
	/** The winning option's title, exactly as stored. */
	title: string;
	/** Whose press decided it: the tint, the text and the tick wear this seat. */
	seat?: Seat;
	testID?: string;
	className?: string;
};

/**
 * A decided winner, read-only: the card's winner row on its own.
 *
 * Not pressable, and not given an accessible name or role of its own: it is a
 * record, and its text is already in the tree. That also leaves a link inside
 * it as its own target — nothing here can swallow the press, and a screen
 * reader can still reach the link (an `accessible` wrapper on iOS/Android
 * would fold it into one element).
 */
function DecidedOptionRow({ title, seat = "a", testID, className }: DecidedOptionRowProps) {
	return (
		<View testID={testID} className={cn(OPTION_ROWS_BOX, className)}>
			<View className={cn(OPTION_ROW_LAYOUT, WINNER_FILL[seat])}>
				<OptionRowContent title={title} checked winner seat={seat} />
			</View>
		</View>
	);
}

export {
	DecidedOptionRow,
	OPTION_ROW_LAYOUT,
	OPTION_ROWS_BOX,
	OptionMark,
	OptionRowContent,
	WINNER_FILL,
};
export type { DecidedOptionRowProps, OptionMarkProps, OptionRowContentProps, Seat };
