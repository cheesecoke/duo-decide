import AsyncStorage from "@react-native-async-storage/async-storage";

import { DEFAULT_PAIR, type HuePair, parseStoredPair } from "@/theme/pair-choice";

/**
 * The person pair, remembered per user on this device.
 *
 * Same shape as `lib/onboardingStorage.ts`: one key per user, every call
 * wrapped in try/catch, and a sensible answer rather than a throw when the
 * device says no. A theme is a preference — failing to read one must never be
 * able to stop the app from starting.
 *
 * **Per device, not per account.** The pick does not follow you to a second
 * phone and your partner does not see it; a `person_pair` column on `profiles`
 * (and reading it through `getUserContext`) is the follow-up ticket.
 */

const PREFIX = "duo_person_pair_";

function userKey(userId: string): string {
	return `${PREFIX}${userId}`;
}

/** The stored pair, or the tokens.md §1 defaults. Never throws. */
export async function getPersonPair(userId: string): Promise<HuePair> {
	try {
		return parseStoredPair(await AsyncStorage.getItem(userKey(userId)));
	} catch {
		return DEFAULT_PAIR;
	}
}

/** Writes `{ "a": id, "b": id }`. Never throws. */
export async function setPersonPair(userId: string, pair: HuePair): Promise<void> {
	try {
		await AsyncStorage.setItem(userKey(userId), JSON.stringify({ a: pair.a, b: pair.b }));
	} catch {
		// ignore
	}
}

export { PREFIX as PERSON_PAIR_KEY_PREFIX };
