import { AppState, Linking, Platform } from "react-native";

/**
 * hand-off — the three moments the Add to calendar drawer leaves the app, or
 * notices it has come back. Kept out of the drawer so the web-only globals
 * (`document`, `Blob`) are each behind one Platform guard, in one small file.
 */

/**
 * Opens the Google Calendar link. Resolves `false` when nothing could open it.
 *
 * The same call as `OptionText`'s `openLink`: on iOS and Android
 * `Linking.openURL` hands the URL to the system (the Google Calendar app when
 * it is installed, the browser when it is not). On web, react-native-web's
 * `openURL` with one argument is `window.open(url, "_blank", "noopener")`, a
 * new tab, so there is no `window` to touch here.
 */
export async function openCalendarLink(url: string): Promise<boolean> {
	try {
		await Linking.openURL(url);
		return true;
	} catch {
		return false;
	}
}

/**
 * Hands the `.ics` text over as a download. Web only: returns `false`
 * anywhere else (a phone has no downloads folder to put a file in; that
 * needs a share sheet, which is a later phase).
 */
export function downloadCalendarFile(text: string, fileName: string): boolean {
	if (Platform.OS !== "web" || typeof document === "undefined") return false;
	try {
		const href = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" }));
		const link = document.createElement("a");
		link.href = href;
		link.download = fileName;
		link.rel = "noopener";
		document.body.appendChild(link);
		link.click();
		link.remove();
		// After the click has been taken; revoking in the same tick cancels
		// the download in some browsers.
		setTimeout(() => URL.revokeObjectURL(href), 1000);
		return true;
	} catch {
		return false;
	}
}

/**
 * Calls `callback` when the person comes back to Duo: the app becoming
 * `active` again on a phone, the tab becoming visible again on web. May call
 * it more than once; the caller decides whether it was waiting.
 *
 * @returns Stop listening.
 */
export function onReturnToApp(callback: () => void): () => void {
	if (Platform.OS === "web") {
		if (typeof document === "undefined") return () => {};
		const onVisible = () => {
			if (document.visibilityState === "visible") callback();
		};
		document.addEventListener("visibilitychange", onVisible);
		return () => document.removeEventListener("visibilitychange", onVisible);
	}

	const subscription = AppState?.addEventListener?.("change", (state) => {
		if (state === "active") callback();
	});
	return () => subscription?.remove?.();
}
