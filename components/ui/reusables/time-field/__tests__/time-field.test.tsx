import { act, fireEvent, render, screen, userEvent } from "@testing-library/react-native";
import * as React from "react";

import {
	defaultMeridiem,
	parseTimeInput,
	splitTime,
	TIME_FIELD_ERROR,
	TimeField,
} from "@/components/ui/reusables/time-field/time-field";

// Behaviour and accessibility, not classes: nativewind/babel is off in jest.

describe("parseTimeInput", () => {
	it.each([
		// text, toggle, time, meridiem, explicit
		["7", null, "19:00", "pm", false],
		["730", null, "19:30", "pm", false],
		["7:30", null, "19:30", "pm", false],
		["7.30", null, "19:30", "pm", false],
		["07:30", null, "19:30", "pm", false],
		[" 7:30 ", null, "19:30", "pm", false],
		["12", null, "12:00", "pm", false],
		["1", null, "13:00", "pm", false],
		["8", null, "08:00", "am", false],
		["9:15", null, "09:15", "am", false],
		["11", null, "11:00", "am", false],
		["1130", null, "11:30", "am", false],
		["123", null, "13:23", "pm", false],
		// 24-hour entry says which half by itself
		["19:30", null, "19:30", "pm", true],
		["1930", null, "19:30", "pm", true],
		["13", null, "13:00", "pm", true],
		["0:15", null, "00:15", "am", true],
		["00:15", null, "00:15", "am", true],
		["23:59", null, "23:59", "pm", true],
		// a suffix wins over the default and the toggle
		["7pm", null, "19:00", "pm", true],
		["7am", null, "07:00", "am", true],
		["7 am", "pm", "07:00", "am", true],
		["7:30 PM", "am", "19:30", "pm", true],
		["9p", null, "21:00", "pm", true],
		["9 a.m.", null, "09:00", "am", true],
		["12am", null, "00:00", "am", true],
		["12pm", null, "12:00", "pm", true],
		// the toggle wins over the default
		["7", "am", "07:00", "am", false],
		["9", "pm", "21:00", "pm", false],
		["12", "am", "00:00", "am", false],
		// ...but not over a 24-hour hour
		["19:30", "am", "19:30", "pm", true],
	] as const)("%j with toggle %j → %s", (text, toggle, time, meridiem, explicit) => {
		expect(parseTimeInput(text, toggle)).toEqual({ time, meridiem, explicit });
	});

	it.each([
		[""],
		["   "],
		["7:"],
		["7:3"],
		["7:60"],
		["24"],
		["2500"],
		["19pm"],
		["0am"],
		["seven"],
		["7:30:00"],
		["7-30"],
		["12345"],
	])("%j is not a time", (text) => {
		expect(parseTimeInput(text)).toBeNull();
	});
});

describe("defaultMeridiem", () => {
	it.each([
		[12, "pm"],
		[1, "pm"],
		[7, "pm"],
		[8, "am"],
		[11, "am"],
	] as const)("%i → %s", (hour, expected) => {
		expect(defaultMeridiem(hour)).toBe(expected);
	});
});

describe("splitTime", () => {
	it.each([
		["19:30", { text: "7:30", meridiem: "pm" }],
		["07:05", { text: "7:05", meridiem: "am" }],
		["00:00", { text: "12:00", meridiem: "am" }],
		["12:00", { text: "12:00", meridiem: "pm" }],
		[null, null],
		["25:00", null],
		["soon", null],
	] as const)("%j", (value, expected) => {
		expect(splitTime(value)).toEqual(expected);
	});
});

