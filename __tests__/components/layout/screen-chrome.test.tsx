import * as React from "react";
import { render, screen, userEvent } from "@testing-library/react-native";

import { CollapseAllButton } from "@/components/layout/collapse-all-button";
import { ErrorStrip } from "@/components/layout/error-strip";
import { FooterPill } from "@/components/layout/footer-pill";
import { IntroCard } from "@/components/layout/intro-card";
import { CONTROL_MAX_FONT_SCALE } from "@/components/ui/reusables/text/text";
import { MIN_TOUCH_TARGET, touchReach } from "@/test-utils/touch-target";

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

/**
 * PLAN-3 final review M5: the queue and the Options tab had the same nine
 * lines each. The rule worth owning in one place is the label — it says what
 * the press will do, not what the screen is, which is the classic way to make
 * a screen reader announce the opposite of what happens.
 */
describe("CollapseAllButton", () => {
	it("names the action, not the state", () => {
		const { rerender } = render(<CollapseAllButton allCollapsed={false} onPress={jest.fn()} />);
		// Everything is open, so the press collapses.
		expect(screen.getByLabelText("Collapse all")).toBeTruthy();
		expect(screen.queryByLabelText("Expand all")).toBeNull();

		rerender(<CollapseAllButton allCollapsed onPress={jest.fn()} />);
		expect(screen.getByLabelText("Expand all")).toBeTruthy();
		expect(screen.queryByLabelText("Collapse all")).toBeNull();
	});

	it("reports the press", async () => {
		const onPress = jest.fn();
		render(<CollapseAllButton allCollapsed={false} onPress={onPress} />);

		await userEvent.press(screen.getByLabelText("Collapse all"));

		expect(onPress).toHaveBeenCalledTimes(1);
	});

	// `h-9` is 36 px on web but 31.5 pt on native, where NativeWind's rem is 14.
	it("reaches 44 pt past its circle on native's smaller rem", () => {
		render(<CollapseAllButton allCollapsed={false} onPress={jest.fn()} />);

		const { hitSlop } = screen.getByLabelText("Collapse all").props;
		expect(touchReach(9 * 3.5, hitSlop)).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
	});
});

describe("FooterPill under Larger Text", () => {
	// The pill is a fixed `h-14`; an uncapped label clipped at the largest
	// iOS text sizes.
	it("caps its label's Dynamic Type scale", () => {
		render(<FooterPill label="Create Decision" onPress={jest.fn()} />);

		expect(screen.getByText("Create Decision").props.maxFontSizeMultiplier).toBe(
			CONTROL_MAX_FONT_SCALE,
		);
	});
});
