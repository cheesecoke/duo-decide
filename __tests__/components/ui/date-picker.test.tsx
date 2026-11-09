import * as React from "react";
import { Pressable, Text } from "react-native";
import { render, screen, userEvent } from "@testing-library/react-native";

import { DatePickerComponent, dateToLocalDateString } from "@/components/ui/DatePicker";
import { MIN_TOUCH_TARGET, touchReach } from "@/test-utils/touch-target";

/**
 * The deadline picker's trigger (PLAN-3 task 9, §4).
 *
 * §1.10b keeps this component as it is — the calendar overlay is untouched.
 * The one addition is `renderTrigger`, so a caller on the v2 system can draw
 * the mock's `.datefield` instead of the v1 field built into it. What is
 * asserted here is that contract and nothing else: the label it resolves, the
 * press it hands over, and that the default is unchanged when no trigger is
 * given.
 */

function renderPicker(props: Partial<React.ComponentProps<typeof DatePickerComponent>> = {}) {
	const onChange = jest.fn();
	render(
		<DatePickerComponent
			value=""
			onChange={onChange}
			placeholder="Select decision deadline"
			{...props}
		/>,
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

describe("DatePickerComponent — the calendar's targets", () => {
	const now = new Date();
	const day = (d: number) => new Date(now.getFullYear(), now.getMonth(), d);
	const label = (date: Date) =>
		date.toLocaleDateString("en-US", {
			weekday: "long",
			month: "long",
			day: "numeric",
			year: "numeric",
		});

	async function openCalendar(props: Partial<React.ComponentProps<typeof DatePickerComponent>>) {
		const onChange = renderPicker({
			value: dateToLocalDateString(day(15)),
			renderTrigger: trigger,
			minDate: day(10),
			maxDate: day(20),
			...props,
		});
		await userEvent.press(screen.getByLabelText("Due date"));
		return onChange;
	}

	it("names every day for a screen reader and marks the selected one", async () => {
		await openCalendar({});

		const selected = screen.getByLabelText(label(day(15)));
		expect(selected.props.role).toBe("button");
		expect(selected.props.accessibilityState).toMatchObject({ selected: true, disabled: false });
		expect(screen.getByLabelText(label(day(16))).props.accessibilityState).toMatchObject({
			selected: false,
		});
	});

	it("picks the pressed day", async () => {
		const onChange = await openCalendar({});

		await userEvent.press(screen.getByLabelText(label(day(16))));

		expect(onChange).toHaveBeenCalledWith(dateToLocalDateString(day(16)));
	});

	it("reports a day outside min/max as disabled, and ignores a press on it", async () => {
		const onChange = await openCalendar({});

		const outside = screen.getByLabelText(label(day(25)));
		expect(outside.props.accessibilityState).toMatchObject({ disabled: true });

		await userEvent.press(outside);
		expect(onChange).not.toHaveBeenCalled();
	});

	it("gives the month arrows a 44 pt reach", async () => {
		await openCalendar({});

		// Each arrow draws ~36 × 23 pt (p-2 around a 16/22 glyph).
		for (const name of ["Previous month", "Next month"]) {
			const { hitSlop } = screen.getByLabelText(name).props;
			expect(touchReach(23, hitSlop)).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
		}
	});
});
