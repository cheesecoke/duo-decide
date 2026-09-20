import * as React from "react";
import { render, screen, userEvent, within } from "@testing-library/react-native";

import {
	EditableOptions,
	type EditableOption,
} from "@/components/options/editable-options/editable-options";

/**
 * The view ⟷ edit repeater (FEATURE-INVENTORY §1.11).
 *
 * nativewind/babel is off under jest (babel.config.js), so nothing here
 * asserts a class. What is asserted is the contract two callers depend on:
 * which rows exist, what reaches `onOptionsUpdate` and when, and the three
 * accessible names the circles carry.
 */

const OPTIONS: EditableOption[] = [
	{ id: "o1", title: "Tacos" },
	{ id: "o2", title: "Ramen" },
];

/** The pencil, then whatever the test does next. */
async function enterEditMode() {
	await userEvent.press(screen.getByLabelText("Edit options"));
}

describe("view mode", () => {
	it("renders the title and one row per option", () => {
		render(<EditableOptions options={OPTIONS} />);

		expect(screen.getByText("Options")).toBeTruthy();
		expect(screen.getByText("Tacos")).toBeTruthy();
		expect(screen.getByText("Ramen")).toBeTruthy();
	});

	it("takes the title from the caller", () => {
		render(<EditableOptions options={OPTIONS} title="Dinner spots" />);

		expect(screen.getByText("Dinner spots")).toBeTruthy();
	});

	it("says the empty message instead of an empty box", () => {
		render(
			<EditableOptions
				options={[]}
				emptyMessage="No options in this list yet. Tap the edit button to add some!"
			/>,
		);

		expect(
			screen.getByText("No options in this list yet. Tap the edit button to add some!"),
		).toBeTruthy();
	});

	it("offers only the pencil", () => {
		render(<EditableOptions options={OPTIONS} />);

		expect(screen.getByLabelText("Edit options")).toBeTruthy();
		expect(screen.queryByLabelText("Add option")).toBeNull();
		expect(screen.queryByLabelText("Done editing")).toBeNull();
	});
});

