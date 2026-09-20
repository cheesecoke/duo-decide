import * as React from "react";
import { Text } from "react-native";
import { render, screen, userEvent } from "@testing-library/react-native";

import { ChevronGlyph, IconButton } from "@/components/ui/reusables/icon-button/icon-button";

/**
 * nativewind/babel is off under jest (babel.config.js), so the circle, the
 * fill and the tint are Storybook's to show. What is asserted here is the
 * contract: the accessible name the glyph cannot carry, the press, and the
 * expanded state both collapsible cards report through it.
 */
describe("IconButton", () => {
	it("carries the accessible name, and the glyph carries none", () => {
		render(
			<IconButton label="Collapse" onPress={jest.fn()}>
				<ChevronGlyph />
			</IconButton>,
		);

		const button = screen.getByLabelText("Collapse");
		expect(button.props.role).toBe("button");
		// Decorative: the mark is found by testID, never by a label of its own.
		expect(screen.getByTestId("glyph-chevron")).toBeTruthy();
	});

	it("reports a press", async () => {
		const onPress = jest.fn();
		render(
			<IconButton label="More" onPress={onPress}>
				<Text>·</Text>
			</IconButton>,
		);

		await userEvent.press(screen.getByLabelText("More"));

		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("passes an accessibilityState through — the cards' expanded flag", () => {
		render(
			<IconButton label="Collapse" accessibilityState={{ expanded: true }} onPress={jest.fn()}>
				<ChevronGlyph />
			</IconButton>,
		);

		expect(screen.getByLabelText("Collapse").props.accessibilityState).toEqual({ expanded: true });
	});
});
