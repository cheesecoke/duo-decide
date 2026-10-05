import { AppState, Platform } from "react-native";

import { LargeSecureStore } from "@/config/large-secure-store";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

/**
 * URL where users are sent after confirming their email. Used in signUp() so
 * the confirmation link points to the app they signed up from (e.g. production
 * vs localhost). Must be allowed in Supabase Dashboard → Auth → URL Configuration.
 */
export function getEmailRedirectTo(): string | undefined {
	if (typeof globalThis !== "undefined" && "location" in globalThis && globalThis.location?.origin) {
		return globalThis.location.origin;
	}
	return process.env.EXPO_PUBLIC_APP_URL;
}

/**
 * URL where users land from a password-reset email. Web routes back to the
 * deployed origin; native uses the app scheme so iOS/Android open the app
 * directly. Must be allowed in Supabase Dashboard → Auth → URL Configuration.
 */
export function getPasswordResetRedirectTo(): string {
	if (typeof globalThis !== "undefined" && "location" in globalThis && globalThis.location?.origin) {
		return `${globalThis.location.origin}/reset-password`;
	}
	return "duo-decide://reset-password";
}

const secureStore = new LargeSecureStore();

// Web uses localStorage (persists across sessions); native uses encrypted SecureStore.
const createAuthStorage = () => {
	if (Platform.OS === "web") {
		return {
			getItem: async (key: string) => localStorage.getItem(key),
			setItem: async (key: string, value: string) => localStorage.setItem(key, value),
			removeItem: async (key: string) => localStorage.removeItem(key),
		};
	}

	return {
		getItem: async (key: string) => await secureStore.getItem(key),
		setItem: async (key: string, value: string) => await secureStore.setItem(key, value),
		removeItem: async (key: string) => await secureStore.removeItem(key),
	};
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
	auth: {
		storage: createAuthStorage(),
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: Platform.OS === "web",
		flowType: Platform.OS === "web" ? "pkce" : "implicit",
		debug: false,
	},
});

AppState.addEventListener("change", (state) => {
	if (state === "active") {
		supabase.auth.startAutoRefresh();
	} else {
		supabase.auth.stopAutoRefresh();
	}
});
