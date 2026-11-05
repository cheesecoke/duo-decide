import * as React from "react";
import { Text } from "react-native";
import { render, screen, userEvent } from "@testing-library/react-native";

import {
	CIRCLE_BUTTON_HIT_SLOP,
	CircleButton,
} from "@/components/ui/reusables/circle-button/circle-button";
import { MIN_TOUCH_TARGET, touchReach } from "@/test-utils/touch-target";

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

describe("CircleButton touch target", () => {
	it("reaches the 44 pt minimum past its 34 px disc", () => {
		render(
			<CircleButton label="Close" onPress={jest.fn()}>
				<Text>×</Text>
			</CircleButton>,
		);

		const { hitSlop } = screen.getByLabelText("Close").props;
		expect(hitSlop).toBe(CIRCLE_BUTTON_HIT_SLOP);
		expect(touchReach(34, hitSlop)).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
	});

	it("takes a caller's hitSlop instead", () => {
		render(
			<CircleButton
				label="Close"
				hitSlop={{ top: 10, bottom: 10, left: 0, right: 0 }}
				onPress={jest.fn()}
			>
				<Text>×</Text>
			</CircleButton>,
		);

		expect(screen.getByLabelText("Close").props.hitSlop).toEqual({
			top: 10,
			bottom: 10,
			left: 0,
			right: 0,
		});
	});
});
