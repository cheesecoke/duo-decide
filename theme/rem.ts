import { Platform } from "react-native";

/**
 * NativeWind's rem, as a number, for the few places a class has to be
 * mirrored in a plain style object (a scene's padding, a scroll inset).
 *
 * Tailwind's scale is in rem (`h-14` is 3.5rem), and one rem is not the same
 * size on both platforms:
 *
 * - **web**: the browser's root font size, 16 px. Nothing in the app changes
 *   it (`global.css` sets no `html { font-size }`).
 * - **native**: NativeWind inlines rem at compile time with `withNativeWind`'s
 *   `inlineRem`. `metro.config.js` passes none, so it is the default, 14 —
 *   kept on purpose (Chase's call): it is the size the iOS app was designed
 *   at.
 *
 * So `h-14` is 56 px on web and 49 pt on iOS, and a constant written as `56`
 * is right on one platform only. Write it as `rem(3.5)` instead.
 *
 * `REM` must match `metro.config.js`'s `inlineRem` (default 14) on native and
 * the web root font size on web. `components/layout/__tests__/
 * reserved-heights.native-runtime.test.tsx` compiles the classes for iOS the
 * way Metro does and fails if the two drift.
 */

/** `withNativeWind`'s default `inlineRem`, which metro.config.js keeps. */
export const NATIVE_REM = 14;
/** The browser's default root font size. */
export const WEB_REM = 16;

/** The rem on `os`, in px (web) or pt (native). */
export function remFor(os: typeof Platform.OS): number {
	return os === "web" ? WEB_REM : NATIVE_REM;
}

/** One rem on this platform. */
export const REM = remFor(Platform.OS);

/** `n` rem on this platform: `rem(3.5)` is what `h-14` draws. */
export function rem(n: number): number {
	return n * REM;
}
