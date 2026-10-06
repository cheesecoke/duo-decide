import * as React from "react";
import { render, waitFor } from "@testing-library/react-native";
import { SplashScreen, usePathname, useRouter } from "expo-router";

import { supabase } from "@/config/supabase";
import { AuthProvider, PUBLIC_ROUTES } from "@/context/supabase-provider";

/**
 * The privacy policy and support page are linked from App Store Connect, so
 * a signed-out reviewer opening one must stay on it rather than be bounced
 * to Welcome by the auth router.
 */

const replace = jest.fn();

beforeEach(() => {
	jest.mocked(useRouter).mockReturnValue({
		push: jest.fn(),
		replace,
		back: jest.fn(),
		navigate: jest.fn(),
		canGoBack: jest.fn(() => true),
	} as unknown as ReturnType<typeof useRouter>);
	// The shared mock has no auth listener; the provider subscribes on mount.
	Object.assign(supabase.auth, {
		onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
	});
	jest.mocked(supabase.auth.getSession).mockResolvedValue({
		data: { session: null },
		error: null,
	} as never);
});

async function renderAt(pathname: string) {
	jest.mocked(usePathname).mockReturnValue(pathname);
	render(
		<AuthProvider>
			<></>
		</AuthProvider>,
	);
	await waitFor(() => expect(SplashScreen.hideAsync).toHaveBeenCalled());
}

describe("AuthProvider routing", () => {
	it("sends a signed-out visitor to Welcome", async () => {
		await renderAt("/");

		await waitFor(() => expect(replace).toHaveBeenCalledWith("/welcome"));
	});

	it.each(PUBLIC_ROUTES)("leaves a signed-out visitor on %s", async (route) => {
		await renderAt(route);

		expect(replace).not.toHaveBeenCalled();
	});
});
