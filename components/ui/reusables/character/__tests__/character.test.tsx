import * as React from "react";
import { render, screen } from "@testing-library/react-native";
// Namespace import for spying on the hooks, not for `Animated.View`.
// eslint-disable-next-line no-restricted-imports
import * as Reanimated from "react-native-reanimated";

import {
	BREATHE_TO,
	Character,
	Fish,
	Goose,
	resolveStroke,
} from "@/components/ui/reusables/character/character";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { DUR, SPRING } from "@/theme/motion";
import { NEUTRAL } from "@/theme/neutrals";
import { PersonPairProvider } from "@/theme/PersonPairProvider";
import { getPreset } from "@/theme/presets";

// The drawing itself is plain props — `stroke`, `d`, `viewBox` — so what the
// character draws is assertable without running a frame (the SVG mock renders
// every element as a host element, test-utils/react-native-svg-mock.tsx).
//
// Motion is asserted two ways. Where a pose leaves the character somewhere
// other than rest, the transform says so directly — the breathe is the one
// pose that ends at a scale other than 1, which is how "every pose breathes"
// and "nothing breathes" are told apart.
//
// The hop leaves nothing behind: it ends at 0, where every other pose already
// sits, and the mock collapses a sequence to its last leg
// (test-utils/reanimated-mock.tsx). So the hop is asserted as what the
// component *asked for* — up to -8, down on spring.gentle — by spying on the
// builders. That is a weaker test than a value, and it is the strongest one
// available without running a frame; what the hop looks like is Storybook's
// job (character.stories.tsx).

jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: jest.fn(() => false) }));

const mockReducedMotion = useReducedMotion as jest.Mock;

const SAGE = `hsl(${getPreset("sage").base})`;
const BLUSH = `hsl(${getPreset("blush").base})`;

/** The stroke of every line the drawing is made of, de-duplicated. */
function inkColours(): string[] {
	return [...new Set(screen.getAllByTestId("character-ink").map((el) => String(el.props.stroke)))];
}

/** Every transform entry the character carries on the current render. */
function transformOf(): Record<string, number>[] {
	const style = screen.getByTestId("character").props.style as {
		transform?: Record<string, number>[];
	}[];
	return style.flatMap((layer) => layer.transform ?? []);
}

/** The scale the breathe has left the character at. */
function scaleOf(): number {
	return transformOf().find((entry) => "scale" in entry)!.scale;
}

/** The height the hop has left the character at. */
function liftOf(): number {
	return transformOf().find((entry) => "translateY" in entry)!.translateY;
}

/** Where the badge's middle sits, in px from the character box's top-left. */
function badgeCentre(): { x: number; y: number } {
	const badge = screen.getByTestId("character-blocked-badge");
	const { left, top } = screen.getByTestId("character-blocked-anchor").props.style;
	return { x: left + badge.props.width / 2, y: top + badge.props.height / 2 };
}

const withSpringSpy = jest.spyOn(Reanimated, "withSpring");
const withSequenceSpy = jest.spyOn(Reanimated, "withSequence");
const withTimingSpy = jest.spyOn(Reanimated, "withTiming");
const cancelAnimationSpy = jest.spyOn(Reanimated, "cancelAnimation");

beforeEach(() => {
	jest.clearAllMocks();
	mockReducedMotion.mockReturnValue(false);
});

afterAll(() => {
	jest.restoreAllMocks();
});

describe("resolveStroke", () => {
	const pair = { a: { base: "a-base" }, b: { base: "b-base" } } as never;

	it("draws a person in their own base colour", () => {
		expect(resolveStroke("a", false, pair)).toBe("a-base");
		expect(resolveStroke("b", false, pair)).toBe("b-base");
	});

	it("drops the person colour entirely when muted", () => {
		// A muted character is waiting on someone; it must not read as that
		// person having acted, which is what any amount of their hue would say.
		expect(resolveStroke("a", true, pair)).toBe(NEUTRAL.ink3);
		expect(resolveStroke("b", true, pair)).toBe(NEUTRAL.ink3);
	});
});

