import { Platform } from "react-native";

/**
 * `rem()` is NativeWind's rem on the platform it runs on: 16 on web (the
 * browser's root font size), 14 on native (metro.config.js's `inlineRem`,
 * `withNativeWind`'s default). The constants built on it keep their web
 * values exactly, so web is unchanged; reserved-heights.native-runtime.test
 * checks the iOS side against the compiled classes.
 */

type RemModule = typeof import("@/theme/rem");
type Os = typeof Platform.OS;

/**
 * Loads theme/rem.ts (and anything built on it) fresh, as if running on `os`.
 * The module registry is a fresh one, so the `Platform` set here is the one
 * the fresh modules import.
 */
function loadOn<T>(os: Os, load: () => T): T {
	let loaded: T | undefined;
	jest.isolateModules(() => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { Platform: fresh } = require("react-native") as { Platform: { OS: Os } };
		fresh.OS = os;
		loaded = load();
	});
	return loaded as T;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const loadRem = () => require("@/theme/rem") as RemModule;

describe("rem()", () => {
	it("is 16 px a rem on web", () => {
		const { REM, rem } = loadOn("web", loadRem);

		expect(REM).toBe(16);
		expect(rem(1)).toBe(16);
		expect(rem(3.5)).toBe(56);
		expect(rem(0.625)).toBe(10);
	});

	it.each(["ios", "android"] as const)("is 14 pt a rem on %s", (os) => {
		const { REM, rem } = loadOn(os, loadRem);

		expect(REM).toBe(14);
		expect(rem(1)).toBe(14);
		expect(rem(3.5)).toBe(49);
		expect(rem(0.625)).toBe(8.75);
	});

	it("remFor() names each platform's rem without reloading", () => {
		const { remFor, NATIVE_REM, WEB_REM } = loadRem();

		expect(remFor("web")).toBe(WEB_REM);
		expect(remFor("ios")).toBe(NATIVE_REM);
		expect(remFor("android")).toBe(NATIVE_REM);
	});
});

describe("the reserved heights built on rem()", () => {
	it("keep their web values, so web renders exactly as before", () => {
		const { TAB_BAR_HEIGHT, FIXED_FOOTER_HEIGHT } = loadOn("web", () => ({
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			...(require("@/components/ui/reusables/tab-bar/tab-bar") as { TAB_BAR_HEIGHT: number }),
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			...(require("@/components/layout/FixedFooter") as { FIXED_FOOTER_HEIGHT: number }),
		}));

		expect(TAB_BAR_HEIGHT).toBe(56);
		expect(FIXED_FOOTER_HEIGHT).toBe(76);
	});

	it("match what h-14 and py-2.5 draw on iOS", () => {
		const { TAB_BAR_HEIGHT, FIXED_FOOTER_HEIGHT } = loadOn("ios", () => ({
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			...(require("@/components/ui/reusables/tab-bar/tab-bar") as { TAB_BAR_HEIGHT: number }),
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			...(require("@/components/layout/FixedFooter") as { FIXED_FOOTER_HEIGHT: number }),
		}));

		expect(TAB_BAR_HEIGHT).toBe(49);
		expect(FIXED_FOOTER_HEIGHT).toBe(66.5);
	});
});
