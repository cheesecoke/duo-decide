import * as React from "react";
import { act, render, screen, userEvent } from "@testing-library/react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/reusables/button/button";
import { Form, FormField, FormInput } from "@/components/ui/reusables/form/form";
import { Text } from "@/components/ui/reusables/text/text";

/**
 * The react-hook-form wrapper, on the v2 field primitives.
 *
 * nativewind/babel is off under jest (babel.config.js), so nothing here is a
 * rendered style. What is asserted is the wiring that makes a form usable —
 * the ids that tie a label, an input and a message together, the alert role
 * on the message, and the two paths through submit.
 *
 * `createNodeMock` is required for the label-press test: `FormInput` focuses
 * the real `TextInput` through a ref, and react-test-renderer gives host
 * components a null ref unless one is supplied.
 */

const schema = z.object({
	email: z.string().email("Please enter a valid email address."),
});

const focusHandle = { focus: jest.fn(), blur: jest.fn(), isFocused: jest.fn(() => false) };

function TestForm({
	onSubmit,
	description,
}: {
	onSubmit: (values: z.infer<typeof schema>) => void;
	description?: string;
}) {
	const form = useForm<z.infer<typeof schema>>({
		resolver: zodResolver(schema),
		defaultValues: { email: "" },
	});

	return (
		<Form {...form}>
			<FormField
				control={form.control}
				name="email"
				render={({ field }) => <FormInput label="Email" description={description} {...field} />}
			/>
			<Button accessibilityLabel="Submit" onPress={form.handleSubmit(onSubmit)}>
				<Text>Submit</Text>
			</Button>
		</Form>
	);
}

function renderForm(props: React.ComponentProps<typeof TestForm>) {
	return render(<TestForm {...props} />, {
		createNodeMock: (element) => (element.type === "TextInput" ? focusHandle : null),
	});
}

beforeEach(() => {
	jest.clearAllMocks();
	focusHandle.isFocused.mockReturnValue(false);
});

describe("the label", () => {
	it("names the field through aria-labelledby", () => {
		renderForm({ onSubmit: jest.fn() });

		const label = screen.getByText("Email");
		const input = screen.getByLabelText("Email");
		expect(input.props["aria-labelledby"]).toBe(label.props.nativeID);
	});

	it("focuses the field when pressed", async () => {
		renderForm({ onSubmit: jest.fn() });

		await userEvent.press(screen.getByText("Email"));

		expect(focusHandle.focus).toHaveBeenCalledTimes(1);
		expect(focusHandle.blur).not.toHaveBeenCalled();
	});

	it("blurs it instead when it already has focus", async () => {
		focusHandle.isFocused.mockReturnValue(true);
		renderForm({ onSubmit: jest.fn() });

		await userEvent.press(screen.getByText("Email"));

		expect(focusHandle.blur).toHaveBeenCalledTimes(1);
		expect(focusHandle.focus).not.toHaveBeenCalled();
	});
});

describe("a failed validation", () => {
	it("renders the message under the field, as an alert, and marks the input invalid", async () => {
		renderForm({ onSubmit: jest.fn() });

		const input = screen.getByLabelText("Email");
		expect(input.props["aria-invalid"]).toBe(false);
		expect(screen.queryByText("Please enter a valid email address.")).toBeNull();

		await userEvent.press(screen.getByLabelText("Submit"));

		const message = screen.getByText("Please enter a valid email address.");
		expect(message).toBeTruthy();

		const alert = screen.getByTestId("form-message");
		expect(alert.props.role).toBe("alert");

		const invalidInput = screen.getByLabelText("Email");
		expect(invalidInput.props["aria-invalid"]).toBe(true);
		// The visible half of the same fact (field.tsx's `invalid` variant).
		expect(invalidInput.props.className).toContain("border-destructive");
		// …and the message is one of the things describing the field now.
		expect(invalidInput.props["aria-describedby"]).toContain(alert.props.nativeID);
	});

	it("does not call the submit handler", async () => {
		const onSubmit = jest.fn();
		renderForm({ onSubmit });

		await userEvent.press(screen.getByLabelText("Submit"));

		expect(onSubmit).not.toHaveBeenCalled();
	});
});

describe("a valid submit", () => {
	it("calls the handler with the values", async () => {
		const onSubmit = jest.fn();
		renderForm({ onSubmit });

		await userEvent.type(screen.getByLabelText("Email"), "chase@example.com");
		await userEvent.press(screen.getByLabelText("Submit"));

		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onSubmit.mock.calls[0][0]).toEqual({ email: "chase@example.com" });
		expect(screen.queryByTestId("form-message")).toBeNull();
	});
});

describe("the message's motion", () => {
	/**
	 * tokens.md §8: every state change moves. The shared value outlives the
	 * message (`FormMessage` is always rendered and returns null when there is
	 * nothing to say), so without a reset it reads 1 on the render a *second*
	 * failure appears on — the message would simply be there, fully formed.
	 *
	 * The Reanimated mock lands every value on its target, so what is asserted
	 * is the style at the frame the message appears: opacity 0 and the 4 px
	 * offset it animates in from, both times.
	 */
	it("starts from the beginning each time the message comes back", async () => {
		renderForm({ onSubmit: jest.fn() });

		await userEvent.press(screen.getByLabelText("Submit"));
		expect(screen.getByTestId("form-message").props.style).toEqual({
			opacity: 0,
			transform: [{ translateY: -4 }],
		});

		// A valid value clears it…
		await userEvent.type(screen.getByLabelText("Email"), "chase@example.com");
		await act(async () => {});
		expect(screen.queryByTestId("form-message")).toBeNull();

		// …and emptying the field brings it back, from the start again.
		await userEvent.clear(screen.getByLabelText("Email"));
		await act(async () => {});
		expect(screen.getByTestId("form-message").props.style).toEqual({
			opacity: 0,
			transform: [{ translateY: -4 }],
		});
	});
});

describe("a description", () => {
	it("describes the field, and stays out of the way of the message", () => {
		renderForm({ onSubmit: jest.fn(), description: "We only use this to sign you in." });

		const hint = screen.getByText("We only use this to sign you in.");
		const input = screen.getByLabelText("Email");
		expect(input.props["aria-describedby"]).toBe(hint.props.nativeID);
		expect(screen.queryByTestId("form-message")).toBeNull();
	});
});
