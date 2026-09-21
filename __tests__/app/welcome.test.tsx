import * as React from "react";
import { render, screen, userEvent } from "@testing-library/react-native";
import { router } from "expo-router";

import { TestWrapper } from "@/test-utils/test-wrapper";

/**
 * Welcome (FEATURE-INVENTORY §1.1) — one state, two buttons, two routes.
 *
 * `TestWrapper` mounts the person pair the screen's colours come from — the
 * brand heart is drawn in person A's `base`, so without it the screen cannot
 * render. Same shape as __tests__/app/history.test.tsx; nativewind/babel is
 * off under jest, so nothing here asserts a class.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Welcome = require("@/app/welcome").default;

function renderScreen() {
	return render(<Welcome />, { wrapper: TestWrapper });
}

describe("the centre block", () => {
	it("shows the brand mark, the headline and the copy", () => {
		renderScreen();

		// The heart is the app's main icon (Chase, 2026-09-21) — the same mark
		// the header wears, at 64. It is decorative, so it is found by testID.
		expect(screen.getByTestId("brand-heart")).toBeTruthy();

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

	/**
	 * The characters are the queue's and the vote rows' vocabulary, not the
	 * brand's. Welcome carried the pair through the v2 redesign and no longer
	 * does — asserted, because "the heart is back" is only half the change.
	 */
	it("does not show the characters", () => {
		renderScreen();

		expect(screen.queryByLabelText("Fish, you")).toBeNull();
		expect(screen.queryByLabelText("Goose, your partner")).toBeNull();
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
