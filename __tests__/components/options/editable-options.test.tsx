import * as React from "react";
import { act, fireEvent, render, screen, userEvent, within } from "@testing-library/react-native";

import {
	COMMIT_DELAY,
	EditableOptions,
	type EditableOption,
} from "@/components/options/editable-options/editable-options";

/**
 * The view ⟷ edit repeater (FEATURE-INVENTORY §1.11, tweak T4).
 *
 * nativewind/babel is off under jest (babel.config.js), so nothing here
 * asserts a class. What is asserted is the contract two callers depend on:
 * that the draft is the source of truth while editing, that only *filled*
 * rows ever reach `onOptionsUpdate`, that they reach it on a debounce and on
 * ✓ and on unmount, and that no write ever closes the editor.
 *
 * The debounce cases use `fireEvent` with fake timers rather than
 * `userEvent`, which has waits of its own that fake timers would stall.
 */

const OPTIONS: EditableOption[] = [
	{ id: "o1", title: "Tacos" },
	{ id: "o2", title: "Ramen" },
];

/** The pencil, then whatever the test does next. */
async function enterEditMode() {
	await userEvent.press(screen.getByLabelText("Edit options"));
}

/** The same, for the fake-timer tests. */
function enterEditModeSync() {
	fireEvent.press(screen.getByLabelText("Edit options"));
}

/** Past the debounce, with React given a chance to settle. */
function runDebounce() {
	act(() => {
		jest.advanceTimersByTime(COMMIT_DELAY);
	});
}

const rowValues = () =>
	screen.getAllByPlaceholderText("Enter option").map((row) => row.props.value);

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

	/**
	 * The screenshot in Chase's report: "Movies · 4 options", two of them
	 * blank hairlines. The blanks are in the database already, so view mode
	 * refuses to draw them whatever the data says.
	 */
	it("never draws a blank row, however many are stored", () => {
		render(
			<EditableOptions
				options={[
					{ id: "o1", title: "Shrek" },
					{ id: "o2", title: "Pirate King" },
					{ id: "o3", title: "" },
					{ id: "o4", title: "   " },
				]}
			/>,
		);

		expect(screen.getByText("Shrek")).toBeTruthy();
		expect(screen.getByText("Pirate King")).toBeTruthy();
		// Two rows, two hairlines — not four.
		expect(screen.getAllByTestId("option-row")).toHaveLength(2);
		expect(screen.queryByText("   ")).toBeNull();
	});

	it("falls back to the empty message when every stored row is blank", () => {
		render(<EditableOptions options={[{ id: "o1", title: "" }]} emptyMessage="Nothing here." />);

		expect(screen.getByText("Nothing here.")).toBeTruthy();
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

		expect(rowValues()).toEqual([""]);
	});

	// Blanks already saved by the old per-keystroke write are not offered back.
	it("seeds from the filled rows only", async () => {
		render(
			<EditableOptions
				options={[
					{ id: "o1", title: "Shrek" },
					{ id: "o2", title: "" },
					{ id: "o3", title: "Pirate King" },
				]}
			/>,
		);
		await enterEditMode();

		expect(rowValues()).toEqual(["Shrek", "Pirate King"]);
	});

	it("gives every row its own trash button", async () => {
		render(<EditableOptions options={OPTIONS} />);
		await enterEditMode();

		expect(screen.getByLabelText("Remove option 1")).toBeTruthy();
		expect(screen.getByLabelText("Remove option 2")).toBeTruthy();
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
		render(<EditableOptions options={OPTIONS} />);
		await enterEditMode();

		await userEvent.press(screen.getByLabelText("Add option"));
		await userEvent.press(screen.getByLabelText("Add option"));

		expect(rowValues()).toHaveLength(4);

		// Two rows sharing a key would take each other's text.
		fireEvent.changeText(screen.getByLabelText("Option 3"), "Sushi");
		expect(rowValues()).toEqual(["Tacos", "Ramen", "Sushi", ""]);

		now.mockRestore();
	});
});

/**
 * Chase's report: "I hit the plus icon, all it does is reload the page… and
 * then puts the user right back to the main and has to click edit again."
 * Nothing in here may leave edit mode, and nothing in here may be undone by
 * the `options` prop changing underneath.
 */
