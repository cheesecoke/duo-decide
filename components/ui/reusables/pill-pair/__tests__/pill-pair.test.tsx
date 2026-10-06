import { render, screen, userEvent } from "@testing-library/react-native";
import * as React from "react";

import { PillPair } from "@/components/ui/reusables/pill-pair/pill-pair";

// See chip.test.tsx: `userEvent` (host-only traversal) rather than
// `fireEvent`, and no class-name assertions — nativewind/babel is off in jest.

describe("PillPair", () => {
	it("renders both labels", () => {
		render(<PillPair left={{ label: "Lock my vote" }} right={{ label: "Simulate Sam" }} />);

		expect(screen.getByText("Lock my vote")).toBeTruthy();
		expect(screen.getByText("Simulate Sam")).toBeTruthy();
	});

	it("fires each half's own handler", async () => {
		const onLeft = jest.fn();
		const onRight = jest.fn();
		render(
			<PillPair
				left={{ label: "Lock my vote", onPress: onLeft }}
				right={{ label: "Simulate Sam", onPress: onRight }}
			/>,
		);
		const user = userEvent.setup();

		await user.press(screen.getByLabelText("Lock my vote"));
		expect(onLeft).toHaveBeenCalledTimes(1);
		expect(onRight).not.toHaveBeenCalled();

		await user.press(screen.getByLabelText("Simulate Sam"));
		expect(onRight).toHaveBeenCalledTimes(1);
		expect(onLeft).toHaveBeenCalledTimes(1);
	});

	it("leaves a disabled half inert", async () => {
		const onRight = jest.fn();
		render(
			<PillPair
				left={{ label: "Lock my vote" }}
				right={{ label: "Simulate Sam", onPress: onRight, disabled: true }}
			/>,
		);

		await userEvent.setup().press(screen.getByLabelText("Simulate Sam"));

		expect(onRight).not.toHaveBeenCalled();
		expect(screen.getByLabelText("Simulate Sam").props.accessibilityState).toEqual({
			selected: false,
			disabled: true,
		});
	});

	it("marks only the selected side as selected", () => {
		render(
			<PillPair left={{ label: "Lock my vote" }} right={{ label: "Simulate Sam" }} selected="left" />,
		);

		expect(screen.getByLabelText("Lock my vote").props.accessibilityState).toEqual({
			selected: true,
			disabled: false,
		});
		expect(screen.getByLabelText("Simulate Sam").props.accessibilityState).toEqual({
			selected: false,
			disabled: false,
		});
	});

	it("selects neither side by default", () => {
		render(<PillPair left={{ label: "Lock my vote" }} right={{ label: "Simulate Sam" }} />);

		expect(screen.getByLabelText("Lock my vote").props.accessibilityState.selected).toBe(false);
		expect(screen.getByLabelText("Simulate Sam").props.accessibilityState.selected).toBe(false);
	});
});
