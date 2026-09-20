import * as React from "react";
import { render, screen } from "@testing-library/react-native";

import {
	BREATHE_TO,
	Character,
	Fish,
	Goose,
	resolveStroke,
} from "@/components/ui/reusables/character/character";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { NEUTRAL } from "@/theme/neutrals";
import { PersonPairProvider } from "@/theme/PersonPairProvider";
import { getPreset } from "@/theme/presets";

// The drawing itself is plain props — `stroke`, `d`, `viewBox` — so what the
// character draws is assertable without running a frame (the SVG mock renders
// every element as a host element, test-utils/react-native-svg-mock.tsx).
//
// Motion is asserted only where it changes what is on screen at rest: the
// breathe is the one pose that leaves the character at a scale other than 1,
// which is how "every pose breathes" and "nothing breathes" are told apart.
// The shape of the hop is Storybook's job (character.stories.tsx).

jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: jest.fn(() => false) }));

const mockReducedMotion = useReducedMotion as jest.Mock;

const SAGE = `hsl(${getPreset("sage").base})`;
const BLUSH = `hsl(${getPreset("blush").base})`;

/** The stroke of every line the drawing is made of, de-duplicated. */
function inkColours(): string[] {
	return [...new Set(screen.getAllByTestId("character-ink").map((el) => String(el.props.stroke)))];
}

/** The scale the breathe has left the character at on the current render. */
function scaleOf(): number {
	const style = screen.getByTestId("character").props.style as { transform: { scale: number }[] }[];
	const transform = style.flatMap((layer) => layer.transform ?? []);
	return transform.find((entry) => "scale" in entry)!.scale;
}

afterEach(() => mockReducedMotion.mockReturnValue(false));

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

	it("keeps each animal inside the line-art budget", () => {
		// tokens.md §9 is single-stroke line art: ≤ 20 drawing commands, or it
		// stops being a mark and starts being an illustration — and stops
		// being readable at 32 px.
		for (const kind of ["fish", "goose"] as const) {
			render(<Character kind={kind} />);

			const commands = screen
				.getAllByTestId("character-ink")
				.reduce((total, el) => total + (String(el.props.d).match(/[A-Za-z]/g) ?? []).length, 0);

			expect(commands).toBeLessThanOrEqual(20);
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

	it("does not move at all under reduce motion", () => {
		mockReducedMotion.mockReturnValue(true);

		const { rerender } = render(<Fish pose="idle" />);
		rerender(<Fish pose="idle" />);

		expect(scaleOf()).toBe(1);
	});
});
