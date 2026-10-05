import * as React from "react";
import { act, render, waitFor } from "@testing-library/react-native";
import { SplashScreen } from "expo-router";

import { supabase } from "@/config/supabase";
import { AuthProvider, useAuth } from "@/context/supabase-provider";

let auth: ReturnType<typeof useAuth>;
function Grab() {
	auth = useAuth();
	return null;
}

beforeEach(() => {
	Object.assign(supabase.auth, {
		onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
		signOut: jest.fn(() => Promise.resolve({ error: null })),
	});
	Object.assign(supabase, { rpc: jest.fn(() => Promise.resolve({ data: null, error: null })) });
});

async function renderProvider() {
	render(
		<AuthProvider>
			<Grab />
		</AuthProvider>,
	);
	await waitFor(() => expect(SplashScreen.hideAsync).toHaveBeenCalled());
}

describe("deleteAccount", () => {
	it("calls delete_my_account, then clears only the local session", async () => {
		await renderProvider();

		await act(() => auth.deleteAccount());

		expect(supabase.rpc).toHaveBeenCalledWith("delete_my_account");
		expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
		expect(auth.session).toBeNull();
	});

	it("throws, and keeps the session, when the delete fails", async () => {
		jest
			.mocked(supabase.rpc)
			.mockResolvedValueOnce({ data: null, error: new Error("nope") } as never);
		await renderProvider();

		await expect(auth.deleteAccount()).rejects.toThrow("nope");
		expect(supabase.auth.signOut).not.toHaveBeenCalled();
	});
});
