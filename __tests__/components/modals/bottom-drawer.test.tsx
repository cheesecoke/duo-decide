import * as React from "react";
import { Text, View } from "react-native";
import { act, fireEvent, render, screen, userEvent } from "@testing-library/react-native";

import { BottomDrawer, revealOffset } from "@/components/modals/BottomDrawer";
import { DUR } from "@/theme/motion";
import { NEUTRAL } from "@/theme/neutrals";
import { SHADOW } from "@/theme/shadows";

/**
 * The sheet chrome (FEATURE-INVENTORY §0.3).
 *
 * The drawer is a slot: it owns the title row, the scrim, the scrolling body
 * and — new here — an optional footer. What is asserted is exactly that
 * contract. The rise, the scrim fade and the `together` hairline are visual
 * and live in Storybook; under jest the Animated mock lands every value at
 * its end state.
 */

function renderDrawer(props: Partial<React.ComponentProps<typeof BottomDrawer>> = {}) {
	const onClose = jest.fn();
	render(
		<BottomDrawer visible onClose={onClose} title="Settings" {...props}>
			<Text>the body</Text>
		</BottomDrawer>,
		// Host refs are null under the test renderer unless something stands
		// in for the native node; the reveal-on-focus measures against one.
		{ createNodeMock: () => ({}) },
	);
	return onClose;
}

