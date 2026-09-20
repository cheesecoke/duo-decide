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

	it("puts the notch on the ring where the shares meet", () => {
		render(<Gauge a={5} b={5} />);
		const divider = screen.getByTestId("gauge-divider");

		// A 50/50 split meets at the top of the ring, so the notch is the
		// vertical radial segment through (cx, cy - r).
		expect(divider.props.x1).toBeCloseTo(80, 6);
		expect(divider.props.x2).toBeCloseTo(80, 6);
		expect(divider.props.y1).toBeCloseTo(80 - (73 - (STROKE / 2 + 1)), 6);
		expect(divider.props.y2).toBeCloseTo(80 - (73 + STROKE / 2 + 1), 6);
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

	it("names itself for a screen reader from the label and the total", () => {
		render(<Gauge a={3} b={1} label="Decisions" />);
		expect(screen.getByTestId("gauge").props.accessibilityLabel).toBe("Decisions: 4");
	});
});
