import { Platform } from "react-native";

import { getGoogleOAuthRedirectTo } from "@/config/oauth-redirect";

describe("getGoogleOAuthRedirectTo", () => {
	const originalOS = Platform.OS;
	const originalLocation = (globalThis as any).location;
	const originalAppUrl = process.env.EXPO_PUBLIC_APP_URL;

	afterEach(() => {
		(Platform as any).OS = originalOS;
		(globalThis as any).location = originalLocation;
		process.env.EXPO_PUBLIC_APP_URL = originalAppUrl;
	});

	const setOrigin = (origin: string | undefined) => {
		(globalThis as any).location = origin ? { origin } : undefined;
	};

	it("returns the current origin on web", () => {
		(Platform as any).OS = "web";
		setOrigin("http://localhost:8081");
		expect(getGoogleOAuthRedirectTo()).toBe("http://localhost:8081");
	});

	it("returns a production origin on web", () => {
		(Platform as any).OS = "web";
		setOrigin("https://duo-decide.com");
		expect(getGoogleOAuthRedirectTo()).toBe("https://duo-decide.com");
	});

	it("falls back to EXPO_PUBLIC_APP_URL when location is unavailable", () => {
		(Platform as any).OS = "web";
		setOrigin(undefined);
		process.env.EXPO_PUBLIC_APP_URL = "https://configured.example.com";
		expect(getGoogleOAuthRedirectTo()).toBe("https://configured.example.com");
	});

	it("returns undefined when neither location nor env var is set", () => {
		(Platform as any).OS = "web";
		setOrigin(undefined);
		delete process.env.EXPO_PUBLIC_APP_URL;
		expect(getGoogleOAuthRedirectTo()).toBeUndefined();
	});

	it("returns undefined on native (Google SSO not supported here yet)", () => {
		(Platform as any).OS = "ios";
		setOrigin("http://localhost:8081");
		expect(getGoogleOAuthRedirectTo()).toBeUndefined();
	});
});
