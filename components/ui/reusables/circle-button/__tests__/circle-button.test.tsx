import * as React from "react";
import { Text } from "react-native";
import { render, screen, userEvent } from "@testing-library/react-native";

import { CircleButton } from "@/components/ui/reusables/circle-button/circle-button";

// nativewind/babel is off under jest (babel.config.js) and the Reanimated mock
// lands every value on its target, so the pressed scale is Storybook's to show.
// What is asserted here is the contract: the label, the press, and disabled.

describe("CircleButton", () => {
	it("carries the accessible name the glyph cannot", () => {
		render(
			<CircleButton label="Settings" onPress={jest.fn()}>
				<Text>·</Text>
			</CircleButton>,
		);

		expect(screen.getByLabelText("Settings")).toBeTruthy();
	});

	it("reports a press", async () => {
		const onPress = jest.fn();
		render(
			<CircleButton label="Close" onPress={onPress}>
				<Text>·</Text>
			</CircleButton>,
		);

		await userEvent.press(screen.getByLabelText("Close"));

		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("does not press while disabled, and says so", async () => {
		const onPress = jest.fn();
		render(
			<CircleButton label="Close" disabled onPress={onPress}>
				<Text>·</Text>
			</CircleButton>,
		);

		const button = screen.getByLabelText("Close");
		expect(button.props.accessibilityState).toMatchObject({ disabled: true });

		await userEvent.press(button);
		expect(onPress).not.toHaveBeenCalled();
	});
});
