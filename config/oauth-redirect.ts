import { Platform } from "react-native";

/**
 * URL Supabase should redirect to after a successful Google OAuth flow.
 * Web only — native Google SSO is not yet supported and returns undefined,
 * which the caller should interpret as "do not initiate the flow".
 *
 * Must be registered in Supabase Dashboard → Auth → URL Configuration.
 */
export function getGoogleOAuthRedirectTo(): string | undefined {
	if (Platform.OS !== "web") return undefined;

	if (typeof globalThis !== "undefined" && "location" in globalThis && globalThis.location?.origin) {
		return globalThis.location.origin;
	}

	return process.env.EXPO_PUBLIC_APP_URL;
}
