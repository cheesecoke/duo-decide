import { Platform } from "react-native";

/**
 * Synchronous, side-effect-free guard. True only on web when the current
 * page is the password-reset route. Seeds isPasswordRecovery before any
 * async PKCE exchange runs, so the global router never treats a recovery
 * session as a normal sign-in. Native uses the deep-link handler instead.
 */
export function isWebPasswordRecoveryEntry(): boolean {
	if (Platform.OS !== "web") return false;
	if (typeof globalThis === "undefined" || !("location" in globalThis)) return false;
	const loc = (globalThis as { location?: { pathname?: string } }).location;
	if (!loc || typeof loc.pathname !== "string") return false;
	const path = loc.pathname.replace(/\/+$/, "");
	return path === "/reset-password" || path.endsWith("/reset-password");
}
