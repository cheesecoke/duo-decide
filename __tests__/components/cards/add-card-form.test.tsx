import * as React from "react";
import { fireEvent, render, screen, userEvent } from "@testing-library/react-native";

import { AddCardForm, EMPTY_CARD, type AddCardFormValue } from "@/components/cards/add-card-form";

/** The "Add a card" sheet body: controlled, so every edit is an `onChange`. */

function renderForm(
	value: Partial<AddCardFormValue> = {},
	over: Partial<React.ComponentProps<typeof AddCardForm>> = {},
) {
	const props = {
		value: { ...EMPTY_CARD, ...value },
		onChange: jest.fn(),
		onSubmit: jest.fn(),
		onCancel: jest.fn(),
		partnerLabel: "Sam" as string | null,
		...over,
	};
	render(<AddCardForm {...props} />);
	return props;
}

const disabled = (label: string) => screen.getByLabelText(label).props.accessibilityState.disabled;

describe("the title", () => {
	it("keeps 'Add card' inert until there is one, and spaces are not one", () => {
		renderForm();
		expect(disabled("Add card")).toBe(true);

		screen.unmount();
		renderForm({ title: "   " });
		expect(disabled("Add card")).toBe(true);
	});

	it("hands up what is typed", () => {
		const props = renderForm();

		fireEvent.changeText(screen.getByLabelText("Card"), "Taxes");

		expect(props.onChange).toHaveBeenCalledWith({ ...EMPTY_CARD, title: "Taxes" });
	});

	it("submits once there is one", async () => {
		const props = renderForm({ title: "Taxes" });
		const user = userEvent.setup();

		await user.press(screen.getByLabelText("Add card"));

		expect(props.onSubmit).toHaveBeenCalledTimes(1);
	});
});

describe("the choices", () => {
	it("opens on Home, not daily, not dealt", () => {
		renderForm();

		expect(screen.getByLabelText("Home").props.accessibilityState.checked).toBe(true);
		expect(screen.getByLabelText("Every day").props.accessibilityState.checked).toBe(false);
		expect(screen.getByLabelText("You").props.accessibilityState.checked).toBe(false);
		expect(screen.getByLabelText("Sam").props.accessibilityState.checked).toBe(false);
	});

	it("picks a kind, toggles daily and deals", async () => {
		const props = renderForm();
		const user = userEvent.setup();

		await user.press(screen.getByLabelText("Care"));
		await user.press(screen.getByLabelText("Every day"));
		await user.press(screen.getByLabelText("Sam"));

		expect(props.onChange).toHaveBeenNthCalledWith(1, { ...EMPTY_CARD, category: "care" });
		expect(props.onChange).toHaveBeenNthCalledWith(2, { ...EMPTY_CARD, daily: true });
		expect(props.onChange).toHaveBeenNthCalledWith(3, { ...EMPTY_CARD, holder: "b" });
	});

	it("un-deals when the chosen holder is tapped again", async () => {
		const props = renderForm({ holder: "a" });
		const user = userEvent.setup();

		await user.press(screen.getByLabelText("You"));

		expect(props.onChange).toHaveBeenCalledWith({ ...EMPTY_CARD, holder: "none" });
	});

	it("has no partner chip while no partner is linked", () => {
		renderForm({}, { partnerLabel: null });

		expect(screen.queryByLabelText("Sam")).toBeNull();
	});
});

describe("the footer", () => {
	it("says so while the write is in flight, and cannot be pressed twice", () => {
		renderForm({ title: "Taxes" }, { submitting: true });

		expect(disabled("Adding…")).toBe(true);
	});

	it("cancels", async () => {
		const props = renderForm({ title: "Taxes" });
		const user = userEvent.setup();

		await user.press(screen.getByLabelText("Cancel"));

		expect(props.onCancel).toHaveBeenCalledTimes(1);
		expect(props.onSubmit).not.toHaveBeenCalled();
	});
});
