import * as React from "react";
import { render, screen, userEvent } from "@testing-library/react-native";

import { CreateListForm, type CreateListFormValue } from "@/components/options/create-list-form";

/**
 * The Create New List sheet body (FEATURE-INVENTORY §1.11).
 *
 * Controlled, so every assertion is "what reached `onChange`" rather than
 * "what the field now shows" — the screen is what re-renders it.
 *
 * `userEvent` rather than `fireEvent` for the presses: a disabled Pressable
 * ignores a real press, which is the whole point of the first test.
 */

const EMPTY: CreateListFormValue = { title: "", description: "", options: [] };

function renderForm(over: Partial<React.ComponentProps<typeof CreateListForm>> = {}) {
	const props = {
		value: EMPTY,
		onChange: jest.fn(),
		onSubmit: jest.fn(),
		onCancel: jest.fn(),
		...over,
	};

	render(<CreateListForm {...props} />);
	return props;
}

describe("the fields", () => {
	it("renders the three of them in order", () => {
		renderForm();

		expect(screen.getByPlaceholderText("Enter list title")).toBeTruthy();
		expect(screen.getByPlaceholderText("Enter list description")).toBeTruthy();
		expect(screen.getByText("Options")).toBeTruthy();
		expect(screen.getByText("No options added yet. Tap the edit button to add some!")).toBeTruthy();
	});

	it("reports the title upward", async () => {
		const props = renderForm();

		await userEvent.type(screen.getByLabelText("Title"), "D");

		expect(props.onChange).toHaveBeenCalledWith({ ...EMPTY, title: "D" });
	});

	it("reports the description upward", async () => {
		const props = renderForm();

		await userEvent.type(screen.getByLabelText("Description"), "x");

		expect(props.onChange).toHaveBeenCalledWith({ ...EMPTY, description: "x" });
	});

	/**
	 * §1.11: "In-progress option rows are saved even if the user never taps
	 * the check." Typing in a row has to reach `onChange` on its own.
	 */
	it("reports a typed option row without waiting for the check", async () => {
		const props = renderForm({ value: { ...EMPTY, title: "Dinner spots" } });

		await userEvent.press(screen.getByLabelText("Edit options"));
		await userEvent.type(screen.getByLabelText("Option 1"), "T");

		expect(props.onChange).toHaveBeenCalledWith({
			title: "Dinner spots",
			description: "",
			options: [{ id: expect.stringMatching(/^temp-/), title: "T" }],
		});
	});
});

describe("Create List", () => {
	it("is disabled, and does nothing, while the title is blank", async () => {
		const props = renderForm();

		const create = screen.getByLabelText("Create List");
		expect(create.props.accessibilityState).toMatchObject({ disabled: true });

		await userEvent.press(create);

		expect(props.onSubmit).not.toHaveBeenCalled();
	});

	it("stays disabled for a title of spaces", () => {
		renderForm({ value: { ...EMPTY, title: "   " } });

		expect(screen.getByLabelText("Create List").props.accessibilityState).toMatchObject({
			disabled: true,
		});
	});

	it("submits once the title has something in it", async () => {
		const props = renderForm({ value: { ...EMPTY, title: "Dinner spots" } });

		await userEvent.press(screen.getByLabelText("Create List"));

		expect(props.onSubmit).toHaveBeenCalledTimes(1);
	});

	it("says what it is doing, and refuses a second press, while the write is in flight", async () => {
		const props = renderForm({ value: { ...EMPTY, title: "Dinner spots" }, submitting: true });

		const create = screen.getByLabelText("Creating…");
		expect(screen.getByText("Creating…")).toBeTruthy();
		expect(create.props.accessibilityState).toMatchObject({ disabled: true });

		await userEvent.press(create);

		expect(props.onSubmit).not.toHaveBeenCalled();
	});
});

describe("Cancel", () => {
	it("calls back, whatever state the form is in", async () => {
		const props = renderForm();

		await userEvent.press(screen.getByLabelText("Cancel"));

		expect(props.onCancel).toHaveBeenCalledTimes(1);
		expect(props.onSubmit).not.toHaveBeenCalled();
	});
});
