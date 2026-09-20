import * as React from "react";
import { Text } from "react-native";
import { act, render, screen } from "@testing-library/react-native";

import { Reveal } from "@/components/ui/reusables/reveal/reveal";
import { DUR } from "@/theme/motion";

/**
 * Reveal's own suite, pointed at the component rather than at a card.
 *
 * These assertions were written against `DecisionCard` (decision-card.test.tsx,
 * "opening and closing") while `Reveal` was private to that file; they stay
 * there as the card's integration proof and are restated here against the
 * hoisted component, which is now shared by both collapsible cards.
 *
 * The Reanimated mock lands every animated value on its target immediately, so
 * `progress` reads 1 the moment an open starts — which is what makes "is a
 * height applied at all" the meaningful assertion. The release is a real
 * timer, so these drive it directly.
 */

const TEST_ID = "reveal";

function body() {
	return <Text>Somewhere we have not been.</Text>;
}

describe("Reveal", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	/**
	 * The flattened style on the wrapper. It is an array — the animated style
	 * plus whatever NativeWind's interop contributes for the className — so
	 * "is a height applied at all" has to be asked of the merge.
	 */
	function wrapperStyle(): Record<string, unknown> {
		const style = screen.getByTestId(TEST_ID).props.style;
		const parts: unknown[] = Array.isArray(style) ? style : [style];
		return Object.assign({}, ...parts.filter(Boolean));
	}

	/**
	 * `useReducedMotion` asks `AccessibilityInfo` on mount and resolves a
	 * promise into `setState`. Flushing it here — rather than letting each
	 * test discover it — keeps the run free of "not wrapped in act(...)".
	 */
	async function flush() {
		await act(async () => {});
	}

	function measure(height: number) {
		act(() => {
			screen.getByTestId(`${TEST_ID}-content`).props.onLayout({
				nativeEvent: { layout: { height } },
			});
		});
	}

	it("renders nothing at all while closed", async () => {
		render(
			<Reveal testID={TEST_ID} open={false}>
				{body()}
			</Reveal>,
		);
		await flush();

		expect(screen.queryByTestId(TEST_ID)).toBeNull();
		expect(screen.queryByText("Somewhere we have not been.")).toBeNull();
	});

	it("stops constraining the height once the open has finished", async () => {
		render(
			<Reveal testID={TEST_ID} open>
				{body()}
			</Reveal>,
		);
		await flush();

		measure(240);
		// Mid-open the wrapper is driven: it carries a height taken from the
		// content, so the card can grow into it.
		expect(wrapperStyle()).toMatchObject({ height: 240 });

		act(() => {
			jest.advanceTimersByTime(DUR.base);
		});

		// Settled: the animated style is detached entirely rather than being
		// asked to stop mentioning `height` — Reanimated retains the last
		// value it saw for a key that vanishes from a worklet's result, and a
		// body stuck at its opening height would clip inside Card's
		// overflow-hidden the moment its content grew.
		expect(wrapperStyle()).not.toHaveProperty("height");
		expect(wrapperStyle()).not.toHaveProperty("opacity");
	});

	it("animates closed before it unmounts", async () => {
		const { rerender } = render(
			<Reveal testID={TEST_ID} open>
				{body()}
			</Reveal>,
		);
		await flush();
		measure(240);
		act(() => {
			jest.advanceTimersByTime(DUR.base);
		});

		rerender(
			<Reveal testID={TEST_ID} open={false}>
				{body()}
			</Reveal>,
		);

		// Still mounted, and driven again — this is the close animating.
		expect(screen.getByTestId(TEST_ID)).toBeTruthy();
		expect(wrapperStyle()).toMatchObject({ height: expect.any(Number) });

		act(() => {
			jest.advanceTimersByTime(DUR.base);
		});

		expect(screen.queryByTestId(TEST_ID)).toBeNull();
	});

	it("drives a timing animation in both directions", async () => {
		const reanimated = jest.requireMock("react-native-reanimated") as {
			withTiming: (to: number, config?: unknown) => number;
		};
		const withTiming = jest.spyOn(reanimated, "withTiming");

		const { rerender } = render(
			<Reveal testID={TEST_ID} open>
				{body()}
			</Reveal>,
		);
		await flush();
		expect(withTiming).toHaveBeenCalledWith(1, { duration: DUR.base });

		withTiming.mockClear();
		rerender(
			<Reveal testID={TEST_ID} open={false}>
				{body()}
			</Reveal>,
		);
		expect(withTiming).toHaveBeenCalledWith(0, { duration: DUR.base });

		withTiming.mockRestore();
	});

	// tokens.md §8: the motion is decorative, so reduce-motion skips it
	// without changing what is on screen. The `reducedMotion` prop is the
	// story's and this test's only way in — the app always takes the hook.
	describe("reduce motion", () => {
		it("opens with no animation and no timer", async () => {
			const reanimated = jest.requireMock("react-native-reanimated") as {
				withTiming: (to: number, config?: unknown) => number;
			};
			const withTiming = jest.spyOn(reanimated, "withTiming");

			render(
				<Reveal testID={TEST_ID} open reducedMotion>
					{body()}
				</Reveal>,
			);
			await flush();

			expect(screen.getByText("Somewhere we have not been.")).toBeTruthy();
			// Settled from the first frame: no measured height is ever applied.
			expect(wrapperStyle()).not.toHaveProperty("height");
			expect(withTiming).not.toHaveBeenCalled();

			withTiming.mockRestore();
		});

		it("closes immediately rather than waiting out dur.base", async () => {
			const { rerender } = render(
				<Reveal testID={TEST_ID} open reducedMotion>
					{body()}
				</Reveal>,
			);
			await flush();

			rerender(
				<Reveal testID={TEST_ID} open={false} reducedMotion>
					{body()}
				</Reveal>,
			);

			expect(screen.queryByTestId(TEST_ID)).toBeNull();
		});
	});
});