describe("TimeField", () => {
	/** `useReducedMotion` (inside the toggle) resolves a promise into state on mount. */
	async function flush() {
		await act(async () => {});
	}

	function Harness({ initial = null, ...rest }: { initial?: string | null; showError?: boolean }) {
		const [value, setValue] = React.useState<string | null>(initial);
		return (
			<TimeField
				accessibilityLabel="Starts"
				value={value}
				onChange={(next) => {
					onChange(next);
					setValue(next);
				}}
				{...rest}
			/>
		);
	}
	const onChange = jest.fn();

	const meridiem = (label: "AM" | "PM") =>
		screen.getByLabelText(label).props.accessibilityState.checked;

	it("shows a value as a 12-hour time with the toggle set", async () => {
		render(<Harness initial="19:30" />);
		await flush();

		expect(screen.getByLabelText("Starts").props.value).toBe("7:30");
		expect(meridiem("PM")).toBe(true);
		expect(meridiem("AM")).toBe(false);
	});

	it("names the toggle after the field", async () => {
		render(<Harness />);
		await flush();

		expect(screen.getByLabelText("Starts, AM or PM").props.role).toBe("radiogroup");
	});

	it("reads a bare hour as the usual half of the day", async () => {
		render(<Harness />);
		await flush();

		fireEvent.changeText(screen.getByLabelText("Starts"), "7");
		expect(onChange).toHaveBeenLastCalledWith("19:00");
		expect(meridiem("PM")).toBe(true);

		fireEvent.changeText(screen.getByLabelText("Starts"), "9");
		expect(onChange).toHaveBeenLastCalledWith("09:00");
		expect(meridiem("AM")).toBe(true);
	});

	it("lets a 24-hour time set the toggle", async () => {
		render(<Harness />);
		await flush();

		fireEvent.changeText(screen.getByLabelText("Starts"), "19:30");

		expect(onChange).toHaveBeenLastCalledWith("19:30");
		expect(meridiem("PM")).toBe(true);
	});

	it("keeps the toggle once the person has set it", async () => {
		render(<Harness />);
		await flush();

		fireEvent.changeText(screen.getByLabelText("Starts"), "7");
		await userEvent.setup().press(screen.getByLabelText("AM"));
		expect(onChange).toHaveBeenLastCalledWith("07:00");

		// 9 would default to am anyway; 6 would default to pm, and must not.
		fireEvent.changeText(screen.getByLabelText("Starts"), "6");
		expect(onChange).toHaveBeenLastCalledWith("06:00");
		expect(meridiem("AM")).toBe(true);
	});

	it("gives the toggle the last word over a typed 24-hour time", async () => {
		render(<Harness />);
		await flush();

		fireEvent.changeText(screen.getByLabelText("Starts"), "19:30");
		await userEvent.setup().press(screen.getByLabelText("AM"));

		expect(onChange).toHaveBeenLastCalledWith("07:30");
		expect(screen.getByLabelText("Starts").props.value).toBe("7:30");
	});

	it("sends null while the text is not a time, without complaining yet", async () => {
		render(<Harness initial="19:30" />);
		await flush();

		fireEvent.changeText(screen.getByLabelText("Starts"), "7:");

		expect(onChange).toHaveBeenLastCalledWith(null);
		expect(screen.queryByText(TIME_FIELD_ERROR)).toBeNull();
	});

	it("complains once it is left holding something that is not a time", async () => {
		render(<Harness />);
		await flush();

		const input = screen.getByLabelText("Starts");
		fireEvent.changeText(input, "7:6");
		fireEvent(input, "blur");

		expect(screen.getByText(TIME_FIELD_ERROR).props.role).toBe("alert");
		expect(screen.getByLabelText("Starts").props["aria-invalid"]).toBe(true);

		// Coming back to fix it clears the complaint.
		fireEvent(screen.getByLabelText("Starts"), "focus");
		expect(screen.queryByText(TIME_FIELD_ERROR)).toBeNull();
	});

	it("does not complain about an empty field that was only visited", async () => {
		render(<Harness />);
		await flush();

		fireEvent(screen.getByLabelText("Starts"), "blur");

		expect(screen.queryByText(TIME_FIELD_ERROR)).toBeNull();
	});

	it("complains about an empty field when asked to", async () => {
		render(<Harness showError />);
		await flush();

		expect(screen.getByText(TIME_FIELD_ERROR)).toBeTruthy();
	});

	it("tidies what was typed when the field is left", async () => {
		render(<Harness />);
		await flush();

		const input = screen.getByLabelText("Starts");
		fireEvent.changeText(input, "1930");
		fireEvent(input, "blur");

		expect(screen.getByLabelText("Starts").props.value).toBe("7:30");
		expect(meridiem("PM")).toBe(true);
	});

	it("shows a value that arrives from outside", async () => {
		const { rerender } = render(
			<TimeField accessibilityLabel="Starts" value={null} onChange={jest.fn()} />,
		);
		await flush();

		rerender(<TimeField accessibilityLabel="Starts" value="08:15" onChange={jest.fn()} />);

		expect(screen.getByLabelText("Starts").props.value).toBe("8:15");
		expect(meridiem("AM")).toBe(true);
	});
});
