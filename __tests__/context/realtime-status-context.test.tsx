import React, { useEffect } from "react";
import { act, render } from "@testing-library/react-native";
import { AppState } from "react-native";

import { RealtimeStatusProvider, useRealtimeStatus } from "@/context/realtime-status-context";

/**
 * The catch-up after a dropped connection: a partner's change made while this
 * phone was not listening only shows up if the screens reload.
 */

type Api = ReturnType<typeof useRealtimeStatus>;

function setup() {
	const reload = jest.fn();
	let api!: Api;
	function Probe() {
		api = useRealtimeStatus();
		const { registerRefetch } = api;
		useEffect(() => registerRefetch(reload), [registerRefetch]);
		return null;
	}
	render(
		<RealtimeStatusProvider>
			<Probe />
		</RealtimeStatusProvider>,
	);
	return { reload, api: () => api };
}

/** The status sequence every listener in the app runs. */
async function channelStatus(api: Api, status: "SUBSCRIBED" | "CLOSED") {
	await act(async () => {
		if (status === "SUBSCRIBED") {
			api.setReconnecting(false);
			await api.runRefetches();
		} else {
			api.setReconnecting(true);
		}
	});
}

const appStateListener = () => {
	const calls = (AppState.addEventListener as jest.Mock).mock.calls;
	return calls[calls.length - 1][1] as (next: string) => void;
};

beforeEach(() => {
	(AppState.addEventListener as jest.Mock).mockClear();
});

describe("RealtimeStatusProvider", () => {
	it("does not reload on the first connect: the screen's first load is running", async () => {
		const { reload, api } = setup();
		await channelStatus(api(), "SUBSCRIBED");
		expect(reload).not.toHaveBeenCalled();
	});

	it("reloads once after a dropped connection comes back", async () => {
		const { reload, api } = setup();
		await channelStatus(api(), "SUBSCRIBED");
		await channelStatus(api(), "CLOSED");
		await channelStatus(api(), "SUBSCRIBED");
		expect(reload).toHaveBeenCalledTimes(1);

		// A second channel finishing its own reconnect does not reload again.
		await channelStatus(api(), "SUBSCRIBED");
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it("reloads when the app comes back from the background", async () => {
		const { reload } = setup();
		const onChange = appStateListener();

		await act(async () => onChange("background"));
		expect(reload).not.toHaveBeenCalled();
		await act(async () => onChange("active"));
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it("does not reload for a pull-down or the app switcher (inactive)", async () => {
		const { reload } = setup();
		const onChange = appStateListener();

		await act(async () => onChange("inactive"));
		await act(async () => onChange("active"));
		expect(reload).not.toHaveBeenCalled();
	});
});
