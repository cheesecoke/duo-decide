import * as React from "react";
import { View } from "react-native";

import { IconAdd } from "@/assets/icons/IconAdd";
import { Button } from "@/components/ui/reusables/button/button";
import { Text } from "@/components/ui/reusables/text/text";
import { usePersonColors } from "@/theme/usePersonColors";

/**
 * The footer pill — the mock's `.cta`: one black element, with a tinted
 * end-cap.
 *
 * Hoisted out of the Decision Queue screen (PLAN-3 task 10), where it was
 * `CreateDecisionPill` with its label baked in. Every tab screen has exactly
 * one of these ("Create Decision", "Create List"), so the label is a prop and
 * the arrangement is shared.
 *
 * `accessibilityLabel` defaults to the visible label: the two only differ
 * when the pill's words are shorter than what a screen reader needs.
 */
function FooterPill({
	label,
	accessibilityLabel,
	onPress,
}: {
	label: string;
	accessibilityLabel?: string;
	onPress: () => void;
}) {
	const person = usePersonColors();

	return (
		<Button
			className="h-14 w-full justify-between rounded-button py-[7px] pl-6 pr-[7px]"
			accessibilityLabel={accessibilityLabel ?? label}
			onPress={onPress}
		>
			<Text className="text-[16px] font-semibold leading-[22px]">{label}</Text>
			<View className="h-10 w-10 items-center justify-center rounded-chip bg-person-a-tint">
				<IconAdd size={20} color={person.a.deep} />
			</View>
		</Button>
	);
}

export { FooterPill };
