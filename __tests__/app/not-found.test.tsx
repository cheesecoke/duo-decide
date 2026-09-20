import * as React from "react";
import { render, screen, userEvent } from "@testing-library/react-native";
import { router } from "expo-router";

import NotFound from "@/app/+not-found";
import { TestWrapper } from "@/test-utils/test-wrapper";

/**
 * 404 (FEATURE-INVENTORY §1.14).
 *
 * §1.14's note is that there was **no route home**. That is the whole of what
 * is worth guarding here, so it is what the test is about.
 */

beforeEach(() => {
	jest.clearAllMocks();
});

describe("the 404", () => {
	it("says what happened", () => {
		render(<NotFound />, { wrapper: TestWrapper });

		expect(screen.getByText("404")).toBeTruthy();
		expect(screen.getByText("This page could not be found.")).toBeTruthy();
	});

	it("offers the way home §1.14 did not have", async () => {
		render(<NotFound />, { wrapper: TestWrapper });

		await userEvent.press(screen.getByLabelText("Back to the queue"));

		expect(jest.mocked(router.replace)).toHaveBeenCalledWith("/(protected)/(tabs)");
	});
});
