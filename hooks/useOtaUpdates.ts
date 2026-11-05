import * as React from "react";
import { AppState, Platform } from "react-native";
import * as Updates from "expo-updates";

/**
 * Fetches a newer over-the-air update when the app returns to the foreground.
 *
 * `app.json` already has `updates.checkAutomatically: "ON_LOAD"`, so a cold
 * start checks for an update on its own, but a phone can keep the app
 * suspended for days without a cold start. This adds the same check on every
 * background → foreground return and downloads what it finds. It never
 * reloads: the downloaded bundle is applied on the next cold start (the
 * expo-updates default), so nothing changes under the user mid-decision.
 *
 * There is no UI, and every failure is swallowed (a check has no reason to
 * reach the user, and the next one tries again). It does nothing in
 * development, on web (Vercel serves the web build), or in a build without
 * expo-updates enabled (Expo Go, a dev client).
 */
export function useOtaUpdates(): void {
	React.useEffect(() => {
		if (__DEV__ || Platform.OS === "web" || !Updates.isEnabled) return;

		let inFlight = false;
		let previous = AppState.currentState;

		const subscription = AppState.addEventListener?.("change", (next) => {
			const cameForward = previous !== "active" && next === "active";
			previous = next;
			if (!cameForward || inFlight) return;

			inFlight = true;
			Updates.checkForUpdateAsync()
				.then((result) => (result.isAvailable ? Updates.fetchUpdateAsync() : undefined))
				.catch(() => {
					// Offline, server error, or no update for this runtime: try next time.
				})
				.finally(() => {
					inFlight = false;
				});
		});

		return () => subscription?.remove();
	}, []);
}
