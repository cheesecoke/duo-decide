import * as React from "react";
import { render, screen, userEvent } from "@testing-library/react-native";
import { router } from "expo-router";

import { TestWrapper } from "@/test-utils/test-wrapper";

/**
 * Welcome (FEATURE-INVENTORY §1.1) — one state, two buttons, two routes.
 *
 * `ContentLayout` is still the emotion one, hence `TestWrapper`. Same shape
 * as __tests__/app/history.test.tsx; nativewind/babel is off under jest, so
 * nothing here asserts a class.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Welcome = require("@/app/welcome").default;

function renderScreen() {
	return render(<Welcome />, { wrapper: TestWrapper });
}

describe("the centre block", () => {
	it("shows the pair, the headline and the copy", () => {
		renderScreen();

		// tokens.md §9: Welcome is where both characters appear, large.
		expect(screen.getByLabelText("Fish, you")).toBeTruthy();
		expect(screen.getByLabelText("Goose, your partner")).toBeTruthy();

		expect(screen.getByText("Welcome to Duo Decide")).toBeTruthy();
		expect(
			screen.getByText(
				"Make decisions together with your partner through structured voting and polls that reduce anxiety and build connection.",
			),
		).toBeTruthy();
	});

	/** §1.1: one state — no spinner, no error, nothing to retry. */
	it("has nothing else on it", () => {
		renderScreen();

		expect(screen.queryByTestId("status-card-error")).toBeNull();
		expect(screen.queryByTestId("status-card-success")).toBeNull();
	});
});

describe("the buttons", () => {
	it("sends Sign Up to /sign-up", async () => {
		renderScreen();

		await userEvent.press(screen.getByLabelText("Sign Up"));

		expect(jest.mocked(router.push)).toHaveBeenCalledWith("/sign-up");
	});

	it("sends Sign In to /sign-in", async () => {
		renderScreen();

		await userEvent.press(screen.getByLabelText("Sign In"));

		expect(jest.mocked(router.push)).toHaveBeenCalledWith("/sign-in");
	});
});
