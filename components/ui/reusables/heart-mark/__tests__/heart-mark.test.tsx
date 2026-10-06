import * as React from "react";
import { render, screen } from "@testing-library/react-native";

import { HeartMark, taperedStroke } from "@/components/ui/reusables/heart-mark/heart-mark";

/**
 * nativewind/babel is off under jest (babel.config.js) and the mark carries no
 * classes anyway — its colour and weight are SVG props. So what is asserted
 * here is the contract three callers depend on: the testID they find it by,
 * the colour they hand it, the 20 × 18 box, and the taper that keeps the
 * header's weight while stopping the 64 px mark drawing a rope.
 */
describe("HeartMark", () => {
	it("is decorative: found by testID, never by a label of its own", () => {
		render(<HeartMark color="hsl(1 2% 3%)" />);

		expect(screen.getByTestId("brand-heart")).toBeTruthy();
		expect(screen.queryByRole("image")).toBeNull();
	});

	it("draws in the colour it is handed", () => {
		render(<HeartMark color="hsl(1 2% 3%)" />);

		const path = screen.getByTestId("brand-heart").props.children;
		expect(path.props.stroke).toBe("hsl(1 2% 3%)");
		expect(path.props.fill).toBe("none");
	});

	it("keeps the 20 × 18 grid at every size", () => {
		const { rerender } = render(<HeartMark color="red" />);
		expect(screen.getByTestId("brand-heart").props.width).toBe(20);
		expect(screen.getByTestId("brand-heart").props.height).toBe(18);

		rerender(<HeartMark color="red" size={64} />);
		expect(screen.getByTestId("brand-heart").props.width).toBe(64);
		expect(screen.getByTestId("brand-heart").props.height).toBe(57.6);
	});

	it("lets a caller name the weight, in grid units", () => {
		render(<HeartMark color="red" size={64} strokeWidth={1.9} />);

		expect(screen.getByTestId("brand-heart").props.children.props.strokeWidth).toBe(1.9);
	});
});

describe("taperedStroke", () => {
	/** The header's weight is the anchor, and it does not move. */
	it("is the header's 1.9 at 20", () => {
		expect(taperedStroke(20)).toBe(1.9);
	});

	/**
	 * The point of the curve: rendered px = grid units × size / 20. A fixed
	 * 1.9 would render at 6.08 px on Welcome's mark; the taper holds it near
	 * the 3.3 px `Character` carries at 160.
	 */
	it.each([
		[20, 1.9],
		[40, 2.69],
		[64, 3.4],
	])("renders ~%p px of line at size %p", (size, expected) => {
		expect((taperedStroke(size) * size) / 20).toBeCloseTo(expected, 1);
	});

	it("never grows the rendered line faster than the mark", () => {
		const small = (taperedStroke(20) * 20) / 20;
		const large = (taperedStroke(64) * 64) / 20;

		expect(large).toBeGreaterThan(small);
		expect(large).toBeLessThan(small * (64 / 20));
	});
});
