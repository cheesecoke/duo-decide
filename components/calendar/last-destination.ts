import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * The calendar this person last added to, remembered per user on this
 * device, so the drawer's "Adding to" row opens collapsed on the right one.
 *
 * Same shape as `lib/personPairStorage.ts`: one key per user, every call
 * wrapped in try/catch, and an answer rather than a throw when the device
 * says no. A preference must never be able to stop the drawer from opening.
 *
 * The value is returned as stored. Whether it can still be used here (a
 * calendar file is web-only) is `usableDestination`'s call, in the model.
 */

const PREFIX = "duo_calendar_destination_";

const userKey = (userId: string): string => `${PREFIX}${userId}`;

/** The stored destination, or `null` on first use. Never throws. */
export async function getLastDestination(
	userId: string | null | undefined,
): Promise<string | null> {
	if (!userId) return null;
	try {
		return await AsyncStorage.getItem(userKey(userId));
	} catch {
		return null;
	}
}

/** Never throws. */
export async function setLastDestination(
	userId: string | null | undefined,
	destination: string,
): Promise<void> {
	if (!userId) return;
	try {
		await AsyncStorage.setItem(userKey(userId), destination);
	} catch {
		// ignore
	}
}

export { PREFIX as CALENDAR_DESTINATION_KEY_PREFIX };
