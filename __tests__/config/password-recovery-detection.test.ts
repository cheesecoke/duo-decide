import { Platform } from "react-native";

import { isWebPasswordRecoveryEntry } from "@/config/password-recovery-detection";

describe("isWebPasswordRecoveryEntry", () => {
	const originalOS = Platform.OS;
	const originalLocation = (globalThis as any).location;

	afterEach(() => {
		(Platform as any).OS = originalOS;
		(globalThis as any).location = originalLocation;
	});

	const setPath = (pathname: string) => {
		(globalThis as any).location = { pathname };
	};

	it("returns false on native regardless of path", () => {
		(Platform as any).OS = "ios";
		setPath("/reset-password");
		expect(isWebPasswordRecoveryEntry()).toBe(false);
	});

	it("returns true on web at /reset-password", () => {
		(Platform as any).OS = "web";
		setPath("/reset-password");
		expect(isWebPasswordRecoveryEntry()).toBe(true);
	});

	it("returns true with a trailing slash", () => {
		(Platform as any).OS = "web";
		setPath("/reset-password/");
		expect(isWebPasswordRecoveryEntry()).toBe(true);
	});

	it("returns true under a non-root base path", () => {
		(Platform as any).OS = "web";
		setPath("/app/reset-password");
		expect(isWebPasswordRecoveryEntry()).toBe(true);
	});

	it("returns false on /sign-in", () => {
		(Platform as any).OS = "web";
		setPath("/sign-in");
		expect(isWebPasswordRecoveryEntry()).toBe(false);
	});

	it("returns false on /change-password", () => {
		(Platform as any).OS = "web";
		setPath("/change-password");
		expect(isWebPasswordRecoveryEntry()).toBe(false);
	});

	it("returns false when location is unavailable", () => {
		(Platform as any).OS = "web";
		(globalThis as any).location = undefined;
		expect(isWebPasswordRecoveryEntry()).toBe(false);
	});
});