describe("BottomDrawer", () => {
	it("renders its title and its content", () => {
		renderDrawer();

		expect(screen.getByText("Settings")).toBeTruthy();
		expect(screen.getByText("the body")).toBeTruthy();
	});

	it("is not there at all while closed", () => {
		render(
			<BottomDrawer visible={false} onClose={jest.fn()} title="Settings">
				<Text>the body</Text>
			</BottomDrawer>,
		);

		expect(screen.queryByText("the body")).toBeNull();
	});

	it("closes on the backdrop (§0.3)", async () => {
		const onClose = renderDrawer();

		await userEvent.press(screen.getByTestId("drawer-backdrop"));

		expect(onClose).toHaveBeenCalledTimes(1);
	});

	// PLAN-3 final review I6: the backdrop is already `accessible={false}`,
	// and React Native Web would still tab to it — a full-screen unnamed
	// target that closes the sheet, first in the tab order.
	it("keeps the backdrop out of the tab order", () => {
		renderDrawer();

		expect(screen.getByTestId("drawer-backdrop").props.tabIndex).toBe(-1);
	});

	it("closes on the circle in the title row", async () => {
		const onClose = renderDrawer();

		await userEvent.press(screen.getByTestId("drawer-close"));

		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("has no footer unless it is given one", () => {
		renderDrawer();

		expect(screen.queryByTestId("drawer-footer")).toBeNull();
	});

	it("renders the footer slot outside the scrolling body", () => {
		renderDrawer({
			footer: (
				<View>
					<Text>Keep it</Text>
				</View>
			),
		});

		const footer = screen.getByTestId("drawer-footer");
		expect(footer).toBeTruthy();
		expect(screen.getByText("Keep it")).toBeTruthy();
		// The body scrolls; the footer does not sit inside the ScrollView.
		expect(screen.getByText("the body")).toBeTruthy();
	});

	it("keeps the body's keyboard rules (§0.3)", () => {
		renderDrawer();

		const body = screen.UNSAFE_getByType(
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			require("react-native").ScrollView,
		);
		// `handled`: a press on a body button lands with the keyboard up.
		expect(body.props.keyboardShouldPersistTaps).toBe("handled");
		expect(body.props.bounces).toBe(false);
	});
});

/**
 * The home indicator. The sheet runs to the bottom of the screen, so on an
 * iPhone its last row needs the bottom inset under it — and the keyboard lift
 * gives that strip back, since the keyboard covers it. Jest's zero-inset mock
 * (test-utils/setup.ts) is swapped for an iPhone's here.
 */
describe("BottomDrawer — safe area", () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const safeArea = require("react-native-safe-area-context");

	afterEach(() => jest.restoreAllMocks());

	it("pads the sheet clear of the home indicator", () => {
		jest
			.spyOn(safeArea, "useSafeAreaInsets")
			.mockReturnValue({ top: 59, right: 0, bottom: 34, left: 0 });
		renderDrawer();

		expect(screen.getByTestId("drawer-surface").props.style).toMatchObject({ paddingBottom: 34 });
		expect(screen.getByTestId("drawer-keyboard").props.keyboardVerticalOffset).toBe(-34);
	});

	it("adds nothing where there is no inset (web)", () => {
		renderDrawer();

		expect(screen.getByTestId("drawer-surface").props.style).toMatchObject({ paddingBottom: 0 });
	});
});

describe("BottomDrawer — the sheet's shadow", () => {
	// A shadow on a view with no background draws nothing on Android and
	// makes iOS trace its children's alpha. The view that carries
	// SHADOW.float paints the same surface, at the same top corners, as the
	// clipped surface inside it.
	it("sits on a view that paints the sheet's surface", () => {
		renderDrawer();

		// StyleSheet is mocked in test-utils/setup.ts; the style is a flat array.
		const style = Object.assign({}, ...screen.getByTestId("drawer-sheet").props.style);
		expect(style).toMatchObject(SHADOW.float);
		expect(style).toMatchObject({
			backgroundColor: NEUTRAL.surface,
			borderTopLeftRadius: 32,
			borderTopRightRadius: 32,
		});
	});
});

/**
 * Reveal-on-focus (iOS). The keyboard lift ends the sheet at the keyboard,
 * so a field is above the keyboard exactly when it is inside the body's
 * visible part; the body scrolls a focused field into that part. The mock
 * ScrollView's ref hands out one shared `scrollTo` (test-utils/setup.ts), and
 * `TextInput.State.currentlyFocusedInput` is stubbed with a field that
 * measures where the test says it is.
 */
describe("revealOffset", () => {
	const body = { offset: 0, height: 400 };

	it("leaves a field that is already in view alone", () => {
		expect(revealOffset({ y: 100, height: 44 }, body)).toBeNull();
	});

	it("scrolls a field below the visible part up to its bottom edge, plus the margin", () => {
		expect(revealOffset({ y: 600, height: 44 }, body)).toBe(600 + 44 + 16 - 400);
	});

	it("scrolls a field above the visible part down to its top edge, less the margin", () => {
		expect(revealOffset({ y: 100, height: 44 }, { offset: 300, height: 400 })).toBe(84);
	});

	it("keeps the top of a field taller than the body in view", () => {
		expect(revealOffset({ y: 600, height: 500 }, body)).toBe(584);
	});

	it("never scrolls before the body has been measured", () => {
		expect(revealOffset({ y: 600, height: 44 }, { offset: 0, height: 0 })).toBeNull();
	});
});

describe("BottomDrawer — reveal-on-focus (iOS)", () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const RN = require("react-native");
	const scrollTo: jest.Mock = RN.ScrollView.mockScrollTo;
	const focused: jest.Mock = RN.TextInput.State.currentlyFocusedInput;

	function focusFieldAt(y: number, height = 44) {
		focused.mockReturnValue({
			measureLayout: jest.fn((_node: unknown, onSuccess: (...box: number[]) => void) =>
				onSuccess(0, y, 300, height),
			),
		});
	}

	function layoutBody(height: number) {
		fireEvent(screen.getByTestId("drawer-body"), "layout", {
			nativeEvent: { layout: { x: 0, y: 0, width: 350, height } },
		});
	}

	beforeEach(() => scrollTo.mockClear());
	afterEach(() => focused.mockReturnValue(null));

	it("scrolls a field low in the body into view when it takes focus", () => {
		renderDrawer();
		layoutBody(400);
		focusFieldAt(600);

		fireEvent(screen.getByTestId("drawer-content"), "focus");

		expect(scrollTo).toHaveBeenCalledWith({ y: 260, animated: true });
	});

	it("does not scroll for a field that is already in view", () => {
		renderDrawer();
		layoutBody(400);
		focusFieldAt(100);

		fireEvent(screen.getByTestId("drawer-content"), "focus");

		expect(scrollTo).not.toHaveBeenCalled();
	});

	it("reveals the focused field again once the keyboard has shrunk the body", () => {
		renderDrawer();
		layoutBody(600);
		focusFieldAt(500);
		fireEvent(screen.getByTestId("drawer-content"), "focus");
		expect(scrollTo).not.toHaveBeenCalled();

		// The keyboard lands after the focus that raised it.
		layoutBody(400);

		expect(scrollTo).toHaveBeenCalledWith({ y: 160, animated: true });
	});

	it("does not pull the body back while it grows (the keyboard going down)", () => {
		renderDrawer();
		layoutBody(400);
		focusFieldAt(900);

		layoutBody(600);

		expect(scrollTo).not.toHaveBeenCalled();
	});

	it("keeps a newly added row in view as the content grows under it", () => {
		renderDrawer();
		layoutBody(400);
		focusFieldAt(480);

		fireEvent(screen.getByTestId("drawer-content"), "layout", {
			nativeEvent: { layout: { x: 0, y: 0, width: 350, height: 540 } },
		});

		expect(scrollTo).toHaveBeenCalledWith({ y: 140, animated: true });
	});

	it("measures against where the body has been scrolled to", () => {
		renderDrawer();
		layoutBody(400);
		fireEvent.scroll(screen.getByTestId("drawer-body"), {
			nativeEvent: { contentOffset: { x: 0, y: 300 } },
		});
		focusFieldAt(500);

		fireEvent(screen.getByTestId("drawer-content"), "focus");

		expect(scrollTo).not.toHaveBeenCalled();
	});

	it("does nothing with no field focused", () => {
		renderDrawer();
		layoutBody(600);
		layoutBody(400);

		expect(scrollTo).not.toHaveBeenCalled();
	});

	it("leaves web's body exactly as it was", () => {
		const os = RN.Platform.OS;
		RN.Platform.OS = "web";
		try {
			renderDrawer();

			expect(screen.queryByTestId("drawer-content")).toBeNull();
			const body = screen.getByTestId("drawer-body");
			expect(body.props.onLayout).toBeUndefined();
			expect(body.props.onScroll).toBeUndefined();
			expect(screen.getByText("the body")).toBeTruthy();
		} finally {
			RN.Platform.OS = os;
		}
	});
});

