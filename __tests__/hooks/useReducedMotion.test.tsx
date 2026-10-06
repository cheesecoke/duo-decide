import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";

import { useReducedMotion } from "@/hooks/useReducedMotion";

// `AccessibilityInfo` is the mock from test-utils/setup.ts. `clearAllMocks`
// between tests wipes call records but not implementations, so each test
// re-installs the one it wants.
const isReduceMotionEnabled = AccessibilityInfo.isReduceMotionEnabled as jest.Mock;
const addEventListener = AccessibilityInfo.addEventListener as jest.Mock;

type ReduceMotionListener = (enabled: boolean) => void;

function installDefaults(enabled = false) {
	const remove = jest.fn();
	let listener: ReduceMotionListener | undefined;

	isReduceMotionEnabled.mockImplementation(() => Promise.resolve(enabled));
	addEventListener.mockImplementation((_event: string, handler: ReduceMotionListener) => {
		listener = handler;
		return { remove };
	});

	return {
		remove,
		emit: (value: boolean) => act(() => listener?.(value)),
	};
}

describe("useReducedMotion", () => {
	afterEach(() => {
		installDefaults(false);
	});

	it("starts false", () => {
		installDefaults(false);

		const { result } = renderHook(() => useReducedMotion());

		expect(result.current).toBe(false);
	});

	it("reports true once the OS setting resolves true", async () => {
		installDefaults(true);

		const { result } = renderHook(() => useReducedMotion());

		await waitFor(() => expect(result.current).toBe(true));
	});

	it("stays false when the OS setting resolves false", async () => {
		installDefaults(false);

		const { result } = renderHook(() => useReducedMotion());

		await waitFor(() => expect(isReduceMotionEnabled).toHaveBeenCalled());
		expect(result.current).toBe(false);
	});

	it("subscribes to reduceMotionChanged and follows it in both directions", async () => {
		const { emit } = installDefaults(false);

		const { result } = renderHook(() => useReducedMotion());
		await waitFor(() => expect(addEventListener).toHaveBeenCalled());

		expect(addEventListener.mock.calls[0][0]).toBe("reduceMotionChanged");

		emit(true);
		expect(result.current).toBe(true);

		emit(false);
		expect(result.current).toBe(false);
	});

	it("unsubscribes on unmount", async () => {
		const { remove } = installDefaults(false);

		const { unmount } = renderHook(() => useReducedMotion());
		await waitFor(() => expect(addEventListener).toHaveBeenCalled());
		expect(remove).not.toHaveBeenCalled();

		unmount();

		expect(remove).toHaveBeenCalledTimes(1);
	});

	it("keeps motion on when the platform has no AccessibilityInfo module", async () => {
		isReduceMotionEnabled.mockImplementation(() => Promise.reject(new Error("no native module")));
		addEventListener.mockImplementation(() => undefined);

		const { result, unmount } = renderHook(() => useReducedMotion());

		await waitFor(() => expect(isReduceMotionEnabled).toHaveBeenCalled());
		expect(result.current).toBe(false);
		expect(() => unmount()).not.toThrow();
	});
});