describe("the draft is the source of truth while editing", () => {
	it("ignores an options prop that changes mid-edit", async () => {
		const view = render(<EditableOptions options={OPTIONS} />);
		await enterEditMode();

		fireEvent.changeText(screen.getByLabelText("Option 1"), "Tacos al pastor");

		// What a realtime refetch of the card's own write looks like: same
		// titles, brand-new ids (the write is a delete-all + re-insert).
		await act(async () => {
			view.rerender(
				<EditableOptions
					options={[
						{ id: "new-1", title: "Tacos" },
						{ id: "new-2", title: "Ramen" },
					]}
				/>,
			);
		});

		expect(rowValues()).toEqual(["Tacos al pastor", "Ramen"]);
		expect(screen.getByLabelText("Done editing")).toBeTruthy();
	});

	it("stays in edit mode across an add, a type and a remove", async () => {
		render(<EditableOptions options={OPTIONS} onOptionsUpdate={jest.fn()} />);
		await enterEditMode();

		await userEvent.press(screen.getByLabelText("Add option"));
		expect(screen.getByLabelText("Done editing")).toBeTruthy();

		fireEvent.changeText(screen.getByLabelText("Option 3"), "Sushi");
		expect(screen.getByLabelText("Done editing")).toBeTruthy();

		await userEvent.press(screen.getByLabelText("Remove option 1"));
		expect(screen.getByLabelText("Done editing")).toBeTruthy();
		expect(rowValues()).toEqual(["Ramen", "Sushi"]);
	});
});

describe("adding and removing rows", () => {
	it("the + circle appends a blank row", async () => {
		render(<EditableOptions options={OPTIONS} />);
		await enterEditMode();

		await userEvent.press(screen.getByLabelText("Add option"));

		expect(rowValues()).toEqual(["Tacos", "Ramen", ""]);
	});

	// "Enter halfway up a list means 'and then this one', not 'and also, at
	// the bottom'" — the same rule as the decision card's inline edit.
	it("Enter opens the next row directly after the one submitted", async () => {
		render(<EditableOptions options={OPTIONS} />);
		await enterEditMode();

		fireEvent(screen.getByLabelText("Option 1"), "submitEditing");

		expect(rowValues()).toEqual(["Tacos", "", "Ramen"]);
	});

	// Otherwise holding Enter stacks blanks, and every one is a row the save
	// then silently drops.
	it("Enter on a blank last row does nothing", async () => {
		render(<EditableOptions options={OPTIONS} />);
		await enterEditMode();

		await userEvent.press(screen.getByLabelText("Add option"));
		expect(rowValues()).toHaveLength(3);

		fireEvent(screen.getByLabelText("Option 3"), "submitEditing");

		expect(rowValues()).toHaveLength(3);
	});

	it("Enter on a filled last row still opens one", async () => {
		render(<EditableOptions options={OPTIONS} />);
		await enterEditMode();

		fireEvent(screen.getByLabelText("Option 2"), "submitEditing");

		expect(rowValues()).toEqual(["Tacos", "Ramen", ""]);
	});

	it("removing a row removes the row, and renumbers the rest", async () => {
		render(<EditableOptions options={[...OPTIONS, { id: "o3", title: "Sushi" }]} />);
		await enterEditMode();

		await userEvent.press(screen.getByLabelText("Remove option 2"));

		expect(rowValues()).toEqual(["Tacos", "Sushi"]);
		expect(screen.queryByLabelText("Remove option 3")).toBeNull();
	});

	it("can empty the list out entirely", async () => {
		render(<EditableOptions options={OPTIONS} />);
		await enterEditMode();

		await userEvent.press(screen.getByLabelText("Remove option 2"));
		await userEvent.press(screen.getByLabelText("Remove option 1"));

		expect(screen.queryByPlaceholderText("Enter option")).toBeNull();
		expect(screen.getByLabelText("Done editing")).toBeTruthy();
	});
});

/**
 * The write contract. On the card `onOptionsUpdate` is a Supabase write
 * (delete-all + re-insert), which is why "every keystroke, blanks included"
 * was both a round trip per character *and* how empty options got saved.
 */
