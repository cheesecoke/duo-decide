import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { FieldLabel, Input, Textarea } from "@/components/ui/reusables/field/field";

// NOTE: nativewind/babel is off under jest (see babel.config.js), so class
// names carry no style here. What is asserted below is the class *string* the
// component composes (the same thing chip.test.tsx does for `opacity-40`) plus
// the behaviour and accessibility props. The rendered look is Storybook's job.

describe("Input", () => {
	it("renders its placeholder and value", () => {
		render(<Input accessibilityLabel="Title" placeholder="Enter title" value="Tacos" />);

		const input = screen.getByLabelText("Title");
		expect(input.props.placeholder).toBe("Enter title");
		expect(input.props.value).toBe("Tacos");
	});

	it("reports every keystroke", () => {
		const onChangeText = jest.fn();
		render(<Input accessibilityLabel="Title" onChangeText={onChangeText} />);

		fireEvent.changeText(screen.getByLabelText("Title"), "Ramen");

		expect(onChangeText).toHaveBeenCalledWith("Ramen");
	});

	// The mock's `.inp:focus` is a 2 px ring. On RN that has to be a border, so
	// the resting border is transparent and only its colour changes — otherwise
	// the field would grow by 2 px the moment it took focus. `deep` rather than
	// `base`: on web this border is the only focus indicator a field has, and
	// no preset's `base` clears 3:1 against `surface-2`.
	it("takes the person-a focus ring while focused, and gives it back", () => {
		render(<Input accessibilityLabel="Title" />);
		const input = screen.getByLabelText("Title");

		expect(input.props.className).toContain("border-transparent");

		fireEvent(input, "focus");
		expect(screen.getByLabelText("Title").props.className).toContain("border-person-a-deep");

		fireEvent(input, "blur");
		expect(screen.getByLabelText("Title").props.className).toContain("border-transparent");
	});

	// The browser paints its own blue `:focus` outline over the ring above, and
	// that blue belongs to no Duo theme. `web:` keeps the suppression off
	// native, and keeping it on the field rather than in global.css keeps every
	// other focusable thing's keyboard ring intact.
	it("suppresses the browser's own focus outline, on web only", () => {
		render(<Input accessibilityLabel="Title" />);

		expect(screen.getByLabelText("Title").props.className).toContain("web:outline-none");
	});

	it("still calls a caller's own onFocus and onBlur", () => {
		const onFocus = jest.fn();
		const onBlur = jest.fn();
		render(<Input accessibilityLabel="Title" onFocus={onFocus} onBlur={onBlur} />);

		fireEvent(screen.getByLabelText("Title"), "focus");
		fireEvent(screen.getByLabelText("Title"), "blur");

		expect(onFocus).toHaveBeenCalledTimes(1);
		expect(onBlur).toHaveBeenCalledTimes(1);
	});

	it("fades and stops taking text when it is not editable", () => {
		render(<Input accessibilityLabel="Title" editable={false} />);

		const input = screen.getByLabelText("Title");
		expect(input.props.editable).toBe(false);
		expect(input.props.className).toContain("opacity-50");
	});

	it("takes a caller's className last, so a call site can override the size", () => {
		render(<Input accessibilityLabel="Title" className="px-1" />);

		expect(screen.getByLabelText("Title").props.className).toContain("px-1");
	});
});

describe("Textarea", () => {
	it("is multiline and top-aligned", () => {
		render(<Textarea accessibilityLabel="Description" />);

		const textarea = screen.getByLabelText("Description");
		expect(textarea.props.multiline).toBe(true);
		expect(textarea.props.textAlignVertical).toBe("top");
	});

	it("reports every keystroke", () => {
		const onChangeText = jest.fn();
		render(<Textarea accessibilityLabel="Description" onChangeText={onChangeText} />);

		fireEvent.changeText(screen.getByLabelText("Description"), "Somewhere new");

		expect(onChangeText).toHaveBeenCalledWith("Somewhere new");
	});

	it("lets a call site raise its minimum height", () => {
		render(<Textarea accessibilityLabel="Description" className="min-h-[96px]" />);

		expect(screen.getByLabelText("Description").props.className).toContain("min-h-[96px]");
	});
});

describe("FieldLabel", () => {
	it("renders its text", () => {
		render(<FieldLabel>Title</FieldLabel>);

		expect(screen.getByText("Title")).toBeTruthy();
	});

	// tokens.md §5 eyebrow (13/16, 500) in the mock's `.flabel` colour and case.
	it("is an uppercase ink-3 eyebrow", () => {
		render(<FieldLabel>Title</FieldLabel>);

		const label = screen.getByText("Title");
		expect(label.props.className).toContain("uppercase");
		expect(label.props.className).toContain("text-ink-3");
		expect(label.props.className).toContain("text-[13px]");
	});
});
