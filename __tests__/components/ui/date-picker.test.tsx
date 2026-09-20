import * as React from "react";
import { Pressable, Text } from "react-native";
import { render, screen, userEvent } from "@testing-library/react-native";

import { DatePickerComponent } from "@/components/ui/DatePicker";
import { ThemeProvider } from "@/context/theme-provider";

/**
 * The deadline picker's trigger (PLAN-3 task 9, §4).
 *
 * §1.10b keeps this component as it is — the calendar overlay is untouched.
 * The one addition is `renderTrigger`, so a caller on the v2 system can draw
 * the mock's `.datefield` instead of the Emotion field built into it. What is
 * asserted here is that contract and nothing else: the label it resolves, the
 * press it hands over, and that the default is unchanged when no trigger is
 * given.
 *
 * The component is Emotion, so it needs the old `ThemeProvider`.
 */

function renderPicker(props: Partial<React.ComponentProps<typeof DatePickerComponent>> = {}) {
	const onChange = jest.fn();
	render(
		<ThemeProvider>
			<DatePickerComponent
				value=""
				onChange={onChange}
				placeholder="Select decision deadline"
				{...props}
			/>
		</ThemeProvider>,
	);
	return onChange;
}

/** A caller's trigger, the shape CreateDecisionForm passes. */
function trigger({
	label,
	onPress,
	disabled,
}: {
	label: string;
	onPress: () => void;
	disabled?: boolean;
}) {
	return (
		<Pressable
			role="button"
			accessibilityLabel="Due date"
			accessibilityState={{ disabled: Boolean(disabled) }}
			disabled={disabled}
			onPress={onPress}
		>
			<Text>{label}</Text>
		</Pressable>
	);
}

describe("DatePickerComponent — renderTrigger", () => {
	it("hands the trigger the placeholder while there is no date", () => {
		renderPicker({ renderTrigger: trigger });

		expect(screen.getByLabelText("Due date")).toBeTruthy();
		expect(screen.getByText("Select decision deadline")).toBeTruthy();
	});

	it("hands the trigger the formatted date once there is one", () => {
		renderPicker({ value: "2026-09-25", renderTrigger: trigger });

		// Local parse, not UTC — the picker's own `parseLocalDateString`.
		expect(screen.getByText("Fri, Sep 25, 2026")).toBeTruthy();
	});

	it("opens the calendar when the trigger is pressed", async () => {
		renderPicker({ value: "2026-09-25", renderTrigger: trigger });

		expect(screen.queryByText("Cancel")).toBeNull();

		await userEvent.press(screen.getByLabelText("Due date"));

		// The calendar's own footer is the cheapest proof it is open.
		expect(screen.getByText("Cancel")).toBeTruthy();
	});

	it("passes `disabled` through, and a disabled trigger opens nothing", async () => {
		renderPicker({ disabled: true, renderTrigger: trigger });

		const button = screen.getByLabelText("Due date");
		expect(button.props.accessibilityState).toMatchObject({ disabled: true });

		await userEvent.press(button);
		expect(screen.queryByText("Cancel")).toBeNull();
	});

	it("draws its own field when no trigger is given", () => {
		renderPicker();

		expect(screen.queryByLabelText("Due date")).toBeNull();
		expect(screen.getByText("Select decision deadline")).toBeTruthy();
	});
});
