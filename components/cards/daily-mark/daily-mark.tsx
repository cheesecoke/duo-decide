import * as React from "react";
import { View } from "react-native";
import { Sun } from "phosphor-react-native";

import type { ArtSeat } from "@/components/cards/card-art/card-art";
import { Text } from "@/components/ui/reusables/text/text";
import { cn } from "@/lib/utils";
import { NEUTRAL } from "@/theme/neutrals";
import { usePersonColors } from "@/theme/usePersonColors";

/**
 * DailyMark: the stamp on a card whose job comes round every day.
 *
 * A sun and the word, in the holder's colours (tokens.md §2: `deep` on
 * `tint`, 7:1). The word stays: a sun alone would be a symbol to learn.
 */

const PILL_CLASS: Record<ArtSeat, string> = {
	a: "bg-person-a-tint",
	b: "bg-person-b-tint",
	none: "bg-surface-2",
};

const WORD_CLASS: Record<ArtSeat, string> = {
	a: "text-person-a-deep",
	b: "text-person-b-deep",
	none: "text-ink-2",
};

function DailyMark({ seat, className }: { seat: ArtSeat; className?: string }) {
	const person = usePersonColors();
	const color = seat === "a" ? person.a.deep : seat === "b" ? person.b.deep : NEUTRAL.ink2;

	return (
		<View
			testID="daily-mark"
			className={cn(
				"flex-row items-center gap-1 rounded-chip py-1 pl-1.5 pr-2",
				PILL_CLASS[seat],
				className,
			)}
		>
			<Sun size={13} color={color} weight="fill" />
			<Text className={cn("text-[12px] font-semibold leading-[16px]", WORD_CLASS[seat])}>Daily</Text>
		</View>
	);
}

export { DailyMark };
