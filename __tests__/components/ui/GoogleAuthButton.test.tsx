import React from "react";
import { Platform } from "react-native";
import { render, fireEvent, waitFor } from "@testing-library/react-native";

import { GoogleAuthButton } from "@/components/ui/GoogleAuthButton";
import { AuthContext } from "@/context/supabase-provider";
import { TestWrapper } from "@/test-utils/test-wrapper";

const baseAuth = {
	initialized: true,
	session: null,
	isPasswordRecovery: false,
	signUp: jest.fn(),
	signIn: jest.fn(),
	signInWithGoogle: jest.fn(),
	signOut: jest.fn(),
	resetPassword: jest.fn(),
	updatePassword: jest.fn(),
};

function renderWithAuth(overrides: Partial<typeof baseAuth> = {}) {
	return render(
		<TestWrapper>
			<AuthContext.Provider value={{ ...baseAuth, ...overrides }}>
				<GoogleAuthButton mode="signin" />
			</AuthContext.Provider>
		</TestWrapper>,
	);
}

describe("GoogleAuthButton", () => {
	const originalOS = Platform.OS;

	afterEach(() => {
		(Platform as any).OS = originalOS;
		jest.clearAllMocks();
	});

	it("renders 'Continue with Google' on web", () => {
		(Platform as any).OS = "web";
		const { getByText } = renderWithAuth();
		expect(getByText("Continue with Google")).toBeTruthy();
	});

	it("renders nothing on native (Google SSO web-only for now)", () => {
		(Platform as any).OS = "ios";
		const { queryByText } = renderWithAuth();
		expect(queryByText("Continue with Google")).toBeNull();
	});

	it("calls signInWithGoogle when pressed", async () => {
		(Platform as any).OS = "web";
		const signInWithGoogle = jest.fn();
		const { getByText } = renderWithAuth({ signInWithGoogle });
		fireEvent.press(getByText("Continue with Google"));
		await waitFor(() => expect(signInWithGoogle).toHaveBeenCalledTimes(1));
	});

	it("surfaces a user-friendly error if signInWithGoogle throws", async () => {
		(Platform as any).OS = "web";
		const signInWithGoogle = jest.fn().mockRejectedValue(new Error("boom"));
		const { getByText, findByText } = renderWithAuth({ signInWithGoogle });
		fireEvent.press(getByText("Continue with Google"));
		expect(await findByText(/couldn['']t start google sign-in/i)).toBeTruthy();
	});
});