describe("edit mode", () => {
	it("turns every row into a field, and swaps the header controls", async () => {
		render(<EditableOptions options={OPTIONS} />);
		await enterEditMode();

		expect(screen.getAllByPlaceholderText("Enter option")).toHaveLength(2);
		expect(screen.getByLabelText("Add option")).toBeTruthy();
		expect(screen.getByLabelText("Done editing")).toBeTruthy();
		expect(screen.queryByLabelText("Edit options")).toBeNull();
	});

	// A repeater that opened with nothing in it reads as one that failed to open.
	it("seeds one blank row when there was nothing to edit", async () => {
		render(<EditableOptions options={[]} />);
		await enterEditMode();

		const rows = screen.getAllByPlaceholderText("Enter option");
		expect(rows).toHaveLength(1);
		expect(rows[0].props.value).toBe("");
	});

	it("reports the blank row upward the moment it is added", async () => {
		const onOptionsUpdate = jest.fn();
		render(<EditableOptions options={OPTIONS} onOptionsUpdate={onOptionsUpdate} />);
		await enterEditMode();

		await userEvent.press(screen.getByLabelText("Add option"));

		expect(onOptionsUpdate).toHaveBeenCalledTimes(1);
		expect(onOptionsUpdate.mock.calls[0][0]).toEqual([
			{ id: "o1", title: "Tacos" },
			{ id: "o2", title: "Ramen" },
			{ id: expect.stringMatching(/^temp-/), title: "" },
		]);
	});

	/**
	 * PLAN-3 final review M1. The id used to be `temp-${Date.now()}` alone, so
	 * two rows added inside the same millisecond shared one — and a shared id
	 * is a shared React key, which makes them the same row: type into one and
	 * the other takes the text. `Date.now` is pinned here because "the same
	 * millisecond" is the whole condition, and two real presses may or may not
	 * land in one.
	 */
	it("gives two rows minted in the same tick different ids", async () => {
		const now = jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
		const onOptionsUpdate = jest.fn();
		render(<EditableOptions options={OPTIONS} onOptionsUpdate={onOptionsUpdate} />);
		await enterEditMode();

		await userEvent.press(screen.getByLabelText("Add option"));
		await userEvent.press(screen.getByLabelText("Add option"));

		const rows: EditableOption[] = onOptionsUpdate.mock.calls.at(-1)![0];
		expect(rows).toHaveLength(4);
		const minted = rows.slice(2).map((row) => row.id);
		expect(minted[0]).not.toBe(minted[1]);
		expect(new Set(rows.map((row) => row.id)).size).toBe(4);

		now.mockRestore();
	});

	/**
	 * §1.11's "in-progress option rows are saved even if the user never taps
	 * the check". The report goes up per change, not per confirm.
	 */
	it("reports every keystroke, with the in-progress rows", async () => {
		const onOptionsUpdate = jest.fn();
		render(<EditableOptions options={OPTIONS} onOptionsUpdate={onOptionsUpdate} />);
		await enterEditMode();

		// `type` appends a character at a time, which is the point: three
		// keystrokes, three reports upward, each with the row mid-edit.
		await userEvent.type(screen.getByLabelText("Option 1"), "!!!");

		expect(onOptionsUpdate).toHaveBeenCalledTimes(3);
		expect(onOptionsUpdate.mock.calls[0][0]).toEqual([
			{ id: "o1", title: "Tacos!" },
			{ id: "o2", title: "Ramen" },
		]);
		expect(onOptionsUpdate.mock.calls.at(-1)?.[0]).toEqual([
			{ id: "o1", title: "Tacos!!!" },
			{ id: "o2", title: "Ramen" },
		]);
	});

	it("done filters the blanks, reports once more and leaves edit mode", async () => {
		const onOptionsUpdate = jest.fn();
		render(<EditableOptions options={OPTIONS} onOptionsUpdate={onOptionsUpdate} />);
		await enterEditMode();

		await userEvent.press(screen.getByLabelText("Add option"));
		onOptionsUpdate.mockClear();

		await userEvent.press(screen.getByLabelText("Done editing"));

		expect(onOptionsUpdate).toHaveBeenCalledWith([
			{ id: "o1", title: "Tacos" },
			{ id: "o2", title: "Ramen" },
		]);
		expect(screen.queryByPlaceholderText("Enter option")).toBeNull();
		expect(screen.getByLabelText("Edit options")).toBeTruthy();
	});

	it("survives being handed no callback at all", async () => {
		render(<EditableOptions options={OPTIONS} />);
		await enterEditMode();

		await userEvent.press(screen.getByLabelText("Add option"));
		await userEvent.press(screen.getByLabelText("Done editing"));

		expect(screen.getByLabelText("Edit options")).toBeTruthy();
	});
});

describe("validation, when the caller asks for it", () => {
	it("is off by default, however few options there are", async () => {
		render(<EditableOptions options={[{ id: "o1", title: "Tacos" }]} />);
		await enterEditMode();

		expect(screen.queryByText("Add at least 2 options")).toBeNull();
	});

	it("appears below the threshold and goes once it is met", async () => {
		render(<EditableOptions options={[{ id: "o1", title: "Tacos" }]} showValidation />);
		await enterEditMode();

		expect(screen.getByText("Add at least 2 options")).toBeTruthy();

		await userEvent.press(screen.getByLabelText("Add option"));
		await userEvent.type(screen.getByLabelText("Option 2"), "Ramen");

		expect(screen.queryByText("Add at least 2 options")).toBeNull();
	});

	it("counts to the caller's own minimum", async () => {
		render(<EditableOptions options={OPTIONS} showValidation minOptions={3} />);
		await enterEditMode();

		expect(screen.getByText("Add at least 3 options")).toBeTruthy();
	});

	// A row with only whitespace in it is a row nobody filled in.
	it("does not count a whitespace row", async () => {
		render(<EditableOptions options={[{ id: "o1", title: "Tacos" }]} showValidation />);
		await enterEditMode();

		await userEvent.press(screen.getByLabelText("Add option"));
		await userEvent.type(screen.getByLabelText("Option 2"), "   ");

		expect(screen.getByText("Add at least 2 options")).toBeTruthy();
	});
});

describe("the rows themselves", () => {
	it("keeps the option text in the row in view mode", () => {
		render(<EditableOptions options={OPTIONS} />);

		// One row per option, each carrying exactly its own title.
		expect(within(screen.getByText("Tacos").parent!).queryByText("Ramen")).toBeNull();
	});
});
