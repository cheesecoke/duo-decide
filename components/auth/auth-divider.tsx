import * as React from "react";
import { View } from "react-native";

import { Eyebrow } from "@/components/ui/reusables/headline/headline";

/**
 * "— OR —", between the password form and the Google button.
 *
 * A hairline either side, in `line` — which tokens.md §3 reserves for exactly
 * this: "hairline dividers only; cards do NOT use borders". The word itself
 * is the eyebrow scale, the smallest thing in the type system that is still
 * meant to be read.
 */
function AuthDivider() {
	return (
		<View testID="auth-divider" className="my-2 flex-row items-center gap-3">
			<View className="h-px flex-1 bg-line" />
			<Eyebrow>OR</Eyebrow>
			<View className="h-px flex-1 bg-line" />
		</View>
	);
}

export { AuthDivider };
