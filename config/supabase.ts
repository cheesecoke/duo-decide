import { AppState, Platform } from "react-native";

import "react-native-get-random-values";
import * as aesjs from "aes-js";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

class LargeSecureStore {
	private async _encrypt(key: string, value: string) {
		const encryptionKey = crypto.getRandomValues(new Uint8Array(256 / 8));
		const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
		const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
		await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));
		return aesjs.utils.hex.fromBytes(encryptedBytes);
	}
	private async _decrypt(key: string, value: string) {
		const encryptionKeyHex = await SecureStore.getItemAsync(key);
		if (!encryptionKeyHex) {
			return encryptionKeyHex;
		}
		const cipher = new aesjs.ModeOfOperation.ctr(
			new aesjs.Counter(1),
			aesjs.utils.hex.toBytes(encryptionKeyHex),
		);
		const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value));
		return aesjs.utils.utf8.fromBytes(decryptedBytes);
	}
	async getItem(key: string) {
		const encrypted = await AsyncStorage.getItem(key);
		if (!encrypted) {
			return encrypted;
		}
		return await this._decrypt(key, encrypted);
	}
	async removeItem(key: string) {
		await AsyncStorage.removeItem(key);
		await SecureStore.deleteItemAsync(key);
	}
	async setItem(key: string, value: string) {
		const encrypted = await this._encrypt(key, value);
		await AsyncStorage.setItem(key, encrypted);
	}
}

const secureStore = new LargeSecureStore();

// TEMPORARY DEVELOPMENT SOLUTION: Enhanced persistent storage for auth
// TODO: Replace with proper production auth persistence solution
// This implementation keeps users logged in during development refreshes
const createAuthStorage = () => {
	if (Platform.OS === "web") {
		// For web development: use localStorage with fallback to sessionStorage
		// This ensures auth persists across page refreshes during development
		return {
			getItem: async (key: string) => {
				try {
					// Try localStorage first (persists across browser sessions)
					const value = localStorage.getItem(key);
					if (value) return value;

					// Fallback to sessionStorage (persists during current session)
					return sessionStorage.getItem(key);
				} catch (error) {
					console.warn("Storage access failed, falling back to sessionStorage:", error);
					return sessionStorage.getItem(key);
				}
			},
			setItem: async (key: string, value: string) => {
				try {
					// Store in both localStorage and sessionStorage for redundancy
					localStorage.setItem(key, value);
					sessionStorage.setItem(key, value);
				} catch (error) {
					console.warn("Failed to store in localStorage, using sessionStorage:", error);
					sessionStorage.setItem(key, value);
				}
			},
			removeItem: async (key: string) => {
				try {
					localStorage.removeItem(key);
					sessionStorage.removeItem(key);
				} catch (error) {
					console.warn("Failed to remove from localStorage:", error);
					sessionStorage.removeItem(key);
				}
			},
		};
	}

	// For native: use secure encrypted storage
	return {
		getItem: async (key: string) => await secureStore.getItem(key),
		setItem: async (key: string, value: string) => await secureStore.setItem(key, value),
		removeItem: async (key: string) => await secureStore.removeItem(key),
	};
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	auth: {
		storage: createAuthStorage(),
		autoRefreshToken: true,
		persistSession: true, // Enable persistence for both web and native
		detectSessionInUrl: Platform.OS === "web",
		flowType: Platform.OS === "web" ? "pkce" : "implicit",
		// TEMPORARY: Extended token refresh settings for development
		// TODO: Adjust these values for production use
		refreshThreshold: 60, // Refresh token when 60 seconds from expiry
		debug: __DEV__, // Enable debug logging in development
	},
});

// TEMPORARY: Enhanced session management for development
// TODO: Implement proper production session management
AppState.addEventListener("change", (state) => {
	if (state === "active") {
		// When app becomes active, ensure auth is refreshed
		supabase.auth.startAutoRefresh();

		// TEMPORARY: Force session check on app activation during development
		// This helps recover from edge cases where session state might be lost
		if (__DEV__) {
			supabase.auth.getSession().then(({ data: { session } }) => {
				if (session) {
					console.log("Session recovered on app activation:", session.user?.email);
				}
			});
		}
	} else {
		supabase.auth.stopAutoRefresh();
	}
});

// TEMPORARY: Development helper to check auth state
// TODO: Remove this in production
if (__DEV__) {
	// Log auth storage status on startup
	createAuthStorage()
		.getItem("sb-auth-token")
		.then((token) => {
			console.log("Auth storage check - token exists:", !!token);
		});
}
