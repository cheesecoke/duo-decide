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
		const cipher = new aesjs.ModeOfOperation.ctr(
			encryptionKey,
			new aesjs.Counter(1),
		);
		const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
		await SecureStore.setItemAsync(
			key,
			aesjs.utils.hex.fromBytes(encryptionKey),
		);
		return aesjs.utils.hex.fromBytes(encryptedBytes);
	}
	private async _decrypt(key: string, value: string) {
		const encryptionKeyHex = await SecureStore.getItemAsync(key);
		if (!encryptionKeyHex) {
			return encryptionKeyHex;
		}
		const cipher = new aesjs.ModeOfOperation.ctr(
			aesjs.utils.hex.toBytes(encryptionKeyHex),
			new aesjs.Counter(1),
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

// In-memory storage for development (keeps session during page refreshes)
const memoryStorage: { [key: string]: string } = {};

// For web: use in-memory storage with persistence for development
// For native: use secure encrypted storage
const createAuthStorage = () => {
	if (Platform.OS === "web") {
		return {
			getItem: async (key: string) => {
				return memoryStorage[key] || null;
			},
			setItem: async (key: string, value: string) => {
				memoryStorage[key] = value;
			},
			removeItem: async (key: string) => {
				delete memoryStorage[key];
			},
		};
	}
	return {
		getItem: async (key: string) => await secureStore.getItem(key),
		setItem: async (key: string, value: string) =>
			await secureStore.setItem(key, value),
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
	},
});

AppState.addEventListener("change", (state) => {
	if (state === "active") {
		supabase.auth.startAutoRefresh();
	} else {
		supabase.auth.stopAutoRefresh();
	}
});
