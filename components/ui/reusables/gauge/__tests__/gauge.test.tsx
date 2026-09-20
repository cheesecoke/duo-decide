import * as React from "react";
import { render, screen } from "@testing-library/react-native";

import { computeShares, Gauge, STROKE } from "@/components/ui/reusables/gauge/gauge";
import { NEUTRAL } from "@/theme/neutrals";
import { getPreset } from "@/theme/presets";

// The reveal is not exercised here: the Reanimated mock lands every animated
// value on its target immediately, so `strokeDashoffset` is not a signal. The
// drawn share deliberately lives in `strokeDasharray`, which is a plain prop
// — see the component's docblock — so these tests can assert the geometry
// without running a frame. The motion is Storybook's job (gauge.stories.tsx).

/** `"37.6 50.2"` → 0.75 — the share of the ring the dash actually paints. */
function drawnShare(testID: string): number {
	const [visible, length] = String(screen.getByTestId(testID).props.strokeDasharray)
		.split(" ")
		.map(Number);
	return visible / length;
}

/**
 * The reveal's current position for one arc. `animatedProps` arrives as a
 * plain prop here because the Reanimated mock's `createAnimatedComponent` is
 * the identity — so the offset the component computed this render is legible,
 * which is the whole point of deriving it rather than seeding it.
 */
function revealOffset(testID: string): number {
	return screen.getByTestId(testID).props.animatedProps.strokeDashoffset;
}

/** The ring's own numbers at the default size, derived here, not imported. */
const RADIUS = (160 - STROKE) / 2;
const LENGTH = Math.PI * RADIUS;
const CENTRE = 80;

describe("computeShares", () => {
	it("splits the ring by the counts", () => {
		expect(computeShares(3, 1)).toEqual({ a: 0.75, b: 0.25, total: 4 });
	});

	it("halves an even split", () => {
		expect(computeShares(5, 5)).toEqual({ a: 0.5, b: 0.5, total: 10 });
	});

	it("gives a whole side the whole ring", () => {
		expect(computeShares(4, 0)).toEqual({ a: 1, b: 0, total: 4 });
	});

	it("reports zero shares — not a tie — when nobody has decided anything", () => {
		// The caller has to be able to tell 0/0 from 1/1, or the empty gauge
		// draws two half arcs of nothing.
		expect(computeShares(0, 0)).toEqual({ a: 0, b: 0, total: 0 });
	});

	it("treats negative and non-finite counts as zero", () => {
		expect(computeShares(-3, 1)).toEqual({ a: 0, b: 1, total: 1 });
		expect(computeShares(Number.NaN, 2)).toEqual({ a: 0, b: 1, total: 2 });
		expect(computeShares(Number.POSITIVE_INFINITY, 0)).toEqual({ a: 0, b: 0, total: 0 });
	});
});

