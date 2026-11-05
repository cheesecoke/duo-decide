import { act, renderHook } from "@testing-library/react-native";
import { AppState, Platform } from "react-native";
import * as Updates from "expo-updates";

import { useOtaUpdates } from "@/hooks/useOtaUpdates";

// `expo-updates` and `AppState` are the mocks from test-utils/setup.ts. Each
// test sets the three gates (`__DEV__`, `Platform.OS`, `Updates.isEnabled`)
// it needs; afterEach puts them back.
const updates = Updates as unknown as {
	isEnabled: boolean;
	checkForUpdateAsync: jest.Mock;
	fetchUpdateAsync: jest.Mock;
};
const appState = AppState as unknown as { currentState: string; addEventListener: jest.Mock };
const platform = Platform as unknown as { OS: string };
const globals = globalThis as unknown as { __DEV__: boolean };

type Listener = (state: string) => void;

function installAppState() {
	const remove = jest.fn();
	let listener: Listener | undefined;
	appState.currentState = "active";
	appState.addEventListener.mockImplementation((_event: string, handler: Listener) => {
		listener = handler;
		return { remove };
	});
	return {
		remove,
		subscribed: () => listener !== undefined,
		// Flush the check → fetch promise chain after the state change.
		go: async (state: string) => {
			await act(async () => {
				listener?.(state);
				await Promise.resolve();
			});
		},
	};
}

const originalDev = globals.__DEV__;

function enableProduction() {
	globals.__DEV__ = false;
	platform.OS = "ios";
	updates.isEnabled = true;
}

afterEach(() => {
	globals.__DEV__ = originalDev;
	platform.OS = "ios";
	updates.isEnabled = false;
	updates.checkForUpdateAsync.mockImplementation(() => Promise.resolve({ isAvailable: false }));
	updates.fetchUpdateAsync.mockImplementation(() => Promise.resolve({ isNew: false }));
});

describe("useOtaUpdates", () => {
	it("checks and downloads an update when the app comes back to the foreground", async () => {
		enableProduction();
		updates.checkForUpdateAsync.mockResolvedValue({ isAvailable: true });
		const app = installAppState();

		renderHook(() => useOtaUpdates());
		await app.go("background");
		expect(updates.checkForUpdateAsync).not.toHaveBeenCalled();

		await app.go("active");
		expect(updates.checkForUpdateAsync).toHaveBeenCalledTimes(1);
		expect(updates.fetchUpdateAsync).toHaveBeenCalledTimes(1);
	});

	it("does not download when no update is available", async () => {
		enableProduction();
		const app = installAppState();

		renderHook(() => useOtaUpdates());
		await app.go("background");
		await app.go("active");

		expect(updates.checkForUpdateAsync).toHaveBeenCalledTimes(1);
		expect(updates.fetchUpdateAsync).not.toHaveBeenCalled();
	});

	it("swallows a failed check", async () => {
		enableProduction();
		updates.checkForUpdateAsync.mockRejectedValue(new Error("offline"));
		const app = installAppState();

		renderHook(() => useOtaUpdates());
		await app.go("background");
		await expect(app.go("active")).resolves.toBeUndefined();
		expect(updates.checkForUpdateAsync).toHaveBeenCalledTimes(1);
		expect(updates.fetchUpdateAsync).not.toHaveBeenCalled();
	});

	it("unsubscribes on unmount", () => {
		enableProduction();
		const app = installAppState();

		const { unmount } = renderHook(() => useOtaUpdates());
		unmount();

		expect(app.remove).toHaveBeenCalledTimes(1);
	});

	it.each([
		["in development", () => (globals.__DEV__ = true)],
		["on web", () => (platform.OS = "web")],
		["when expo-updates is disabled", () => (updates.isEnabled = false)],
	])("does nothing %s", (_label, gate) => {
		enableProduction();
		gate();
		const app = installAppState();

		renderHook(() => useOtaUpdates());

		expect(app.subscribed()).toBe(false);
		expect(appState.addEventListener).not.toHaveBeenCalled();
	});
});
