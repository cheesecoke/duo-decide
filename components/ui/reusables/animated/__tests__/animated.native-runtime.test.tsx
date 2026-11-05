import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { cssToReactNativeRuntimeOptions } from "nativewind/dist/metro/common";
import postcss from "postcss";
import * as React from "react";
import { StyleSheet } from "react-native";
import { cssToReactNativeRuntime } from "react-native-css-interop/dist/css-to-rn";
import { injectData } from "react-native-css-interop/dist/runtime/native/styles";
import { getAnimatedStyle, useAnimatedStyle } from "react-native-reanimated";
import tailwindcss from "tailwindcss";

import { AnimatedView } from "@/components/ui/reusables/animated/animated";
import { SegmentedToggle } from "@/components/ui/reusables/segmented-toggle/segmented-toggle";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const tailwindConfig = require("../../../../../tailwind.config.js");

/**
 * The one suite that runs NativeWind's *native* runtime (the `native-runtime`
 * jest project: the react-native preset, nothing mocked, the thumb's classes
 * compiled from the repo's real tailwind config the way Metro does). Everywhere else
 * nativewind/babel is off and no class carries a style.
 *
 * It exists for one regression: on iOS/Android, a `className` on an
 * `AnimatedView` that also takes a `useAnimatedStyle()` result was dropped
 * entirely — NativeWind flattened the animated handle into the class style,
 * Reanimated mistook the merged object for the handle, and rendered only the
 * animated keys. The Create Decision toggle's thumb (TestFlight build 9)
 * kept its width and lost its position, radius and colour.
 */

const THUMB_CLASSES = ["absolute", "bottom-0", "left-0", "top-0", "rounded-chip", "bg-cta"];

beforeAll(async () => {
	const { css } = await postcss([
		tailwindcss({
			...tailwindConfig,
			content: [{ raw: THUMB_CLASSES.join(" ") }],
		}),
	]).process("@tailwind utilities;", { from: undefined });
	injectData(cssToReactNativeRuntime(css, cssToReactNativeRuntimeOptions));
});

function flat(testID: string) {
	return StyleSheet.flatten(screen.getByTestId(testID, { includeHiddenElements: true }).props.style);
}

function Layer() {
	const animated = useAnimatedStyle(() => ({ width: 42, transform: [{ translateX: 8 }] }), []);
	return <AnimatedView testID="layer" style={animated} className={THUMB_CLASSES.join(" ")} />;
}

describe("AnimatedView on the native runtime", () => {
	it("keeps its classes alongside an animated style", () => {
		render(<Layer />);

		const style = flat("layer");
		expect(style).toMatchObject({
			position: "absolute",
			top: 0,
			bottom: 0,
			left: 0,
			width: 42,
			transform: [{ translateX: 8 }],
		});
		expect(style.backgroundColor).toBeTruthy();
		expect(style.borderRadius).toBeGreaterThan(0);
	});
});

describe("SegmentedToggle thumb on the native runtime", () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("is a positioned, coloured pill sized to the selected segment", async () => {
		render(
			<SegmentedToggle
				options={[
					{ value: "vote", label: "Vote" },
					{ value: "poll", label: "Poll" },
				]}
				value="vote"
				onChange={jest.fn()}
				accessibilityLabel="Decision type"
			/>,
		);
		// Let useReducedMotion's promise settle inside act.
		await act(async () => {});

		act(() => {
			fireEvent(screen.getByLabelText("Vote"), "layout", {
				nativeEvent: { layout: { x: 0, y: 0, width: 150, height: 40 } },
			});
			fireEvent(screen.getByLabelText("Poll"), "layout", {
				nativeEvent: { layout: { x: 150, y: 0, width: 150, height: 40 } },
			});
		});

		// Reanimated's jest build flushes shared-value writes to the view on
		// its frame callback; step past one rather than racing the clock.
		act(() => {
			jest.advanceTimersByTime(50);
		});

		const thumb = screen.getByTestId("segmented-toggle-thumb", { includeHiddenElements: true });
		const style = flat("segmented-toggle-thumb");
		expect(style).toMatchObject({ position: "absolute", top: 0, bottom: 0, left: 0 });
		// The size Reanimated drives onto the view after the first layout.
		expect(getAnimatedStyle(thumb)).toMatchObject({ width: 150, transform: [{ translateX: 0 }] });
		expect(style.backgroundColor).toBeTruthy();
		expect(style.borderRadius).toBeGreaterThan(0);
	});
});