/**
 * The sink (PLAN-3 task 9 review, Important 2).
 *
 * `Modal` tears its tree down the frame `visible` goes false, so a closing
 * animation started then plays to an empty screen. The drawer holds the Modal
 * open until the animation reports it finished; these are the two ways that
 * can go wrong — letting go too early, and never letting go at all.
 *
 * The Animated mock settles through `setTimeout(duration)`, so fake timers
 * are what move the close along.
 */
describe("BottomDrawer — closing", () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	function Harness({ visible }: { visible: boolean }) {
		return (
			<BottomDrawer visible={visible} onClose={jest.fn()} title="Settings">
				<Text>the body</Text>
			</BottomDrawer>
		);
	}

	it("stays mounted while the sheet sinks, then lets go", () => {
		const view = render(<Harness visible />);
		expect(screen.getByText("the body")).toBeTruthy();

		act(() => {
			view.rerender(<Harness visible={false} />);
		});

		// Mid-sink: still on screen, so there is something to watch sink.
		act(() => {
			jest.advanceTimersByTime(DUR.base - 20);
		});
		expect(screen.queryByText("the body")).toBeTruthy();

		act(() => {
			jest.advanceTimersByTime(40);
		});
		expect(screen.queryByText("the body")).toBeNull();
	});

	it("ends visible when a close is interrupted by a re-open", () => {
		const view = render(<Harness visible />);

		act(() => {
			view.rerender(<Harness visible={false} />);
		});
		act(() => {
			view.rerender(<Harness visible />);
		});

		// The interrupted close must not fire later and tear this down.
		act(() => {
			jest.advanceTimersByTime(DUR.reveal * 2);
		});
		expect(screen.getByText("the body")).toBeTruthy();
	});

	it("never mounts for a drawer that was never opened", () => {
		render(<Harness visible={false} />);

		act(() => {
			jest.advanceTimersByTime(DUR.reveal * 2);
		});
		expect(screen.queryByText("the body")).toBeNull();
	});
});

/**
 * What the sheet shows while it sinks (PLAN-3 task 9, review round 2).
 *
 * Holding the Modal open is only half of it: the drawer context empties
 * `title` and `content` in the same batch that flips `isVisible`, so without a
 * latch the sheet sinks as a blank stub — a title row with no title over an
 * empty body. The drawer keeps the last props it saw while open.
 */
