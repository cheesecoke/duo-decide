import * as React from "react";
import { View } from "react-native";
import { router } from "expo-router";

import { SubmitButton } from "@/components/auth/submit-button";
import { ContentLayout } from "@/components/layout";
import { Button } from "@/components/ui/reusables/button/button";
import { Body, Display } from "@/components/ui/reusables/headline/headline";
import { HeartMark } from "@/components/ui/reusables/heart-mark/heart-mark";
import { Text } from "@/components/ui/reusables/text/text";
import { usePersonColors } from "@/theme/usePersonColors";

/**
 * Welcome — FEATURE-INVENTORY §1.1, on the v2 system.
 *
 * Still one state: no header, no loading, no error. `AuthProvider` sends you
 * here when there is no session, and the settings sheet sends you here after
 * sign-out.
 *
 * ## The heart is the brand mark
 *
 * The v2 redesign put the pair here instead — Fish and Goose at 160 px,
 * overlapping — on the reading that a heart says "couple" the way every
 * couples app says it, and that the characters are the app's own vocabulary.
 * Chase reversed that on 2026-09-21: the heart is Duo's main icon, the one
 * the header already wears, and the first screen a new user sees is where an
 * app's icon belongs. The characters are for fun later — they stay on the
 * queue and the vote surfaces, where they stand in for two people acting.
 *
 * So this is §1.1's 64 px heart again, with one correction: §1.1 drew it in
 * the brand yellow, which is not in the tokens.md palette. It is person A's
 * `base` here, the same seat and the same hue as the header's mark
 * (`reusables/heart-mark`), so the couple's colour reaches the first screen
 * as well as every screen after it.
 */

/** §1.1, verbatim. */
const WELCOME_COPY =
	"Make decisions together with your partner through structured voting and polls that reduce anxiety and build connection.";

export default function WelcomeScreen() {
	// The screen is under the root `PersonPairProvider` (app/_layout.tsx
	// mounts it above the navigator), so the pair is here before the session is.
	const person = usePersonColors();

	return (
		<ContentLayout>
			<View className="w-full max-w-[450px] flex-1 self-center">
				<View className="flex-1 items-center justify-center gap-4">
					<HeartMark color={person.a.base} size={64} />

					<Display className="text-center">
						Welcome to <Display.Strong>Duo Decide</Display.Strong>
					</Display>

					<Body className="max-w-[450px] text-center text-ink-2">{WELCOME_COPY}</Body>
				</View>

				<View className="mt-auto gap-3 pt-4">
					<SubmitButton label="Sign Up" onPress={() => router.push("/sign-up")} />
					<Button
						variant="secondary"
						className="h-14 w-full rounded-button"
						accessibilityLabel="Sign In"
						onPress={() => router.push("/sign-in")}
					>
						<Text className="text-[16px] font-semibold leading-[22px]">Sign In</Text>
					</Button>
				</View>
			</View>
		</ContentLayout>
	);
}
