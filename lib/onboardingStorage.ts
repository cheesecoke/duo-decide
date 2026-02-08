import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "duo_onboarding_";
const KEY_WELCOME = `${PREFIX}seen_welcome_decision`;
const KEY_PARTNER_INTRO = `${PREFIX}seen_partner_intro`;
const KEY_WELCOME_OPTIONS = `${PREFIX}seen_welcome_options`;

function userKey(baseKey: string, userId: string): string {
	return `${baseKey}_${userId}`;
}

export async function getSeenWelcomeDecision(userId: string): Promise<boolean> {
	try {
		const value = await AsyncStorage.getItem(userKey(KEY_WELCOME, userId));
		return value === "true";
	} catch {
		return false;
	}
}

export async function setSeenWelcomeDecision(userId: string): Promise<void> {
	try {
		await AsyncStorage.setItem(userKey(KEY_WELCOME, userId), "true");
	} catch {
		// ignore
	}
}

export async function getSeenPartnerIntro(userId: string): Promise<boolean> {
	try {
		const value = await AsyncStorage.getItem(userKey(KEY_PARTNER_INTRO, userId));
		return value === "true";
	} catch {
		return false;
	}
}

export async function setSeenPartnerIntro(userId: string): Promise<void> {
	try {
		await AsyncStorage.setItem(userKey(KEY_PARTNER_INTRO, userId), "true");
	} catch {
		// ignore
	}
}

export async function getSeenWelcomeOptions(userId: string): Promise<boolean> {
	try {
		const value = await AsyncStorage.getItem(userKey(KEY_WELCOME_OPTIONS, userId));
		return value === "true";
	} catch {
		return false;
	}
}

export async function setSeenWelcomeOptions(userId: string): Promise<void> {
	try {
		await AsyncStorage.setItem(userKey(KEY_WELCOME_OPTIONS, userId), "true");
	} catch {
		// ignore
	}
}
