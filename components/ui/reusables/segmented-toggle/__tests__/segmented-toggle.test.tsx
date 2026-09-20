import { render, screen, userEvent } from "@testing-library/react-native";
import * as React from "react";

import { SegmentedToggle } from "@/components/ui/reusables/segmented-toggle/segmented-toggle";

// See chip.test.tsx: `userEvent` (host-only traversal) rather than
// `fireEvent`, and no class-name assertions — nativewind/babel is off in jest.

const OPTIONS = [
	{ value: "vote", label: "Vote" },
	{ value: "poll", label: "Poll" },
];

describe("SegmentedToggle", () => {
	it("renders every option label", () => {
		render(<SegmentedToggle options={OPTIONS} value="vote" onChange={jest.fn()} />);

		expect(screen.getByText("Vote")).toBeTruthy();
		expect(screen.getByText("Poll")).toBeTruthy();
	});

	it("calls onChange with the pressed option's value", async () => {
		const onChange = jest.fn();
		render(<SegmentedToggle options={OPTIONS} value="vote" onChange={onChange} />);

		await userEvent.setup().press(screen.getByLabelText("Poll"));

		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenCalledWith("poll");
	});

	it("still reports a press on the already-active option", async () => {
		const onChange = jest.fn();
		render(<SegmentedToggle options={OPTIONS} value="vote" onChange={onChange} />);

		await userEvent.setup().press(screen.getByLabelText("Vote"));

		expect(onChange).toHaveBeenCalledWith("vote");
	});

	it("marks only the active option as selected", () => {
		render(<SegmentedToggle options={OPTIONS} value="poll" onChange={jest.fn()} />);

		expect(screen.getByLabelText("Poll").props.accessibilityState.selected).toBe(true);
		expect(screen.getByLabelText("Vote").props.accessibilityState.selected).toBe(false);
	});

	it("exposes radiogroup / radio roles", () => {
		render(
			<SegmentedToggle
				options={OPTIONS}
				value="vote"
				onChange={jest.fn()}
				accessibilityLabel="Decision mode"
			/>,
		);

		expect(screen.getByLabelText("Decision mode").props.role).toBe("radiogroup");
		expect(screen.getByLabelText("Vote").props.role).toBe("radio");
	});

	it("supports three options", async () => {
		const onChange = jest.fn();
		render(
			<SegmentedToggle
				options={[...OPTIONS, { value: "veto", label: "Veto" }]}
				value="vote"
				onChange={onChange}
			/>,
		);

		await userEvent.setup().press(screen.getByLabelText("Veto"));

		expect(onChange).toHaveBeenCalledWith("veto");
	});
});