describe("Gauge", () => {
	it("draws A's share from the left and B's from the right", () => {
		render(<Gauge a={3} b={1} />);

		expect(drawnShare("gauge-arc-a")).toBeCloseTo(0.75, 10);
		expect(drawnShare("gauge-arc-b")).toBeCloseTo(0.25, 10);
	});

	it("draws B's arc as the same semicircle written backwards", () => {
		render(<Gauge a={3} b={1} />);

		// Both arcs share the track's path length; only the direction differs,
		// which is what lets one dash grow left-to-right and the other right-
		// to-left with no second coordinate system.
		const arcA = screen.getByTestId("gauge-arc-a").props.d as string;
		const arcB = screen.getByTestId("gauge-arc-b").props.d as string;

		expect(arcA).toMatch(/^M 7 80 A 73 73 0 0 1 153 80$/);
		expect(arcB).toMatch(/^M 153 80 A 73 73 0 0 0 7 80$/);
	});

	it("shows the total in the centre", () => {
		render(<Gauge a={3} b={1} label="Decisions" />);

		expect(screen.getByText("4")).toBeTruthy();
		expect(screen.getByText("Decisions")).toBeTruthy();
	});

	it("renders the empty track and a zero for 0 / 0", () => {
		render(<Gauge a={0} b={0} />);

		expect(screen.getByTestId("gauge-track")).toBeTruthy();
		expect(screen.queryByTestId("gauge-arc-a")).toBeNull();
		expect(screen.queryByTestId("gauge-arc-b")).toBeNull();
		expect(screen.getByText("0")).toBeTruthy();
	});

	it("omits the arc of a side with no count, rather than drawing a zero-length dash", () => {
		// A round cap on a zero-length dash paints a dot — a phantom vote.
		render(<Gauge a={4} b={0} />);

		expect(drawnShare("gauge-arc-a")).toBe(1);
		expect(screen.queryByTestId("gauge-arc-b")).toBeNull();
	});

	it("notches the ring only where both shares meet", () => {
		render(<Gauge a={3} b={1} />);
		expect(screen.getByTestId("gauge-divider")).toBeTruthy();

		screen.unmount();
		render(<Gauge a={4} b={0} />);
		expect(screen.queryByTestId("gauge-divider")).toBeNull();
	});

	/**
	 * Measured back out of the drawn segment — midpoint, radius, angle —
	 * rather than recomputed with the component's own expression, which is
	 * what the previous version of this test did and why it could not see the
	 * notch sitting 5 px off the seam.
	 */
	function notchAngle(): number {
		const divider = screen.getByTestId("gauge-divider");
		const mx = (divider.props.x1 + divider.props.x2) / 2;
		const my = (divider.props.y1 + divider.props.y2) / 2;

		expect(Math.hypot(mx - CENTRE, CENTRE - my)).toBeCloseTo(RADIUS, 6);
		return Math.atan2(CENTRE - my, mx - CENTRE);
	}

	it("puts the notch on the colour seam, half a stroke short of A's dash end", () => {
		// Both dashes are round-capped, so each paints STROKE / 2 past its own
		// end, and B is drawn after A — so B's cap covers A's last half stroke
		// and the seam the eye sees is that much short of the nominal share.
		render(<Gauge a={3} b={1} />);

		const seam = LENGTH * 0.75 - STROKE / 2;
		expect(notchAngle()).toBeCloseTo(Math.PI * (1 - seam / LENGTH), 6);
	});

	it("does not put the notch at the nominal share boundary", () => {
		// The bug this replaced: a 4 px cream line ~5 px inside the B arc.
		render(<Gauge a={3} b={1} />);

		const nominal = Math.PI * (1 - 0.75);
		expect(Math.abs(notchAngle() - nominal)).toBeGreaterThan(0.05);
	});

	it("puts an even split just past the top of the ring, not on it", () => {
		render(<Gauge a={5} b={5} />);

		// Half a stroke of arc length past 12 o'clock, towards A's side.
		expect(notchAngle()).toBeCloseTo(Math.PI / 2 + (Math.PI * (STROKE / 2)) / LENGTH, 6);
	});

	it("spans the stroke, a pixel proud either side", () => {
		render(<Gauge a={3} b={1} />);
		const divider = screen.getByTestId("gauge-divider");
		const reach = STROKE / 2 + 1;

		expect(Math.hypot(divider.props.x1 - CENTRE, CENTRE - divider.props.y1)).toBeCloseTo(
			RADIUS - reach,
			6,
		);
		expect(Math.hypot(divider.props.x2 - CENTRE, CENTRE - divider.props.y2)).toBeCloseTo(
			RADIUS + reach,
			6,
		);
	});

	it("keeps the notch on the ring when A's share is shorter than the cap covering it", () => {
		// seam = visibleA - STROKE / 2 would go negative here; it clamps to the
		// ring's own start rather than running off the left end.
		render(<Gauge a={1} b={199} />);

		expect(notchAngle()).toBeCloseTo(Math.PI, 6);
	});

	it("takes its arc colours from the person pair and its track from line", () => {
		render(<Gauge a={1} b={1} />);

		expect(screen.getByTestId("gauge-arc-a").props.stroke).toBe(`hsl(${getPreset("sage").base})`);
		expect(screen.getByTestId("gauge-arc-b").props.stroke).toBe(`hsl(${getPreset("blush").base})`);
		expect(screen.getByTestId("gauge-track").props.stroke).toBe(NEUTRAL.line);
		expect(screen.getByTestId("gauge-divider").props.stroke).toBe(NEUTRAL.bg);
	});

	it("sizes the box as the top half of the ring plus the stroke's overhang", () => {
		render(<Gauge a={1} b={1} size={220} />);

		expect(screen.getByTestId("gauge").props.style).toEqual({ width: 220, height: 110 + STROKE / 2 });
	});

	/* ---------------------------------------------------------------- */
	/* the reveal                                                        */
	/* ---------------------------------------------------------------- */

	// The mock lands `withTiming` on its target immediately, so a render AFTER
	// the effect has run shows a finished reveal and the render the effect ran
	// on shows the start of it. That is enough to pin *which* render the
	// reveal starts from, which is the thing that was wrong.

	it("starts the reveal from the first render that has counts, not from the mount", () => {
		// The History screen's shape: mounted while the counts are still
		// loading. The old version latched here and spent the animation on an
		// empty ring, then snapped the real arcs in.
		const { rerender } = render(<Gauge a={0} b={0} />);
		expect(screen.queryByTestId("gauge-arc-a")).toBeNull();

		rerender(<Gauge a={3} b={1} />);

		// Fully hidden, and hidden by the 3 / 1 geometry — the reveal is
		// starting here, on this render.
		expect(revealOffset("gauge-arc-a")).toBeCloseTo(LENGTH * 0.75, 6);
		expect(revealOffset("gauge-arc-b")).toBeCloseTo(LENGTH * 0.25, 6);

		rerender(<Gauge a={3} b={1} />);

		expect(revealOffset("gauge-arc-a")).toBe(0);
		expect(revealOffset("gauge-arc-b")).toBe(0);
	});

	it("reveals from the mount when the counts are there already", () => {
		const { rerender } = render(<Gauge a={3} b={1} />);

		expect(revealOffset("gauge-arc-a")).toBeCloseTo(LENGTH * 0.75, 6);

		rerender(<Gauge a={3} b={1} />);

		expect(revealOffset("gauge-arc-a")).toBe(0);
	});

	it("moves strokeDasharray, not the reveal, when the counts change later", () => {
		const { rerender } = render(<Gauge a={3} b={1} />);
		rerender(<Gauge a={3} b={1} />);
		expect(revealOffset("gauge-arc-a")).toBe(0);

		rerender(<Gauge a={5} b={5} />);

		// The share moved and the arcs stayed drawn: no second reveal, which
		// would look like the gauge redrawing itself every time a decision
		// lands.
		expect(drawnShare("gauge-arc-a")).toBeCloseTo(0.5, 10);
		expect(revealOffset("gauge-arc-a")).toBe(0);
	});

	it("names itself for a screen reader from the label and the total", () => {
		render(<Gauge a={3} b={1} label="Decisions" />);
		expect(screen.getByTestId("gauge").props.accessibilityLabel).toBe("Decisions: 4");
	});
});
