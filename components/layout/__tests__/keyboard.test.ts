import { keyboardLift, liftAnimation, revealOffset } from "@/components/layout/keyboard";

/**
 * The lift is the keyboard's reach up from the bottom of the window. The
 * case that mattered in build 9 is the page sheet: nothing here depends on
 * where the sheet starts, so there is no offset to come up short by.
 */
describe("keyboardLift", () => {
	const WINDOW = 844;

	it.each([
		["a docked keyboard", { screenY: 508, height: 336 }, 336],
		["a taller one (QuickType / autofill bar)", { screenY: 464, height: 380 }, 380],
		["an iPhone SE's (667 pt window) — same rule", { screenY: WINDOW - 260, height: 260 }, 260],
		["the keyboard going down", { screenY: WINDOW, height: 336 }, 0],
		["a frame past the bottom edge", { screenY: WINDOW + 20, height: 336 }, 0],
		["Prefer Cross-Fade Transitions (screenY reported as 0)", { screenY: 0, height: 336 }, 336],
		["a zero-height keyboard", { screenY: WINDOW, height: 0 }, 0],
		["a fractional frame", { screenY: 507.67, height: 336.33 }, 336],
		["a NaN frame", { screenY: Number.NaN, height: 336 }, 0],
	])("%s", (_label, frame, expected) => {
		expect(keyboardLift(frame, WINDOW)).toBe(expected);
	});

	it("is 0 for a window it cannot read", () => {
		expect(keyboardLift({ screenY: 508, height: 336 }, Number.NaN)).toBe(0);
	});

	/**
	 * Build 9's rule, for the record: `frame.bottom - (screenY - offset)`
	 * with the offset read from `measureInWindow`, which on a page sheet
	 * under the new architecture misses the sheet's own top offset. The
	 * difference is that offset: the footer sat that far too low.
	 */
	it("does not depend on where the layout starts in the window", () => {
		const sheetTop = 59;
		const headerHeight = 60;
		const layoutHeight = 844 - sheetTop - headerHeight;
		const measuredTop = headerHeight; // what the shadow tree reports
		const build9 = Math.max(0, measuredTop + layoutHeight - 508);
		expect(build9).toBe(336 - sheetTop);
		expect(keyboardLift({ screenY: 508, height: 336 }, 844)).toBe(336);
	});
});

describe("liftAnimation", () => {
	it("uses the keyboard's own duration and curve", () => {
		expect(liftAnimation({ duration: 250, easing: "keyboard" }, false)).toEqual({
			duration: 250,
			update: { duration: 250, type: "keyboard" },
		});
		expect(liftAnimation({ duration: 300, easing: "easeInEaseOut" }, false)?.update?.type).toBe(
			"easeInEaseOut",
		);
	});

	it("respects RCTLayoutAnimation's 10 ms floor", () => {
		expect(liftAnimation({ duration: 4, easing: "keyboard" }, false)?.duration).toBe(10);
	});

	it.each([
		["reduced motion", { duration: 250, easing: "keyboard" as const }, true],
		["an event without a duration", { duration: 0, easing: "keyboard" as const }, false],
	])("is null for %s", (_label, event, reduced) => {
		expect(liftAnimation(event, reduced)).toBeNull();
	});
});

describe("revealOffset (shared with the bottom drawer)", () => {
	it.each([
		["below the visible part", { y: 400, height: 48 }, { offset: 0, height: 300 }, 164],
		["above it", { y: 20, height: 48 }, { offset: 200, height: 300 }, 4],
		["already in view", { y: 100, height: 48 }, { offset: 0, height: 300 }, null],
		["before the body is measured", { y: 400, height: 48 }, { offset: 0, height: 0 }, null],
	])("%s", (_label, field, body, expected) => {
		expect(revealOffset(field, body)).toBe(expected);
	});
});
