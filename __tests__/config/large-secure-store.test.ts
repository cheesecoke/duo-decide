import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

import { LargeSecureStore } from "@/config/large-secure-store";

// test-utils/setup.ts stubs both stores to always return null; back them with
// real maps here so a value written can be read back.
const asyncStore = new Map<string, string>();
const secureStore = new Map<string, string>();

beforeEach(() => {
	asyncStore.clear();
	secureStore.clear();
	jest.mocked(AsyncStorage.setItem).mockImplementation(async (k, v) => {
		asyncStore.set(k, v);
	});
	jest.mocked(AsyncStorage.getItem).mockImplementation(async (k) => asyncStore.get(k) ?? null);
	jest.mocked(AsyncStorage.removeItem).mockImplementation(async (k) => {
		asyncStore.delete(k);
	});
	jest.mocked(SecureStore.setItemAsync).mockImplementation(async (k, v) => {
		secureStore.set(k, v);
	});
	jest.mocked(SecureStore.getItemAsync).mockImplementation(async (k) => secureStore.get(k) ?? null);
	jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async (k) => {
		secureStore.delete(k);
	});
});

const SESSION = JSON.stringify({
	access_token: "eyJhbGciOiJIUzI1NiJ9.payload.signature",
	refresh_token: "r3fr3sh",
	user: { id: "a3cc73ea-9c99-42a2-acf5-3aec595fca96", email: "someone@example.com" },
	note: "unicode survives too — ❤️",
});

describe("LargeSecureStore", () => {
	it("reads back exactly what it wrote", async () => {
		const store = new LargeSecureStore();
		await store.setItem("sb-session", SESSION);

		await expect(store.getItem("sb-session")).resolves.toBe(SESSION);
	});

	it("never writes the plaintext to AsyncStorage", async () => {
		const store = new LargeSecureStore();
		await store.setItem("sb-session", SESSION);

		const stored = asyncStore.get("sb-session");
		expect(stored).toBeDefined();
		expect(stored).not.toContain("r3fr3sh");
		expect(stored).toMatch(/^[0-9a-f]+$/);
	});

	it("keeps only the 256-bit key in SecureStore", async () => {
		const store = new LargeSecureStore();
		await store.setItem("sb-session", SESSION);

		expect(secureStore.get("sb-session")).toMatch(/^[0-9a-f]{64}$/);
	});

	it("returns null when nothing is stored", async () => {
		await expect(new LargeSecureStore().getItem("missing")).resolves.toBeNull();
	});

	it("returns null when the key is gone but the ciphertext is not", async () => {
		const store = new LargeSecureStore();
		await store.setItem("sb-session", SESSION);
		secureStore.clear();

		await expect(store.getItem("sb-session")).resolves.toBeNull();
	});

	it("removes both halves", async () => {
		const store = new LargeSecureStore();
		await store.setItem("sb-session", SESSION);
		await store.removeItem("sb-session");

		expect(asyncStore.has("sb-session")).toBe(false);
		expect(secureStore.has("sb-session")).toBe(false);
	});
});
