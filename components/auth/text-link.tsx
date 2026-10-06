import * as React from "react";
import { Pressable } from "react-native";

import { Caption } from "@/components/ui/reusables/headline/headline";

/**
 * "Forgot password?" — the quiet third option under a button stack.
 *
 * **The yellow is gone.** The old link was `hsl(48 96% 53%)` at weight 600,
 * which was the v1 brand colour doing double duty as the link colour. There is
 * no yellow in the tokens.md palette and nothing replaced it: the two hues
 * belong to the two people, and a link is not a person. So a text link is
 * `ink` at 600 — the same weight it always had, in the colour the rest of the
 * page's emphasis uses. Weight is what marks it, and its position under the
 * button is what says what it is for.
 *
 * `role="link"` rather than `button`: it goes somewhere, which is the
 * distinction a screen reader announces.
 */
function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
	return (
		<Pressable
			role="link"
			accessibilityLabel={label}
			onPress={onPress}
			// A 13 px line is not a touch target; the padding is what makes it one.
			className="items-center self-center px-3 py-2"
		>
			<Caption className="font-semibold text-ink">{label}</Caption>
		</Pressable>
	);
}

export { TextLink };
