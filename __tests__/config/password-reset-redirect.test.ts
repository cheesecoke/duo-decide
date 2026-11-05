import { Platform } from "react-native";

import { getPasswordResetRedirectTo } from "@/config/password-reset-redirect";

describe("getPasswordResetRedirectTo", () => {
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

		it("returns the current origin's reset page", () => {
			setOrigin("http://localhost:8081");
			expect(getPasswordResetRedirectTo()).toBe("http://localhost:8081/reset-password");
		});

		it("returns the production reset page in production", () => {
			setOrigin("https://duo-decide.com");
			expect(getPasswordResetRedirectTo()).toBe("https://duo-decide.com/reset-password");
		});

		it("falls back to the web app when location is unavailable", () => {
			setOrigin(undefined);
			delete process.env.EXPO_PUBLIC_APP_URL;
			expect(getPasswordResetRedirectTo()).toBe("https://duo-decide.com/reset-password");
		});
	});

	describe.each(["ios", "android"])("on %s", (os) => {
		beforeEach(() => {
			(Platform as any).OS = os;
			setOrigin(undefined);
		});

		it("returns the web reset page, not the app scheme", () => {
			delete process.env.EXPO_PUBLIC_APP_URL;
			const url = getPasswordResetRedirectTo();
			expect(url).toBe("https://duo-decide.com/reset-password");
			expect(url).not.toMatch(/^duo-decide:/);
		});

		it("uses EXPO_PUBLIC_APP_URL when it is set", () => {
			process.env.EXPO_PUBLIC_APP_URL = "https://staging.example.com/";
			expect(getPasswordResetRedirectTo()).toBe("https://staging.example.com/reset-password");
		});

		it("ignores an empty EXPO_PUBLIC_APP_URL", () => {
			process.env.EXPO_PUBLIC_APP_URL = "";
			expect(getPasswordResetRedirectTo()).toBe("https://duo-decide.com/reset-password");
		});

		it("ignores a location object, should one exist", () => {
			delete process.env.EXPO_PUBLIC_APP_URL;
			setOrigin("http://localhost:8081");
			expect(getPasswordResetRedirectTo()).toBe("https://duo-decide.com/reset-password");
		});
	});
});