describe("what reaches onOptionsUpdate, and when", () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.runOnlyPendingTimers();
		jest.useRealTimers();
	});

	it("says nothing until the typing stops", () => {
		const onOptionsUpdate = jest.fn();
		render(<EditableOptions options={OPTIONS} onOptionsUpdate={onOptionsUpdate} />);
		enterEditModeSync();

		fireEvent.changeText(screen.getByLabelText("Option 1"), "Tacos!");
		fireEvent.changeText(screen.getByLabelText("Option 1"), "Tacos!!");
		fireEvent.changeText(screen.getByLabelText("Option 1"), "Tacos!!!");

		expect(onOptionsUpdate).not.toHaveBeenCalled();

		runDebounce();

		expect(onOptionsUpdate).toHaveBeenCalledTimes(1);
		expect(onOptionsUpdate).toHaveBeenCalledWith([
			{ id: "o1", title: "Tacos!!!" },
			{ id: "o2", title: "Ramen" },
		]);
	});

	// The bug in the screenshot: a tapped + used to persist an empty option.
	it("never sends a blank row", () => {
		const onOptionsUpdate = jest.fn();
		render(<EditableOptions options={OPTIONS} onOptionsUpdate={onOptionsUpdate} />);
		enterEditModeSync();

		fireEvent.press(screen.getByLabelText("Add option"));
		runDebounce();

		expect(onOptionsUpdate).toHaveBeenCalledWith([
			{ id: "o1", title: "Tacos" },
			{ id: "o2", title: "Ramen" },
		]);
		// …and the row is still on screen, waiting to be typed into.
		expect(rowValues()).toEqual(["Tacos", "Ramen", ""]);
	});

	it("trims what it does send", () => {
		const onOptionsUpdate = jest.fn();
		render(<EditableOptions options={[]} onOptionsUpdate={onOptionsUpdate} />);
		enterEditModeSync();

		fireEvent.changeText(screen.getByLabelText("Option 1"), "  Tacos  ");
		runDebounce();

		expect(onOptionsUpdate).toHaveBeenCalledWith([
			{ id: expect.stringMatching(/^temp-/), title: "Tacos" },
		]);
	});

	it("reports a removal too", () => {
		const onOptionsUpdate = jest.fn();
		render(<EditableOptions options={OPTIONS} onOptionsUpdate={onOptionsUpdate} />);
		enterEditModeSync();

		fireEvent.press(screen.getByLabelText("Remove option 1"));
		runDebounce();

		expect(onOptionsUpdate).toHaveBeenCalledWith([{ id: "o2", title: "Ramen" }]);
	});

	it("a write does not close the editor", () => {
		const onOptionsUpdate = jest.fn();
		render(<EditableOptions options={OPTIONS} onOptionsUpdate={onOptionsUpdate} />);
		enterEditModeSync();

		fireEvent.changeText(screen.getByLabelText("Option 1"), "Tacos al pastor");
		runDebounce();

		expect(onOptionsUpdate).toHaveBeenCalled();
		expect(screen.getByLabelText("Done editing")).toBeTruthy();
		expect(rowValues()).toEqual(["Tacos al pastor", "Ramen"]);
	});

	it("✓ flushes the pending write rather than letting it fire twice", () => {
		const onOptionsUpdate = jest.fn();
		render(<EditableOptions options={OPTIONS} onOptionsUpdate={onOptionsUpdate} />);
		enterEditModeSync();

		fireEvent.changeText(screen.getByLabelText("Option 1"), "Tacos al pastor");
		fireEvent.press(screen.getByLabelText("Done editing"));

		expect(onOptionsUpdate).toHaveBeenCalledTimes(1);
		expect(onOptionsUpdate).toHaveBeenCalledWith([
			{ id: "o1", title: "Tacos al pastor" },
			{ id: "o2", title: "Ramen" },
		]);

		runDebounce();
		expect(onOptionsUpdate).toHaveBeenCalledTimes(1);
		expect(screen.getByLabelText("Edit options")).toBeTruthy();
	});

	// §1.11's "in-progress rows are saved even if the user never taps ✓" —
	// now for the filled rows, which are the only ones worth saving.
	it("flushes on unmount, so a closed sheet keeps the last keystroke", () => {
		const onOptionsUpdate = jest.fn();
		const view = render(<EditableOptions options={OPTIONS} onOptionsUpdate={onOptionsUpdate} />);
		enterEditModeSync();

		fireEvent.changeText(screen.getByLabelText("Option 1"), "Tacos al pastor");
		expect(onOptionsUpdate).not.toHaveBeenCalled();

		view.unmount();

		expect(onOptionsUpdate).toHaveBeenCalledTimes(1);
		expect(onOptionsUpdate).toHaveBeenCalledWith([
			{ id: "o1", title: "Tacos al pastor" },
			{ id: "o2", title: "Ramen" },
		]);
	});

	it("says nothing on unmount when there was nothing to say", () => {
		const onOptionsUpdate = jest.fn();
		const view = render(<EditableOptions options={OPTIONS} onOptionsUpdate={onOptionsUpdate} />);
		enterEditModeSync();

		view.unmount();

		expect(onOptionsUpdate).not.toHaveBeenCalled();
	});

	it("survives being handed no callback at all", () => {
		render(<EditableOptions options={OPTIONS} />);
		enterEditModeSync();

		fireEvent.press(screen.getByLabelText("Add option"));
		runDebounce();
		fireEvent.press(screen.getByLabelText("Done editing"));

		expect(screen.getByLabelText("Edit options")).toBeTruthy();
	});
});

describe("done", () => {
	it("filters the blanks, reports once more and leaves edit mode", async () => {
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
		fireEvent.changeText(screen.getByLabelText("Option 2"), "Ramen");

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
		fireEvent.changeText(screen.getByLabelText("Option 2"), "   ");

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