describe("Character", () => {
	it("names itself and its person for a screen reader", () => {
		render(<Fish />);
		expect(screen.getByTestId("character").props.accessibilityLabel).toBe("Fish, you");
	});

	it("announces itself as a picture, not as a nameless box", () => {
		render(<Fish />);
		expect(screen.getByTestId("character").props.accessibilityRole).toBe("image");
	});

	it("uses the name it is given", () => {
		render(<Goose name="Sam" />);
		expect(screen.getByTestId("character").props.accessibilityLabel).toBe("Goose, Sam");
	});

	it("pairs fish with person A and goose with person B by default", () => {
		render(<Fish />);
		expect(inkColours()).toEqual([SAGE]);

		screen.unmount();
		render(<Goose />);
		expect(inkColours()).toEqual([BLUSH]);
	});

	it("lets the caller put either animal in either person's colour", () => {
		render(<Fish person="b" />);
		expect(inkColours()).toEqual([BLUSH]);
	});

	it("recolours with the person pair it renders under", () => {
		render(
			<PersonPairProvider a="butter" b="sky">
				<Fish />
			</PersonPairProvider>,
		);

		expect(inkColours()).toEqual([`hsl(${getPreset("butter").base})`]);
	});

	it("inks the eye in the same colour as the lines", () => {
		render(<Goose />);
		expect(screen.getByTestId("character-eye").props.fill).toBe(BLUSH);
	});

	it("greys out a muted character, eye included", () => {
		render(<Fish muted />);

		expect(inkColours()).toEqual([NEUTRAL.ink3]);
		expect(screen.getByTestId("character-eye").props.fill).toBe(NEUTRAL.ink3);
	});

	it("mutes the waiting pose without being asked", () => {
		// "Waiting" is the whole reason `muted` exists (tokens.md §9), so the
		// pose carries it rather than every caller remembering both props.
		render(<Fish pose="waiting" />);
		expect(inkColours()).toEqual([NEUTRAL.ink3]);
	});

	it("still lets a waiting character keep its colour when told to", () => {
		render(<Fish pose="waiting" muted={false} />);
		expect(inkColours()).toEqual([SAGE]);
	});

	/* ---------------------------------------------------------------- */
	/* the drawing                                                       */
	/* ---------------------------------------------------------------- */

	it("draws the two animals differently", () => {
		render(<Fish />);
		const fish = screen.getAllByTestId("character-ink").map((el) => el.props.d);

		screen.unmount();
		render(<Goose />);
		const goose = screen.getAllByTestId("character-ink").map((el) => el.props.d);

		expect(fish).not.toEqual(goose);
	});

	it("keeps each animal to at most 6 strokes and 20 command letters", () => {
		// tokens.md §9 is single-stroke line art, and the budget is what keeps
		// it a mark rather than an illustration — and keeps it readable at
		// 32 px. Command *letters*, not segments: implicit continuations mean
		// the real segment counts are higher (20 fish, 26 goose), so this
		// measures how many times the pen is told what to do, not how many
		// curves come out. The brief's "≤ 20 path commands" is read as the
		// former.
		for (const kind of ["fish", "goose"] as const) {
			render(<Character kind={kind} />);
			const lines = screen.getAllByTestId("character-ink");

			expect(lines.length).toBeLessThanOrEqual(6);
			expect(
				lines.reduce((total, el) => total + (String(el.props.d).match(/[A-Za-z]/g) ?? []).length, 0),
			).toBeLessThanOrEqual(20);

			screen.unmount();
		}
	});

	it("scales by the box, never by the drawing", () => {
		// One 96-unit viewBox at every size, so the paths are written once and
		// the same mark is what gets bigger.
		for (const size of [32, 96, 160] as const) {
			render(<Character kind="fish" size={size} />);

			const svg = screen.getByTestId("character-drawing");
			expect(svg.props.viewBox).toBe("0 0 96 96");
			expect(svg.props.width).toBe(size);
			expect(screen.getByTestId("character").props.style[0]).toEqual({
				width: size,
				height: size,
			});

			screen.unmount();
		}
	});

	it("thickens the line at 32 px so the mark survives", () => {
		// In viewBox units, so 96 and 160 draw the identical weight scaled up;
		// 32 needs a heavier line or the character renders as a smudge.
		render(<Character kind="fish" size={96} />);
		const at96 = Number(screen.getAllByTestId("character-ink")[0].props.strokeWidth);

		screen.unmount();
		render(<Character kind="fish" size={160} />);
		expect(Number(screen.getAllByTestId("character-ink")[0].props.strokeWidth)).toBe(at96);

		screen.unmount();
		render(<Character kind="fish" size={32} />);
		expect(Number(screen.getAllByTestId("character-ink")[0].props.strokeWidth)).toBeGreaterThan(at96);
	});

	it("leaves every line unfilled — the eye is the only solid", () => {
		render(<Goose />);

		for (const line of screen.getAllByTestId("character-ink")) {
			expect(line.props.fill).toBe("none");
		}
		expect(screen.getByTestId("character-eye").props.stroke).toBe("none");
	});

	/* ---------------------------------------------------------------- */
	/* the blocked badge                                                 */
	/* ---------------------------------------------------------------- */

	it("marks a blocked character with the ✕ badge", () => {
		// FEATURE-INVENTORY §3 row 18: the creator sits round 3 out, and the
		// badge is the only thing that says so.
		render(<Fish pose="blocked" />);
		expect(screen.getByTestId("character-blocked-badge")).toBeTruthy();
	});

	it("shows the badge in no other pose", () => {
		for (const pose of ["idle", "celebrate", "waiting"] as const) {
			render(<Fish pose={pose} />);
			expect(screen.queryByTestId("character-blocked-badge")).toBeNull();
			screen.unmount();
		}
	});

	it("sizes the badge against the character it sits on", () => {
		render(<Fish pose="blocked" size={32} />);
		expect(screen.getByTestId("character-blocked-badge").props.width).toBe(12);

		screen.unmount();
		render(<Fish pose="blocked" size={96} />);
		expect(screen.getByTestId("character-blocked-badge").props.width).toBe(24);
	});

	it("hangs the badge on the drawing, not on the corner of the box", () => {
		// Neither animal fills its 96-unit box, so a badge pinned to the box
		// corner floats clear of the fish it is supposed to be marking.
		render(<Fish pose="blocked" size={96} />);

		// A box-corner badge (24 px in a 96 box) would centre at (84, 84); the
		// fish's anchor is (68, 68), so both axes must sit strictly inside that.
		const centre = badgeCentre();
		expect(centre.x).toBeLessThan(84);
		expect(centre.y).toBeLessThan(84);
	});

	it("stops both animations when it unmounts", () => {
		render(<Fish pose="idle" />);
		cancelAnimationSpy.mockClear();

		screen.unmount();

		// The effect cleanup cancels the breathe loop and the hop value; two
		// calls, one per shared value, each with a shared-value object.
		expect(cancelAnimationSpy).toHaveBeenCalledTimes(2);
		for (const [value] of cancelAnimationSpy.mock.calls) {
			expect(value).toHaveProperty("value");
		}
	});

	it("anchors the badge to each animal's own ink", () => {
		render(<Fish pose="blocked" />);
		const fish = badgeCentre();

		screen.unmount();
		render(<Goose pose="blocked" />);

		// The goose stands taller and ends lower than the fish swims, so a
		// shared anchor would be wrong for one of them.
		expect(badgeCentre()).not.toEqual(fish);
	});

	it("keeps the badge on the same spot of the drawing at every size", () => {
		render(<Goose pose="blocked" size={96} />);
		const at96 = badgeCentre();

		screen.unmount();
		render(<Goose pose="blocked" size={160} />);
		const at160 = badgeCentre();

		// Same point of the 96-unit drawing, so the mark does not wander off
		// the animal as the box grows.
		expect(at160.x).toBeCloseTo((at96.x * 160) / 96, 6);
		expect(at160.y).toBeCloseTo((at96.y * 160) / 96, 6);
	});

	it("draws the badge cross in ink-2, never in the person colour", () => {
		render(<Fish pose="blocked" />);
		expect(screen.getByTestId("character-blocked-cross").props.stroke).toBe(NEUTRAL.ink2);
	});

	/* ---------------------------------------------------------------- */
	/* motion                                                            */
	/* ---------------------------------------------------------------- */

	// The reanimated mock lands animations on their target, so the render
	// AFTER the effect shows where the pose left the character at rest.

	it("breathes when idle", () => {
		const { rerender } = render(<Fish pose="idle" />);
		rerender(<Fish pose="idle" />);

		expect(scaleOf()).toBe(BREATHE_TO);
	});

	it("holds still in every other pose", () => {
		for (const pose of ["celebrate", "waiting", "blocked"] as const) {
			const { rerender } = render(<Fish pose={pose} />);
			rerender(<Fish pose={pose} />);

			expect(scaleOf()).toBe(1);
			screen.unmount();
		}
	});

	it("stops breathing when the pose leaves idle", () => {
		const { rerender } = render(<Fish pose="idle" />);
		rerender(<Fish pose="idle" />);
		expect(scaleOf()).toBe(BREATHE_TO);

		rerender(<Fish pose="waiting" />);
		rerender(<Fish pose="waiting" />);

		// A breathe that is only cancelled on unmount leaves a "waiting"
		// character quietly pulsing at whatever scale it was caught at.
		expect(scaleOf()).toBe(1);
	});

	it("hops once when it celebrates", () => {
		render(<Fish pose="celebrate" />);

		// Up to -8 instantly, then down on spring.gentle: the hop is the fall,
		// which is what keeps it to the one overshoot tokens.md §8 allows.
		expect(withSequenceSpy).toHaveBeenCalled();
		expect(withTimingSpy).toHaveBeenCalledWith(-8, { duration: 0 });
		expect(withSpringSpy).toHaveBeenCalledWith(0, SPRING.gentle);
		expect(liftOf()).toBe(0);
	});

	it("hops again when the pose changes back to celebrate", () => {
		// The result reveal re-poses a character that is already mounted; a
		// hop that only fires on mount never plays there.
		const { rerender } = render(<Fish pose="idle" />);
		expect(withSpringSpy).not.toHaveBeenCalled();

		rerender(<Fish pose="celebrate" />);

		expect(withSpringSpy).toHaveBeenCalledWith(0, SPRING.gentle);
	});

	it("does not hop under reduce motion", () => {
		mockReducedMotion.mockReturnValue(true);

		render(<Fish pose="celebrate" />);

		expect(withSpringSpy).not.toHaveBeenCalled();
		expect(withSequenceSpy).not.toHaveBeenCalled();
		expect(liftOf()).toBe(0);
	});

	it("eases back to rest on a pose change rather than snapping", () => {
		// Cancelling the breathe catches it mid-loop, so a character that
		// jumps from 1.02 to 1.0 reads as a glitch (tokens.md §10 — every
		// state change moves).
		const { rerender } = render(<Fish pose="idle" />);
		rerender(<Fish pose="waiting" />);

		expect(withTimingSpy).toHaveBeenCalledWith(1, { duration: DUR.base });
	});

	it("does not move at all under reduce motion", () => {
		mockReducedMotion.mockReturnValue(true);

		const { rerender } = render(<Fish pose="idle" />);
		rerender(<Fish pose="idle" />);

		expect(scaleOf()).toBe(1);
		expect(withTimingSpy).not.toHaveBeenCalled();
	});
});