describe("BottomDrawer — what sinks", () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	function EmptyingHarness({
		visible,
		onClose = jest.fn(),
	}: {
		visible: boolean;
		onClose?: () => void;
	}) {
		return (
			<BottomDrawer visible={visible} onClose={onClose} title={visible ? "Settings" : ""}>
				{visible ? <Text>the body</Text> : null}
			</BottomDrawer>
		);
	}

	it("keeps the title and the body on screen for the whole sink", () => {
		const view = render(<EmptyingHarness visible />);
		expect(screen.getByText("Settings")).toBeTruthy();

		// The caller empties itself on the same render that starts the close.
		act(() => {
			view.rerender(<EmptyingHarness visible={false} />);
		});

		expect(screen.getByText("Settings")).toBeTruthy();
		expect(screen.getByText("the body")).toBeTruthy();

		act(() => {
			jest.advanceTimersByTime(DUR.base - 20);
		});
		expect(screen.queryByText("Settings")).toBeTruthy();
		expect(screen.queryByText("the body")).toBeTruthy();

		act(() => {
			jest.advanceTimersByTime(40);
		});
		expect(screen.queryByText("Settings")).toBeNull();
		expect(screen.queryByText("the body")).toBeNull();
	});

	it("shows the new content, not the latched one, when it opens again", () => {
		// One drawer, three sheets through it — which is how the app uses it.
		function Slot({ visible, label }: { visible: boolean; label: string }) {
			return (
				<BottomDrawer visible={visible} onClose={jest.fn()} title={visible ? label : ""}>
					{visible ? <Text>{`${label} body`}</Text> : null}
				</BottomDrawer>
			);
		}

		const view = render(<Slot visible label="Settings" />);
		act(() => {
			view.rerender(<Slot visible={false} label="Settings" />);
		});
		act(() => {
			jest.advanceTimersByTime(DUR.base + 20);
		});

		act(() => {
			view.rerender(<Slot visible label="Delete this decision?" />);
		});

		expect(screen.getByText("Delete this decision?")).toBeTruthy();
		expect(screen.getByText("Delete this decision? body")).toBeTruthy();
		expect(screen.queryByText("Settings")).toBeNull();
		expect(screen.queryByText("Settings body")).toBeNull();
	});

	it("keeps a latched footer for the sink too", () => {
		function WithFooter({ visible }: { visible: boolean }) {
			return (
				<BottomDrawer
					visible={visible}
					onClose={jest.fn()}
					title={visible ? "Pick a deadline" : ""}
					footer={visible ? <Text>Use this date</Text> : null}
				>
					{visible ? <Text>the body</Text> : null}
				</BottomDrawer>
			);
		}

		const view = render(<WithFooter visible />);
		act(() => {
			view.rerender(<WithFooter visible={false} />);
		});

		expect(screen.getByTestId("drawer-footer")).toBeTruthy();
		expect(screen.getByText("Use this date")).toBeTruthy();
	});

	it("goes inert — scrim and sheet alike — while it sinks", () => {
		const view = render(<EmptyingHarness visible />);
		expect(screen.getByTestId("drawer-overlay").props.pointerEvents).toBe("auto");

		act(() => {
			view.rerender(<EmptyingHarness visible={false} />);
		});

		// The react-native mock does no hit testing, so the prop is the
		// assertable end of this. The guard sits on the overlay container, not
		// the scrim: the latched sheet body still holds live buttons (a
		// "Delete"), and a press in the closing window must reach neither them
		// nor the screen underneath.
		expect(screen.getByTestId("drawer-overlay").props.pointerEvents).toBe("none");
	});

	it("takes taps again once it is back open", () => {
		const view = render(<EmptyingHarness visible />);
		act(() => {
			view.rerender(<EmptyingHarness visible={false} />);
		});
		act(() => {
			view.rerender(<EmptyingHarness visible />);
		});

		expect(screen.getByTestId("drawer-overlay").props.pointerEvents).toBe("auto");
	});

	it("closes twice in a row — the second sink still ends", () => {
		const view = render(<EmptyingHarness visible />);

		act(() => {
			view.rerender(<EmptyingHarness visible={false} />);
		});
		act(() => {
			jest.advanceTimersByTime(DUR.base + 20);
		});
		expect(screen.queryByText("the body")).toBeNull();

		act(() => {
			view.rerender(<EmptyingHarness visible />);
		});
		act(() => {
			view.rerender(<EmptyingHarness visible={false} />);
		});
		act(() => {
			jest.advanceTimersByTime(DUR.base + 20);
		});

		expect(screen.queryByText("the body")).toBeNull();
	});
});
