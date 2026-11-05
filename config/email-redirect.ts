import { Platform } from "react-native";

import { DEFAULT_WEB_APP_URL } from "@/config/password-reset-redirect";

/**
 * Where a sign-up confirmation email sends the user (`emailRedirectTo` in
 * `signUp`). Must be allowed in Supabase Dashboard → Auth → URL Configuration.
 *
 * - **Web** returns to the origin the sign-up came from (production, a
 *   preview deployment, or localhost).
 * - **Native** always names the web app: `EXPO_PUBLIC_APP_URL` if it is set,
 *   otherwise `https://duo-decide.com`. It used to return the env var alone,
 *   which is not set in EAS builds, so Supabase fell back to its Site URL.
 *   Either way the link lands on the web with an implicit-flow fragment
 *   (`#access_token=…&type=signup`), which `context/supabase-provider.tsx`
 *   turns into a session and an "Email confirmed" screen.
 */
export function getEmailRedirectTo(): string {
	if (Platform.OS === "web") {
		const origin = (globalThis as { location?: { origin?: string } }).location?.origin;
		if (origin) return origin;
	}

	return (process.env.EXPO_PUBLIC_APP_URL || DEFAULT_WEB_APP_URL).replace(/\/+$/, "");
}
