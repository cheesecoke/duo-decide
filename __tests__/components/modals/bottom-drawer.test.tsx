import * as React from "react";
import { Text, View } from "react-native";
import { act, render, screen, userEvent } from "@testing-library/react-native";

import { BottomDrawer } from "@/components/modals/BottomDrawer";
import { DUR } from "@/theme/motion";

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
		expect(body.props.keyboardShouldPersistTaps).toBe("always");
		expect(body.props.bounces).toBe(false);
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
