import { View } from "react-native";
import { router } from "expo-router";

import { ContentLayout } from "@/components/layout";
import { Body, Display } from "@/components/ui/reusables/headline/headline";
import { Tile } from "@/components/ui/reusables/tile/tile";

/**
 * 404 — FEATURE-INVENTORY §1.14, on the v2 system.
 *
 * The old screen was twelve lines of dead `className` props (NativeWind had
 * been removed when it was written) and, as §1.14 notes, **no route home**: a
 * deep link that missed left you on a dead end with the back button as the
 * only way out, and on a cold web load there is no back entry to use.
 *
 * The way out is a `Tile` rather than the black button the auth screens use.
 * tokens.md §7 calls a Tile "a doorway" — a whole area of the app — which is
 * exactly what is being offered here, and this is not a form: there is no
 * action to submit, so there is nothing for the one black element on the
 * surface to be.
 */

export default function NotFound() {
	return (
		<ContentLayout>
			<View className="w-full max-w-[450px] flex-1 justify-center gap-4 self-center">
				<Display role="heading" aria-level="1">
					404
				</Display>
				<Body className="text-ink-2">This page could not be found.</Body>

				<Tile
					tint="surface-2"
					title="Back to the queue"
					onPress={() => router.replace("/(protected)/(tabs)")}
				/>
			</View>
		</ContentLayout>
	);
}
