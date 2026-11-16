import * as React from "react";
import { View } from "react-native";

import { Caption } from "@/components/ui/reusables/headline/headline";
import { Text } from "@/components/ui/reusables/text/text";
import { cn } from "@/lib/utils";

/**
 * BalanceStrip: who has done how much this week, side by side.
 *
 * The number the feature exists for. "I'm doing more than you" stops being an
 * argument when both people are looking at the same two counts. Each side is
 * in its person's colours (tokens.md §2: `deep` on `tint`), the viewer on the
 * left as everywhere else.
 *
 * The big number is jobs marked done in the last seven days; the line under
 * it is how many cards that person holds. With no partner linked there is one
 * side only.
 */

interface BalanceSide {
	done: number;
	holding: number;
}

function Side({ seat, name, done, holding }: BalanceSide & { seat: "a" | "b"; name: string }) {
	const deep = seat === "a" ? "text-person-a-deep" : "text-person-b-deep";
	return (
		<View
			testID={`balance-${seat}`}
			accessible
			accessibilityLabel={`${name}: ${done} done in the last 7 days, holding ${holding} ${holding === 1 ? "card" : "cards"}`}
			className={cn(
				"min-w-0 flex-1 rounded-card px-5 py-4",
				seat === "a" ? "bg-person-a-tint" : "bg-person-b-tint",
			)}
		>
			<Text numberOfLines={1} className={cn("text-row font-semibold", deep)}>
				{name}
			</Text>
			<View className="mt-1 flex-row items-baseline gap-1.5">
				<Text className={cn("text-[32px] font-bold leading-[38px]", deep)}>{done}</Text>
				<Text className={cn("text-row font-medium", deep)}>done</Text>
			</View>
			<Caption className={deep}>
				Holding {holding} {holding === 1 ? "card" : "cards"}
			</Caption>
		</View>
	);
}

function BalanceStrip({
	you,
	partner,
	partnerLabel,
}: {
	you: BalanceSide;
	partner: BalanceSide;
	/** The partner's name. `null` while no partner is linked: their side is left out. */
	partnerLabel: string | null;
}) {
	return (
		<View testID="balance-strip" className="gap-2">
			<Caption className="text-ink-3">The last 7 days</Caption>
			<View className="flex-row gap-3">
				<Side seat="a" name="You" {...you} />
				{partnerLabel ? <Side seat="b" name={partnerLabel} {...partner} /> : null}
			</View>
		</View>
	);
}

export { BalanceStrip };
export type { BalanceSide };
