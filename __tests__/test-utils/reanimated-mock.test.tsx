import { render, screen } from "@testing-library/react-native";
import * as React from "react";

import {
	createReanimatedMock,
	FadeOut,
	interpolate,
	withSequence,
} from "@/test-utils/reanimated-mock";
import { LayoutAnimatedMessage } from "@/test-utils/layout-animation-fixture";

/**
 * The Reanimated stand-in (test-utils/reanimated-mock.tsx, wired up in
 * test-utils/setup.ts) has to cover what app code can reach for, not just what
 * the design-system components use today. The sharp case is a layout-animation
 * builder chained *at render time* — `FadeOut.duration(275)` — which explodes
 * a mock that only stubs hooks. `LayoutAnimatedMessage` is that shape and
 * nothing else; see the fixture for why it is a fixture.
 */

describe("reanimated mock", () => {
	it("renders a component that chains FadeOut.duration at render time", () => {
		expect(() => render(<LayoutAnimatedMessage>Pick a night</LayoutAnimatedMessage>)).not.toThrow();
		expect(screen.getByText("Pick a night")).toBeTruthy();
	});

	it("hands the entering/exiting builders through to the animated node", () => {
		render(<LayoutAnimatedMessage>Pick a night</LayoutAnimatedMessage>);

		const message = screen.getByText("Pick a night");
		expect(message.props.entering.name).toBe("FadeInDown");
		expect(message.props.exiting.name).toBe("FadeOut");
	});

	it("chains layout-animation modifiers back onto the same builder", () => {
		expect(FadeOut.duration(275)).toBe(FadeOut);
		expect(FadeOut.delay(50).springify()).toBe(FadeOut);
	});

	it("interpolates linearly and clamps at the ends", () => {
		expect(interpolate(0.5, [0, 1], [0, 100])).toBe(50);
		expect(interpolate(-1, [0, 1], [0, 100])).toBe(0);
		expect(interpolate(2, [0, 1], [0, 100])).toBe(100);
	});

	it("settles a sequence on its last animation", () => {
		expect(withSequence(1, 2, 3)).toBe(3);
	});

	it("names the missing symbol instead of handing back undefined", () => {
		const mock = createReanimatedMock();

		expect(() => mock.useAnimatedGestureHandler).toThrow(
			'reanimated symbol "useAnimatedGestureHandler" not mocked in test-utils/reanimated-mock.tsx',
		);
	});

	it("lets interop and inspection probes through without throwing", () => {
		const mock = createReanimatedMock();

		// Set by babel's ESM→CJS transform, and what `import Animated from`
		// interop keys off — it must report the real value, not throw.
		expect(mock.__esModule).toBe(true);
		expect(mock.then).toBeUndefined();
		expect(mock.nodeType).toBeUndefined();
		expect(mock[Symbol.toStringTag as unknown as string]).toBeUndefined();
		expect(mock.useSharedValue).toBeDefined();
	});
});
