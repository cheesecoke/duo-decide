import { Platform } from "react-native";

/** The deployed web app. Used when `EXPO_PUBLIC_APP_URL` is not set. */
export const DEFAULT_WEB_APP_URL = "https://duo-decide.com";

/**
 * URL where users land from a password-reset email. Must be allowed in
 * Supabase Dashboard → Auth → URL Configuration.
 *
 * - **Web** routes back to the origin the request came from (production,
 *   a preview deployment, or localhost).
 * - **Native** sends the user to the *web* reset page, not the
 *   `duo-decide://` scheme. The email is usually opened in an in-app browser
 *   (Gmail on iOS, for one) that cannot open a custom scheme, so a scheme
 *   redirect left people on a black screen with no way forward. The web page
 *   can finish the reset on its own, and the new password then works in the
 *   app. `EXPO_PUBLIC_APP_URL` overrides the host.
 */
export function getPasswordResetRedirectTo(): string {
	if (Platform.OS === "web") {
		const origin = (globalThis as { location?: { origin?: string } }).location?.origin;
		if (origin) return `${origin}/reset-password`;
	}

	const base = (process.env.EXPO_PUBLIC_APP_URL || DEFAULT_WEB_APP_URL).replace(/\/+$/, "");
	return `${base}/reset-password`;
}
