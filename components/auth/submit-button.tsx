import * as React from "react";
import { ActivityIndicator } from "react-native";

import { Button } from "@/components/ui/reusables/button/button";
import { Text } from "@/components/ui/reusables/text/text";
import { NEUTRAL } from "@/theme/neutrals";

/**
 * The one black button at the bottom of an auth screen (tokens.md §10: one
 * black element per surface).
 *
 * Every auth screen wrote this out by hand and every one of them got the same
 * half of it right — the spinner replacing the label — and the same half
 * wrong: nothing said the button was *busy*, only that it was disabled, so a
 * screen reader announced a dead control with no explanation. `busy` is the
 * difference between "you cannot press this" and "it is working".
 *
 * The accessible name stays the label while it spins, on purpose. A name that
 * changes to "Loading…" is a *different control* as far as a test or a voice
 * command is concerned, and the thing under your finger did not change.
 */
function SubmitButton({
	label,
	submitting = false,
	disabled = false,
	onPress,
}: {
	label: string;
	submitting?: boolean;
	disabled?: boolean;
	onPress: () => void;
}) {
	const blocked = submitting || disabled;

	return (
		<Button
			className="h-14 w-full rounded-button"
			accessibilityLabel={label}
			accessibilityState={{ busy: submitting, disabled: blocked }}
			disabled={blocked}
			onPress={onPress}
		>
			{submitting ? (
				// `cta.fg` — the spinner stands in for white label text on the
				// black pill, so it is that colour and not the theme's default.
				<ActivityIndicator size="small" color={NEUTRAL.surface} />
			) : (
				<Text className="text-[16px] font-semibold leading-[22px]">{label}</Text>
			)}
		</Button>
	);
}

export { SubmitButton };
