import * as React from "react";
import { View } from "react-native";
import { router } from "expo-router";

import { SubmitButton } from "@/components/auth/submit-button";
import { ContentLayout } from "@/components/layout";
import { Button } from "@/components/ui/reusables/button/button";
import { Character } from "@/components/ui/reusables/character/character";
import { Body, Display } from "@/components/ui/reusables/headline/headline";
import { Text } from "@/components/ui/reusables/text/text";

/**
 * Welcome — FEATURE-INVENTORY §1.1, on the v2 system.
 *
 * Still one state: no header, no loading, no error. `AuthProvider` sends you
 * here when there is no session, and the settings sheet sends you here after
 * sign-out.
 *
 * ## The heart became the two of you
 *
 * §1.1's centrepiece was a 64 px yellow `IconHeart`. Yellow is not in the
 * tokens.md palette and a heart says "couple" in the way every couples app
 * says it. tokens.md §9 gives Welcome the pair at the large size — Fish and
 * Goose, both breathing, in the two hues the person presets pick — which is
 * the same idea drawn in the app's own vocabulary, and it is the first place
 * a new user meets the two characters they will see beside every vote.
 *
 * They overlap by 24 px rather than sitting in a row: two 160 px marks with a
 * gap between them is 328 px, which is wider than the content column on a
 * small phone, and a pair that touches reads as a pair rather than as two
 * separate illustrations.
 */

/** §1.1, verbatim. */
const WELCOME_COPY =
	"Make decisions together with your partner through structured voting and polls that reduce anxiety and build connection.";

export default function WelcomeScreen() {
	return (
		<ContentLayout>
			<View className="w-full max-w-[450px] flex-1 self-center">
				<View className="flex-1 items-center justify-center gap-4">
					<View className="flex-row items-end">
						<Character kind="fish" size={160} name="you" />
						<Character kind="goose" size={160} name="your partner" className="-ml-6" />
					</View>

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
