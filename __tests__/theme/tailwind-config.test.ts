import tailwindConfig from "@/tailwind.config.js";

/**
 * The one thing about `tailwind.config.js` a test can honestly hold.
 *
 * NativeWind's babel preset is off under jest (babel.config.js), so no class
 * in this repo is styled here and asserting a token's value would only be
 * re-reading the file. `darkMode` is different: it is not a token, it decides
 * whether a whole family of classes can *ever* match, and the answer has to
 * stay "no".
 *
 * Duo is light-only for v1 — tokens.md §3 has no dark neutrals and the person
 * presets are picked against a light ground — but the vendored React Native
 * Reusables were not stripped of their `dark:` variants. `button.tsx` alone
 * carries `dark:bg-destructive/60` (:21), `dark:bg-input/30` and
 * `dark:border-input` and `dark:active:bg-input/50` (:27),
 * `dark:active:bg-accent/50` (:37), `dark:aria-invalid:ring-destructive/40`
 * (:10) and the `dark:hover:` / `dark:focus-visible:ring-destructive/40` web
 * variants (:23, :29, :38).
 *
 * Tailwind defaults `darkMode` to `media`, which on web would arm every one of
 * those off the operating system's setting: the Delete button would render
 * `destructive/60` on a machine in dark mode, on a screen that is otherwise
 * entirely light. With `"class"` they key off a `.dark` ancestor instead, and
 * nothing in this app ever writes one — so they are dead classes, which is
 * what they are meant to be.
 */
describe("tailwind.config.js", () => {
	it("gates `dark:` on a class nobody sets, not on the OS setting", () => {
		expect(tailwindConfig.darkMode).toBe("class");
	});
});
