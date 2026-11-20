import * as Sentry from "@sentry/react-native";
import * as Updates from "expo-updates";
import { Platform } from "react-native";

/**
 * Crash and error reporting.
 *
 * Off unless `EXPO_PUBLIC_SENTRY_DSN` is set (an EAS environment variable,
 * and the Vercel project env for web) and off in development, so local runs,
 * tests and Storybook never report.
 *
 * Privacy (this is what the App Store privacy labels declare): crash data and
 * diagnostics only. No PII (`sendDefaultPii: false`), no user id, no session
 * replay, no performance tracing. Decision titles and names can still appear
 * in an error message the app throws, so `beforeSend` drops request bodies.
 *
 * The SDK tags each event with the EAS Update id, channel and runtime version
 * on its own, so a bad OTA shows up as its own release in Sentry.
 */
export const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function sentryEnvironment(): string {
	if (Platform.OS === "web") return "web";
	return Updates.channel || "unknown";
}

export function initSentry(dsn: string | undefined = SENTRY_DSN, dev: boolean = __DEV__): boolean {
	if (!dsn || dev) return false;
	Sentry.init({
		dsn,
		environment: sentryEnvironment(),
		sendDefaultPii: false,
		tracesSampleRate: 0,
		beforeSend(event) {
			if (event.request) delete event.request.data;
			return event;
		},
	});
	return true;
}
