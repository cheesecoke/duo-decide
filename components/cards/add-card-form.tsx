import * as React from "react";
import { View } from "react-native";

import type { CardSeat } from "@/components/cards/responsibility-card/responsibility-card";
import { Button } from "@/components/ui/reusables/button/button";
import { Chip } from "@/components/ui/reusables/chip/chip";
import { FieldLabel, Input } from "@/components/ui/reusables/field/field";
import { Text } from "@/components/ui/reusables/text/text";
import {
	CARD_CATEGORIES,
	CARD_TITLE_MAX,
	CATEGORY_LABEL,
	type CardCategory,
} from "@/lib/responsibility-deck";

/**
 * The body of the "Add a card" sheet, on the `CreateListForm` pattern.
 *
 * **Controlled**, for the same reason that one is: the Cards screen owns the
 * draft and re-pushes this content into the drawer on every change, so
 * anything held locally here would be thrown away on the next keystroke.
 *
 * Only the title is required. A new card starts in Home, not daily and not
 * dealt, which is the least the couple has to say to get it into the deck.
 */

interface AddCardFormValue {
	title: string;
	category: CardCategory;
	daily: boolean;
	holder: CardSeat;
}

interface AddCardFormProps {
	value: AddCardFormValue;
	onChange: (next: AddCardFormValue) => void;
	onSubmit: () => void;
	onCancel: () => void;
	/** The partner's name. `null` while no partner is linked: their chip is left out. */
	partnerLabel: string | null;
	submitting?: boolean;
}

const EMPTY_CARD: AddCardFormValue = { title: "", category: "home", daily: false, holder: "none" };

function AddCardForm({
	value,
	onChange,
	onSubmit,
	onCancel,
	partnerLabel,
	submitting = false,
}: AddCardFormProps) {
	const submitDisabled = submitting || !value.title.trim();
	const submitLabel = submitting ? "Adding…" : "Add card";

	const deal = (seat: Exclude<CardSeat, "none">) =>
		onChange({ ...value, holder: value.holder === seat ? "none" : seat });

	return (
		<View className="gap-4 pb-1">
			<View className="gap-1.5">
				<FieldLabel>Card</FieldLabel>
				<Input
					accessibilityLabel="Card"
					placeholder="What's the job? e.g. Taxes"
					maxLength={CARD_TITLE_MAX}
					value={value.title}
					onChangeText={(title) => onChange({ ...value, title })}
				/>
			</View>

			<View className="gap-1.5">
				<FieldLabel>Kind</FieldLabel>
				<View role="radiogroup" accessibilityLabel="Kind" className="flex-row flex-wrap gap-2">
					{CARD_CATEGORIES.map((category) => (
						<Chip
							key={category}
							role="radio"
							label={CATEGORY_LABEL[category]}
							selected={value.category === category}
							onPress={() => onChange({ ...value, category })}
						/>
					))}
				</View>
			</View>

			<View className="gap-1.5">
				<FieldLabel>How often</FieldLabel>
				<View className="flex-row flex-wrap gap-2">
					<Chip
						label="Every day"
						selected={value.daily}
						onPress={() => onChange({ ...value, daily: !value.daily })}
					/>
				</View>
			</View>

			<View className="gap-1.5">
				<FieldLabel>Who holds it</FieldLabel>
				<View role="group" accessibilityLabel="Who holds it" className="flex-row flex-wrap gap-2">
					<Chip person="a" label="You" selected={value.holder === "a"} onPress={() => deal("a")} />
					{partnerLabel ? (
						<Chip
							person="b"
							label={partnerLabel}
							selected={value.holder === "b"}
							onPress={() => deal("b")}
						/>
					) : null}
				</View>
			</View>

			{/* The sheet's own footer: the one black element, then the way out. */}
			<View className="mt-1 gap-3 border-t border-line pt-3.5">
				<Button
					className="h-14 w-full rounded-button"
					accessibilityLabel={submitLabel}
					accessibilityState={{ disabled: submitDisabled }}
					disabled={submitDisabled}
					onPress={onSubmit}
				>
					<Text className="text-[16px] font-semibold leading-[22px] text-cta-fg">{submitLabel}</Text>
				</Button>

				<Button
					variant="secondary"
					className="h-14 w-full rounded-button"
					accessibilityLabel="Cancel"
					onPress={onCancel}
				>
					<Text className="text-[16px] font-semibold leading-[22px] text-ink-2">Cancel</Text>
				</Button>
			</View>
		</View>
	);
}

export { AddCardForm, EMPTY_CARD };
export type { AddCardFormProps, AddCardFormValue };
