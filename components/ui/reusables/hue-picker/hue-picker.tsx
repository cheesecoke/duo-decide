import * as React from "react";
import { Pressable, View } from "react-native";

import { Character } from "@/components/ui/reusables/character/character";
import { Caption } from "@/components/ui/reusables/headline/headline";
import { Text } from "@/components/ui/reusables/text/text";
import { cn } from "@/lib/utils";
import { choosePair, type HuePair, type PersonSeat } from "@/theme/pair-choice";
import { HUE_PRESETS, type HuePresetId } from "@/theme/presets";

/**
 * HuePicker — the two seats, and the five hues each can wear
 * (tokens.md §1, §2: "the whole theme derives from the two picks").
 *
 * Two rows, because there are two seats and *you* own both of them: seat A is
 * always whoever is looking at the screen (`from-ui-decision.ts`), so this is
 * not "pick your colour and let your partner pick theirs" — it is picking how
 * the pair reads on this device. Your partner's copy of the app has its own.
 *
 * Pure: it holds no state and never touches storage. `value` in,
 * `onChange(next)` out, with `choosePair` deciding what `next` is — which is
 * where the one rule lives that the rows cannot show you. The two seats may
 * never hold the same hue, so pressing the hue the other row is wearing
 * **swaps** them. No swatch is ever disabled: all ten are legal presses.
 *
 * ## The swatches are the one raw preset colour in the app
 *
 * Everything else in the system reads its hues through the token classes
 * (`bg-person-a-tint`) or `usePersonColors`, both of which resolve to
 * *whatever pair is active* — which is exactly what a picker cannot use. A
 * swatch has to show the hue you would be switching **to**, so these four
 * lines are the legitimate exception: `HUE_PRESETS[n].base`, rendered as an
 * inline `hsl()`. Nowhere else.
 */

/** "sage" → "Sage". The label a screen reader reads out. */
function presetLabel(id: HuePresetId): string {
	return id.charAt(0).toUpperCase() + id.slice(1);
}

type SwatchProps = {
	id: HuePresetId;
	seat: PersonSeat;
	selected: boolean;
	onPress: () => void;
};

/**
 * Selection is a 2 px `ink` ring with a 2 px `surface` gap, drawn as a border
 * and padding rather than Tailwind's `ring-*`: `ring` compiles to a
 * box-shadow, and React Native has no box-shadow. The unselected swatch keeps
 * the same border width in `transparent` so nothing shifts when it is picked.
 */
function Swatch({ id, seat, selected, onPress }: SwatchProps) {
	const preset = HUE_PRESETS.find((p) => p.id === id);
	if (!preset) return null;

	return (
		<Pressable
			role="radio"
			accessibilityLabel={presetLabel(id)}
			accessibilityState={{ checked: selected }}
			testID={`hue-${seat}-${id}`}
			onPress={onPress}
			className={cn(
				"rounded-full border-2 bg-surface p-0.5",
				selected ? "border-ink" : "border-transparent",
			)}
		>
			<View
				testID={`hue-${seat}-${id}-fill`}
				className="h-8 w-8 rounded-full"
				// The exception the docblock names: a picker must show the hue
				// you would switch *to*, which no token class can do.
				style={{ backgroundColor: `hsl(${preset.base})` }}
			/>
		</Pressable>
	);
}

type HueRowProps = {
	seat: PersonSeat;
	/** The name shown beside the character — "You", or the partner's name. */
	label: string;
	/** Who the character is, for its accessible label ("Goose, Sam"). */
	name: string;
	value: HuePair;
	onChange: (next: HuePair) => void;
};

function HueRow({ seat, label, name, value, onChange }: HueRowProps) {
	return (
		<View className="gap-2">
			<View className="flex-row items-center gap-2">
				{/* tokens.md §9 — the 32 px mark stands in for an avatar beside
				    the person it belongs to, which is what this row is. */}
				<Character kind={seat === "a" ? "fish" : "goose"} person={seat} size={32} name={name} />
				<Text className="text-[15px] font-medium leading-[20px] text-ink">{label}</Text>
			</View>

			{/* "Your colour", not "You's colour": the row is headed "You", and
			    the possessive of the heading is not always the possessive of
			    the person. Every other row is a name and takes the 's. */}
			<View
				role="radiogroup"
				accessibilityLabel={label === "You" ? "Your colour" : `${label}'s colour`}
				className="flex-row gap-2"
			>
				{HUE_PRESETS.map((preset) => (
					<Swatch
						key={preset.id}
						id={preset.id}
						seat={seat}
						selected={value[seat] === preset.id}
						onPress={() => onChange(choosePair(value, seat, preset.id))}
					/>
				))}
			</View>
		</View>
	);
}

type HuePickerProps = {
	value: HuePair;
	onChange: (next: HuePair) => void;
	/**
	 * The viewer's own name — seat A is always the viewer. It feeds the
	 * fish's accessible name ("Fish, Chase") and nothing else: the row itself
	 * is headed "You", because that is what seat A means.
	 */
	youName: string;
	/** `null` before a partner is linked; the row still works. */
	partnerName: string | null;
	className?: string;
};

/** tokens.md §2 — the combinations that read well together. */
const SUGGESTED_PAIRS =
	"Pairs that read well: sage + blush, butter + lavender, butter + sage, sky + blush, sage + lavender";

function HuePicker({ value, onChange, youName, partnerName, className }: HuePickerProps) {
	return (
		<View className={cn("gap-3", className)}>
			<HueRow seat="a" label="You" name={youName} value={value} onChange={onChange} />
			<HueRow
				seat="b"
				label={partnerName ?? "Partner"}
				name={partnerName ?? "your partner"}
				value={value}
				onChange={onChange}
			/>
			<Caption className="text-ink-3">{SUGGESTED_PAIRS}</Caption>
		</View>
	);
}

export { HuePicker, presetLabel, SUGGESTED_PAIRS };
export type { HuePickerProps };
