import * as React from "react";
import { Text } from "react-native";
import { act, render, screen } from "@testing-library/react-native";

import { LeaveOut } from "@/components/decision-queue/leave-out/leave-out";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { DUR } from "@/theme/motion";

jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: jest.fn(() => false) }));
const mockReducedMotion = useReducedMotion as jest.Mock;

/**
 * The queue card's exit. What matters is when `onLeft` fires — that is when
 * the screen makes the write — and that a leaving card is inert. The frames
 * themselves are the Reanimated mock's, landing on their target at once.
 */
describe("LeaveOut", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		mockReducedMotion.mockReturnValue(false);
	});
	afterEach(() => jest.useRealTimers());

	const card = (leaving: boolean, onLeft: () => void) => (
		<LeaveOut testID="leave" leaving={leaving} onLeft={onLeft}>
			<Text>Dinner</Text>
		</LeaveOut>
	);

	it("at rest: shown, pressable, and never calls onLeft", () => {
		const onLeft = jest.fn();
		render(card(false, onLeft));
		act(() => jest.advanceTimersByTime(DUR.base * 4));

		expect(screen.getByText("Dinner")).toBeTruthy();
		expect(screen.getByTestId("leave").props.pointerEvents).toBe("auto");
		expect(onLeft).not.toHaveBeenCalled();
	});

	it("leaving: inert and hidden at once, onLeft after one DUR.base, exactly once", () => {
		const onLeft = jest.fn();
		const { rerender } = render(card(false, onLeft));
		rerender(card(true, onLeft));

		expect(screen.queryByTestId("leave")).toBeNull();
		const node = screen.getByTestId("leave", { includeHiddenElements: true });
		expect(node.props.pointerEvents).toBe("none");

		act(() => jest.advanceTimersByTime(DUR.base - 1));
		expect(onLeft).not.toHaveBeenCalled();
		act(() => jest.advanceTimersByTime(1));
		expect(onLeft).toHaveBeenCalledTimes(1);

		// A parent re-render mid-exit (a fresh callback) does not restart it.
		rerender(card(true, jest.fn()));
		act(() => jest.advanceTimersByTime(DUR.base * 4));
		expect(onLeft).toHaveBeenCalledTimes(1);
	});

	it("reduce motion: onLeft at once, no wait", () => {
		mockReducedMotion.mockReturnValue(true);
		const onLeft = jest.fn();
		render(card(true, onLeft));

		expect(onLeft).toHaveBeenCalledTimes(1);
	});

	it("unmounted mid-exit (realtime got there first): onLeft never fires", () => {
		const onLeft = jest.fn();
		const { unmount } = render(card(true, onLeft));
		unmount();
		act(() => jest.advanceTimersByTime(DUR.base * 4));

		expect(onLeft).not.toHaveBeenCalled();
	});
});
