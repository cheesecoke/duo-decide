import * as React from "react";
import { View } from "react-native";

import { Chip } from "@/components/ui/reusables/chip/chip";
import { Caption } from "@/components/ui/reusables/headline/headline";

import { COPY, type DecisionCardOption, type DecisionMode } from "./decision-card.model";

/**
 * `OptionsDisplay`'s three renders (FEATURE-INVENTORY §1.10a), as chips.
 *
 * 1. **none** — "Please add options", and nothing to press.
 * 2. **exactly one** — the option is shown but dead, with the mode's
 *    validation line under it. A single option is not a choice.
 * 3. **two or more** — pressable chips, the selected one filled in the round
 *    colour (link three of tokens.md §10's thread).
 *
 * The radio glyph the old list used is gone with the dot: Chase read the
 * empty circle inside a chip as a slider knob (tokens.md §7.2), so selection
 * is carried by the fill and the label weight alone.
 */

type OptionChipsProps = {
	options: DecisionCardOption[];
	mode: DecisionMode;
	disabled: boolean;
	/** Which hue the selected fill takes — the round's, or the viewer's. */
	person: "a" | "b";
	onSelect: (optionId: string) => void;
};

function OptionChips({ options, mode, disabled, person, onSelect }: OptionChipsProps) {
	if (options.length === 0) {
		return <Caption className="py-2.5 text-ink-3">{COPY.emptyOptions}</Caption>;
	}

	const single = options.length < 2;

	return (
		<>
			<View className="flex-row flex-wrap gap-2">
				{options.map((option) => (
					<Chip
						key={option.id}
						label={option.title}
						size="sm"
						person={person}
						selected={!single && option.selected}
						disabled={single || disabled}
						onPress={() => onSelect(option.id)}
					/>
				))}
			</View>
			{single ? (
				<Caption className="mt-2.5">{mode === "vote" ? COPY.validateVote : COPY.validatePoll}</Caption>
			) : null}
		</>
	);
}

export { OptionChips };
export type { OptionChipsProps };
