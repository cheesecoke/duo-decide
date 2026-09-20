import * as React from "react";
import { render, screen, userEvent } from "@testing-library/react-native";

import { ErrorStrip } from "@/components/layout/error-strip";
import { FooterPill } from "@/components/layout/footer-pill";
import { IntroCard } from "@/components/layout/intro-card";

/**
 * The screen chrome the queue used to own and three screens now share
 * (PLAN-3 task 10, commit 1c0f791). Two of these grew a defaulted prop in
 * the move — ErrorStrip's `testID`, FooterPill's `accessibilityLabel` — and
 * a default that only a caller's test covers is a default nobody owns.
 */

describe("ErrorStrip", () => {
	it("is an alert with the message, under the shared testID by default", () => {
		render(<ErrorStrip message="Something broke" />);

		const strip = screen.getByTestId("screen-error");
		expect(strip.props.role).toBe("alert");
		expect(screen.getByText("Something broke")).toBeTruthy();
	});

	it("takes a screen's own testID", () => {
		render(<ErrorStrip message="Something broke" testID="decision-queue-error" />);

		expect(screen.getByTestId("decision-queue-error")).toBeTruthy();
		expect(screen.queryByTestId("screen-error")).toBeNull();
	});
});

describe("FooterPill", () => {
	it("reads out its label by default, and presses", async () => {
		const onPress = jest.fn();
		render(<FooterPill label="Create List" onPress={onPress} />);

		await userEvent.press(screen.getByLabelText("Create List"));

		expect(onPress).toHaveBeenCalledTimes(1);
		expect(screen.getByText("Create List")).toBeTruthy();
	});

	it("lets the accessible name differ from the visible label", () => {
		render(
			<FooterPill label="Create List" accessibilityLabel="Create a new list" onPress={jest.fn()} />,
		);

		expect(screen.getByLabelText("Create a new list")).toBeTruthy();
		expect(screen.queryByLabelText("Create List")).toBeNull();
	});
});

describe("IntroCard", () => {
	const content = {
		title: "Lists of options — your first one.",
		description: "Reusable sets of choices.",
		options: [{ title: "First bullet" }, { title: "Second bullet" }],
	};

	it("renders the title, the description and every bullet", () => {
		render(<IntroCard content={content} onDismiss={jest.fn()} />);

		expect(screen.getByText(content.title)).toBeTruthy();
		expect(screen.getByText(content.description)).toBeTruthy();
		expect(screen.getByText("First bullet")).toBeTruthy();
		expect(screen.getByText("Second bullet")).toBeTruthy();
	});

	it("dismisses on Got it", async () => {
		const onDismiss = jest.fn();
		render(<IntroCard content={content} onDismiss={onDismiss} />);

		await userEvent.press(screen.getByLabelText("Got it"));

		expect(onDismiss).toHaveBeenCalledTimes(1);
	});
});
