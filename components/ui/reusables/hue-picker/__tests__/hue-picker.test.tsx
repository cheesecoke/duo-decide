import * as React from "react";
import { render, screen, userEvent } from "@testing-library/react-native";

import { HuePicker, SUGGESTED_PAIRS } from "@/components/ui/reusables/hue-picker/hue-picker";
import type { HuePair } from "@/theme/pair-choice";
import { HUE_PRESETS } from "@/theme/presets";

// nativewind/babel is off under jest (see babel.config.js), so the ring is not
// style-assertable here; it is covered by hue-picker.stories.tsx. These tests
// are the behaviour: what is checked, what a press sends back, and the labels.
//
// `userEvent` rather than `fireEvent`, for the reason chip.test.tsx gives.

const PRESET_IDS = HUE_PRESETS.map((preset) => preset.id);

function renderPicker(props: Partial<React.ComponentProps<typeof HuePicker>> = {}) {
	const onChange = jest.fn();
	render(
		<HuePicker
			value={{ a: "sage", b: "blush" }}
			onChange={onChange}
			youName="Chase"
			partnerName="Sam"
			{...props}
		/>,
	);
	return onChange;
}

describe("the two rows", () => {
	it("names the viewer's row 'You' and the other row after the partner", () => {
		renderPicker();

		expect(screen.getByText("You")).toBeTruthy();
		expect(screen.getByText("Sam")).toBeTruthy();
	});

	it("falls back to 'Partner' before anyone is linked", () => {
		renderPicker({ partnerName: null });

		expect(screen.getByText("Partner")).toBeTruthy();
	});

	it("puts each person's own character beside their row", () => {
		renderPicker();

		expect(screen.getByLabelText("Fish, Chase")).toBeTruthy();
		expect(screen.getByLabelText("Goose, Sam")).toBeTruthy();
	});

	it("offers five hues in each row, and only five", () => {
		renderPicker();

		for (const id of PRESET_IDS) {
			expect(screen.getByTestId(`hue-a-${id}`)).toBeTruthy();
			expect(screen.getByTestId(`hue-b-${id}`)).toBeTruthy();
		}
		// `getAllByRole("radio")` does not resolve under this jest setup (the
		// RN mock returns host elements the role matcher will not read), so
		// the count comes off the swatches' own testIDs.
		expect(screen.getAllByTestId(/^hue-[ab]-[a-z]+$/)).toHaveLength(PRESET_IDS.length * 2);
	});

	it("marks every swatch as a radio, labelled by its preset", () => {
		renderPicker();

		for (const id of PRESET_IDS) {
			const swatch = screen.getByTestId(`hue-a-${id}`);
			expect(swatch.props.role).toBe("radio");
		}
		expect(screen.getAllByLabelText("Sage")).toHaveLength(2);
		expect(screen.getAllByLabelText("Blush")).toHaveLength(2);
		expect(screen.getAllByLabelText("Butter")).toHaveLength(2);
		expect(screen.getAllByLabelText("Lavender")).toHaveLength(2);
		expect(screen.getAllByLabelText("Sky")).toHaveLength(2);
	});

	it("groups each row's five, so the two Sages are not one set of radios", () => {
		renderPicker();

		expect(screen.getByLabelText("You's colour")).toBeTruthy();
		expect(screen.getByLabelText("Sam's colour")).toBeTruthy();
	});
});

describe("checked follows value", () => {
	it("checks exactly one swatch per row", () => {
		renderPicker({ value: { a: "sky", b: "butter" } });

		const checkedA = PRESET_IDS.filter(
			(id) => screen.getByTestId(`hue-a-${id}`).props.accessibilityState.checked,
		);
		const checkedB = PRESET_IDS.filter(
			(id) => screen.getByTestId(`hue-b-${id}`).props.accessibilityState.checked,
		);

		expect(checkedA).toEqual(["sky"]);
		expect(checkedB).toEqual(["butter"]);
	});

	it("does not let one row's pick check the other row's swatch", () => {
		renderPicker({ value: { a: "sky", b: "butter" } });

		expect(screen.getByTestId("hue-b-sky").props.accessibilityState.checked).toBe(false);
		expect(screen.getByTestId("hue-a-butter").props.accessibilityState.checked).toBe(false);
	});
});

describe("what a press sends back", () => {
	it("sets a free hue in the row it was pressed in", async () => {
		const onChange = renderPicker();

		await userEvent.setup().press(screen.getByTestId("hue-a-sky"));

		expect(onChange).toHaveBeenCalledWith({ a: "sky", b: "blush" });
	});

	it("sets a free hue in the partner's row", async () => {
		const onChange = renderPicker();

		await userEvent.setup().press(screen.getByTestId("hue-b-lavender"));

		expect(onChange).toHaveBeenCalledWith({ a: "sage", b: "lavender" });
	});

	// The rule the rows cannot show you: the seats may never match, so the
	// other seat's hue is a swap rather than a refusal. Nothing is disabled.
	it("swaps when you take the hue your partner is wearing", async () => {
		const onChange = renderPicker();

		await userEvent.setup().press(screen.getByTestId("hue-a-blush"));

		expect(onChange).toHaveBeenCalledWith({ a: "blush", b: "sage" });
	});

	it("swaps the other way too", async () => {
		const onChange = renderPicker();

		await userEvent.setup().press(screen.getByTestId("hue-b-sage"));

		expect(onChange).toHaveBeenCalledWith({ a: "blush", b: "sage" });
	});

	it("still answers when you press the hue that seat already holds", async () => {
		const onChange = renderPicker();

		await userEvent.setup().press(screen.getByTestId("hue-a-sage"));

		expect(onChange).toHaveBeenCalledWith({ a: "sage", b: "blush" });
	});

	it("never sends back a pair with the same hue in both seats", async () => {
		const user = userEvent.setup();
		const value: HuePair = { a: "sage", b: "blush" };
		const onChange = renderPicker({ value });

		for (const id of PRESET_IDS) {
			await user.press(screen.getByTestId(`hue-a-${id}`));
			await user.press(screen.getByTestId(`hue-b-${id}`));
		}

		for (const [next] of onChange.mock.calls) {
			expect(next.a).not.toBe(next.b);
		}
		expect(onChange).toHaveBeenCalledTimes(PRESET_IDS.length * 2);
	});
});

describe("the suggestions", () => {
	it("prints tokens.md §2's pairs under the rows", () => {
		renderPicker();

		expect(screen.getByText(SUGGESTED_PAIRS)).toBeTruthy();
		expect(SUGGESTED_PAIRS).toBe(
			"Pairs that read well: sage + blush, butter + lavender, butter + sage, sky + blush, sage + lavender",
		);
	});
});
