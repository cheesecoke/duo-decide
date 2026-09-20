import * as React from "react";
import { render, screen, userEvent } from "@testing-library/react-native";

import { Chip } from "@/components/ui/reusables/chip/chip";

// NOTE: nativewind/babel is off under jest (see babel.config.js), so class
// names carry no style here. These tests cover behaviour and accessibility;
// the visual variants are covered by chip.stories.tsx in Storybook.
//
// `userEvent` rather than `fireEvent`: fireEvent walks up to *composite*
// parents looking for a handler, so it finds `<Chip onPress>` itself and fires
// even when the underlying Pressable refused the press. userEvent only walks
// host elements, so a disabled chip really does stay silent.

describe("Chip", () => {
	it("renders its label", () => {
		render(<Chip label="Tacos" />);
		expect(screen.getByText("Tacos")).toBeTruthy();
	});

	it("calls onPress when pressed", async () => {
		const onPress = jest.fn();
		render(<Chip label="Tacos" onPress={onPress} />);

		await userEvent.setup().press(screen.getByLabelText("Tacos"));

		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("does not call onPress when disabled", async () => {
		const onPress = jest.fn();
		render(<Chip label="Tacos" disabled onPress={onPress} />);

		await userEvent.setup().press(screen.getByLabelText("Tacos"));

		expect(onPress).not.toHaveBeenCalled();
	});

	it("exposes checkbox semantics reflecting the selected prop", () => {
		render(<Chip label="Tacos" selected />);

		const chip = screen.getByLabelText("Tacos");
		expect(chip.props.role).toBe("checkbox");
		expect(chip.props.accessibilityState).toEqual({ checked: true, disabled: false });
	});

	// The card's completed state disables every chip, and one of them is the
	// decision. `opacity-40` on that one would make the answer the faintest
	// thing on the card.
	it("keeps a selected chip at full opacity when it is disabled", () => {
		render(<Chip label="Tacos" selected disabled />);

		expect(screen.getByLabelText("Tacos").props.className).not.toContain("opacity-40");
	});

	it("fades an unselected chip when it is disabled", () => {
		render(<Chip label="Tacos" disabled />);

		expect(screen.getByLabelText("Tacos").props.className).toContain("opacity-40");
	});

	it("reports unchecked and disabled through accessibilityState", () => {
		render(<Chip label="Tacos" disabled />);

		expect(screen.getByLabelText("Tacos").props.accessibilityState).toEqual({
			checked: false,
			disabled: true,
		});
	});
});

/**
 * PLAN-3 final review M3. `disabled` is a control that cannot be used right
 * now; `readOnly` is the same pill used as a *label*, the way a history row
 * prints the option that won. A checkbox nobody can check is a thing a screen
 * reader offers and then refuses.
 */
describe("Chip — readOnly", () => {
	it("is not a control at all: no role, no state, no name of its own", () => {
		render(<Chip testID="chip" label="Tacos" selected readOnly />);

		const chip = screen.getByTestId("chip");
		expect(chip.props.role).toBeUndefined();
		expect(chip.props.accessibilityState).toBeUndefined();
		expect(chip.props.accessibilityLabel).toBeUndefined();
		expect(screen.queryByRole("checkbox")).toBeNull();
	});

	it("still says the word — the text is the label", () => {
		render(<Chip testID="chip" label="Tacos" selected readOnly />);

		expect(screen.getByText("Tacos")).toBeTruthy();
	});

	it("takes no press, even when one is handed in", async () => {
		const onPress = jest.fn();
		render(<Chip testID="chip" label="Tacos" readOnly onPress={onPress} />);

		expect(screen.getByTestId("chip").props.onPress).toBeUndefined();
		expect(onPress).not.toHaveBeenCalled();
	});

	// Nothing to dim: it is not a control that has been switched off.
	it("stays at full opacity and keeps the chip's own classes", () => {
		render(<Chip testID="chip" label="Tacos" readOnly />);

		const className: string = screen.getByTestId("chip").props.className;
		expect(className).not.toContain("opacity-40");
		expect(className).toContain("rounded-chip");
		expect(className).toContain("bg-surface-2");
	});
});
