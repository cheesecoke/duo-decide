import { Platform } from "react-native";

import { getEmailRedirectTo } from "@/config/email-redirect";

describe("getEmailRedirectTo", () => {
	const originalOS = Platform.OS;
	const originalLocation = (globalThis as any).location;
	const originalAppUrl = process.env.EXPO_PUBLIC_APP_URL;

	afterEach(() => {
		(Platform as any).OS = originalOS;
		(globalThis as any).location = originalLocation;
		if (originalAppUrl === undefined) delete process.env.EXPO_PUBLIC_APP_URL;
		else process.env.EXPO_PUBLIC_APP_URL = originalAppUrl;
	});

	const setOrigin = (origin: string | undefined) => {
		(globalThis as any).location = origin ? { origin } : undefined;
	};

	describe("on web", () => {
		beforeEach(() => {
			(Platform as any).OS = "web";
		});

		it("returns the origin the sign-up came from", () => {
			setOrigin("http://localhost:8081");
			expect(getEmailRedirectTo()).toBe("http://localhost:8081");
		});

		it("falls back to the web app when location is unavailable", () => {
			setOrigin(undefined);
			delete process.env.EXPO_PUBLIC_APP_URL;
			expect(getEmailRedirectTo()).toBe("https://duo-decide.com");
		});
	});

	describe.each(["ios", "android"])("on %s", (os) => {
		beforeEach(() => {
			(Platform as any).OS = os;
		});

		it("sends the link to the web app when EXPO_PUBLIC_APP_URL is not set", () => {
			delete process.env.EXPO_PUBLIC_APP_URL;
			expect(getEmailRedirectTo()).toBe("https://duo-decide.com");
		});

		it("uses EXPO_PUBLIC_APP_URL when it is set, without a trailing slash", () => {
			process.env.EXPO_PUBLIC_APP_URL = "https://staging.duo-decide.com/";
			expect(getEmailRedirectTo()).toBe("https://staging.duo-decide.com");
		});

		it("treats an empty EXPO_PUBLIC_APP_URL as unset", () => {
			process.env.EXPO_PUBLIC_APP_URL = "";
			expect(getEmailRedirectTo()).toBe("https://duo-decide.com");
		});

		it("ignores a location object, which React Native can have", () => {
			setOrigin("http://localhost:8081");
			delete process.env.EXPO_PUBLIC_APP_URL;
			expect(getEmailRedirectTo()).toBe("https://duo-decide.com");
		});
	});
});
