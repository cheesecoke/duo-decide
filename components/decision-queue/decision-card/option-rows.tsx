import * as React from "react";
import { Pressable, View, type AccessibilityActionEvent } from "react-native";

import { Caption } from "@/components/ui/reusables/headline/headline";
import {
	OPTION_ROW_LAYOUT,
	OPTION_ROWS_BOX,
	OptionRowContent,
	WINNER_FILL,
} from "@/components/ui/reusables/option-row/option-row";
import { openLink } from "@/components/ui/reusables/option-text/option-text";
import { linksIn } from "@/lib/linkify";
import { cn } from "@/lib/utils";

import { COPY, type DecisionCardOption, type DecisionMode } from "./decision-card.model";

/**
 * `OptionsDisplay`'s three renders (FEATURE-INVENTORY §1.10a), as one list.
 *
 * 1. **none** — "Please add options", and nothing to press.
 * 2. **exactly one** — the option is shown but dead, with the mode's
 *    validation line under it. A single option is not a choice.
 * 3. **two or more** — a radio group: one row per option, hairlines between
 *    them, the option's text on the left and its mark on the far right.
 *
 * This is v1's list (`components/ui/CollapsibleCard/OptionsDisplay.tsx`
 * before the v2 redesign: a row per option, a `border` hairline under each,
 * a 20 px radio on the right) on the v2 tokens. The chips it replaced were
 * pills, and a pill has no room for what options actually are — sentences,
 * and pasted links that wrapped into a broken-looking capsule. A row gives
 * the text the full width of the card and wraps it like any paragraph.
 *
 * ## The mark
 *
 * - **Empty ring** (`ink-3`): not picked.
 * - **Filled circle with a check**, in person A's `deep`: picked. Person A
 *   because the viewer is always A (CLAUDE.md, seat convention), so it is
 *   *your* pick in *your* colour, and it follows whatever hue the couple
 *   chose. It no longer carries the poll's round hue — the round label,
 *   segment indicator and end-cap still do.
 * - **The winner** on a decided card keeps the check and its row takes person
 *   A's `tint`, with its text in `deep` (the §2 pairing made for text on
 *   tint). Every other row on a decided card is muted to 40 %, as the chips
 *   were — on the content, not the row, so the hairlines stay even.
 *
 * The mark, the text's styling and the box are shared with the History
 * screen's winner (`reusables/option-row/option-row.tsx`), so a decided
 * option reads the same on both screens.
 *
 * ## Presses
 *
 * The whole row is the target (at least 48 pt tall). A link inside the text
 * is its own target: `OptionText` explains why pressing it never selects the
 * row, on web or native, disabled row or not — which is also why a dead row
 * is only `disabled`, never `pointerEvents="none"`: that would take its
 * links down with it.
 *
 * The row's accessible name is the title exactly as written, URL and all.
 * On iOS and Android a pressable row is one accessibility element, so the
 * link inside it cannot be focused on its own; each link is offered as a
 * custom action on the row instead ("Open psychologytoday.com").
 */

type OptionRowsProps = {
	options: DecisionCardOption[];
	mode: DecisionMode;
	disabled: boolean;
	/** The decision is completed: the selected row is the winner. */
	decided: boolean;
	onSelect: (optionId: string) => void;
};

type OptionRowProps = {
	option: DecisionCardOption;
	checked: boolean;
	dead: boolean;
	winner: boolean;
	last: boolean;
	onSelect: () => void;
};

function OptionRow({ option, checked, dead, winner, last, onSelect }: OptionRowProps) {
	const links = React.useMemo(() => linksIn(option.title), [option.title]);
	/** A dead row that is not the pick steps back; the pick never does. */
	const muted = dead && !checked;

	const actions = links.map((link, index) => ({
		name: `open-link-${index}`,
		label: `Open ${link.host}`,
	}));

	const onAccessibilityAction = (event: AccessibilityActionEvent) => {
		const index = actions.findIndex((action) => action.name === event.nativeEvent.actionName);
		if (index >= 0) openLink(links[index].url);
	};

	return (
		<Pressable
			testID={`option-row-${option.id}`}
			role="radio"
			accessibilityLabel={option.title}
			accessibilityState={{ checked, disabled: dead }}
			// react-native-web 0.20 does not turn `accessibilityState` into
			// ARIA, so on web the radio would announce no state at all.
			aria-checked={checked}
			aria-disabled={dead}
			accessibilityActions={actions.length > 0 ? actions : undefined}
			onAccessibilityAction={actions.length > 0 ? onAccessibilityAction : undefined}
			disabled={dead}
			onPress={onSelect}
			className={cn(
				OPTION_ROW_LAYOUT,
				!last && "border-b border-line",
				winner && WINNER_FILL.a,
				!dead && "active:bg-surface-2 web:hover:bg-surface-2",
			)}
		>
			<OptionRowContent title={option.title} checked={checked} winner={winner} muted={muted} />
		</Pressable>
	);
}

function OptionRows({ options, mode, disabled, decided, onSelect }: OptionRowsProps) {
	if (options.length === 0) {
		return <Caption className="py-2.5 text-ink-3">{COPY.emptyOptions}</Caption>;
	}

	const single = options.length < 2;

	return (
		<>
			<View testID="option-rows" role="radiogroup" className={OPTION_ROWS_BOX}>
				{options.map((option, index) => {
					const checked = !single && option.selected;
					return (
						<OptionRow
							key={option.id}
							option={option}
							checked={checked}
							dead={single || disabled}
							winner={decided && checked}
							last={index === options.length - 1}
							onSelect={() => onSelect(option.id)}
						/>
					);
				})}
			</View>
			{single ? (
				<Caption className="mt-2.5">{mode === "vote" ? COPY.validateVote : COPY.validatePoll}</Caption>
			) : null}
		</>
	);
}

export { OptionRows };
export type { OptionRowsProps };
