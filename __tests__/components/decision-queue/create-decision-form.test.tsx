import * as React from "react";
import { fireEvent, render, screen, userEvent } from "@testing-library/react-native";

import {
	CreateDecisionForm,
	type CreateDecisionFormData,
} from "@/components/decision-queue/CreateDecisionForm";
import type { OptionListWithItems } from "@/types/database";

// `DatePickerComponent` is the one piece of the old form that stays (§1.10b:
// the deadline calendar, with `transparentOverlay` so it does not stack a
// second scrim on the drawer). Picking a day out of a real calendar means
// picking one that is not in the past, and none of that is this form's
// behaviour. Swapped for a stand-in that honours `renderTrigger` exactly as the
// real picker does, so the `.datefield` asserted below is the form's own.
// The picker's side of that contract is
// __tests__/components/ui/date-picker.test.tsx.
jest.mock("@/components/ui/DatePicker", () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const React_ = require("react");
	return {
		DatePickerComponent: ({
			value,
			onChange,
			placeholder,
			renderTrigger,
		}: {
			value: string;
			onChange: (date: string) => void;
			placeholder?: string;
			renderTrigger?: (props: {
				label: string;
				onPress: () => void;
				disabled?: boolean;
			}) => React.ReactNode;
		}) => {
			const label = value || placeholder || "";
			const onPress = () => onChange("2026-09-25");
			return renderTrigger
				? renderTrigger({ label, onPress, disabled: false })
				: React_.createElement("Pressable", { accessibilityLabel: "Due date", onPress }, label);
		},
	};
});

const EMPTY_FORM: CreateDecisionFormData = {
	title: "",
	description: "",
	dueDate: "",
	decisionType: "vote",
	selectedOptionListId: "",
	selectedOptions: [],
	customOptions: [],
};

function optionList(id: string, title: string, items: string[]): OptionListWithItems {
	return {
		id,
		title,
		description: "",
		couple_id: "couple-1",
		creator_id: "user-1",
		created_at: "2026-09-01T00:00:00Z",
		updated_at: "2026-09-01T00:00:00Z",
		items: items.map((itemTitle, index) => ({
			id: `${id}-i${index}`,
			option_list_id: id,
			title: itemTitle,
			created_at: "2026-09-01T00:00:00Z",
		})),
	};
}

const DINNER = optionList("l1", "Dinner ideas", ["Thai on Grand", "Tacos at home", "Ramen"]);
const DATE_NIGHTS = optionList("l2", "Date nights", ["Mini golf", "That new bar"]);

/**
 * The form is controlled by the queue screen — it never holds `formData`, it
 * only reports the next one. This harness plays the screen so a test can make
 * two moves in a row (pick a list, then toggle a chip) and see the second act
 * on the result of the first.
 */
function Harness({
	initial,
	onFormDataChange,
	optionLists = [],
	...props
}: {
	initial?: Partial<CreateDecisionFormData>;
	onFormDataChange?: (data: CreateDecisionFormData) => void;
	optionLists?: OptionListWithItems[];
	onSubmit?: () => void;
	onCancel?: () => void;
	isEditing?: boolean;
	isSubmitting?: boolean;
}) {
	const [formData, setFormData] = React.useState<CreateDecisionFormData>({
		...EMPTY_FORM,
		...initial,
	});

	return (
		<CreateDecisionForm
			formData={formData}
			onFormDataChange={(data) => {
				setFormData(data);
				onFormDataChange?.(data);
			}}
			onSubmit={props.onSubmit ?? jest.fn()}
			onCancel={props.onCancel ?? jest.fn()}
			isEditing={props.isEditing ?? false}
			isSubmitting={props.isSubmitting ?? false}
			optionLists={optionLists}
		/>
	);
}

// `userEvent` rather than `fireEvent`: fireEvent climbs to composite parents
// looking for a handler and would fire a press the disabled Pressable refused.
const user = () => userEvent.setup();

describe("CreateDecisionForm — the fields", () => {
	it("reports the title as it is typed", async () => {
		const onFormDataChange = jest.fn();
		render(<Harness onFormDataChange={onFormDataChange} />);

		await user().type(screen.getByLabelText("Title"), "Tacos?");

		expect(onFormDataChange).toHaveBeenCalledWith(expect.objectContaining({ title: "Tacos?" }));
	});

	it("reports the description as it is typed", async () => {
		const onFormDataChange = jest.fn();
		render(<Harness onFormDataChange={onFormDataChange} />);

		await user().type(screen.getByLabelText("Description"), "Somewhere new");

		expect(onFormDataChange).toHaveBeenCalledWith(
			expect.objectContaining({ description: "Somewhere new" }),
		);
	});

	it("reports the deadline the date picker returns", async () => {
		const onFormDataChange = jest.fn();
		render(<Harness onFormDataChange={onFormDataChange} />);

		await user().press(screen.getByLabelText("Due date"));

		expect(onFormDataChange).toHaveBeenCalledWith(expect.objectContaining({ dueDate: "2026-09-25" }));
	});

	it("shows the placeholder in the date field until there is a date", () => {
		render(<Harness />);

		expect(screen.getByText("Select decision deadline")).toBeTruthy();
		expect(screen.getByTestId("glyph-calendar")).toBeTruthy();
	});

	it("shows the chosen date in the date field", () => {
		render(<Harness initial={{ dueDate: "2026-09-25" }} />);

		expect(screen.getByText("2026-09-25")).toBeTruthy();
		expect(screen.queryByText("Select decision deadline")).toBeNull();
	});
});

describe("CreateDecisionForm — the Vote | Poll toggle", () => {
	it("offers Vote first, the way the mock orders them", () => {
		render(<Harness />);

		expect(screen.getByLabelText("Vote")).toBeTruthy();
		expect(screen.getByLabelText("Poll")).toBeTruthy();
	});

	it("starts on whatever the screen's default is", () => {
		render(<Harness initial={{ decisionType: "vote" }} />);

		expect(screen.getByLabelText("Vote").props.accessibilityState).toEqual({ checked: true });
		expect(screen.getByLabelText("Poll").props.accessibilityState).toEqual({ checked: false });
	});

	it("switches decisionType to poll", async () => {
		const onFormDataChange = jest.fn();
		render(<Harness onFormDataChange={onFormDataChange} />);

		await user().press(screen.getByLabelText("Poll"));

		expect(onFormDataChange).toHaveBeenCalledWith(expect.objectContaining({ decisionType: "poll" }));
	});

	it("switches back to vote", async () => {
		const onFormDataChange = jest.fn();
		render(<Harness initial={{ decisionType: "poll" }} onFormDataChange={onFormDataChange} />);

		await user().press(screen.getByLabelText("Vote"));

		expect(onFormDataChange).toHaveBeenCalledWith(expect.objectContaining({ decisionType: "vote" }));
	});
});

describe("CreateDecisionForm — Load from Option List", () => {
	it("says so, in those words, when the couple has no lists", () => {
		render(<Harness optionLists={[]} />);

		expect(screen.getByText("No option lists available")).toBeTruthy();
	});

	it("shows each list with its option count", () => {
		render(<Harness optionLists={[DINNER, DATE_NIGHTS]} />);

		expect(screen.getByText("3 options")).toBeTruthy();
		expect(screen.getByText("2 options")).toBeTruthy();
	});

	it("offers the opt-out row", () => {
		render(<Harness optionLists={[DINNER]} />);

		expect(screen.getByLabelText("No list — type my own")).toBeTruthy();
	});

	it("loads a picked list's options, none of them selected", async () => {
		const onFormDataChange = jest.fn();
		render(<Harness optionLists={[DINNER]} onFormDataChange={onFormDataChange} />);

		await user().press(screen.getByLabelText("Dinner ideas"));

		expect(onFormDataChange).toHaveBeenCalledWith(
			expect.objectContaining({
				selectedOptionListId: "l1",
				selectedOptions: [
					expect.objectContaining({ title: "Thai on Grand", selected: false }),
					expect.objectContaining({ title: "Tacos at home", selected: false }),
					expect.objectContaining({ title: "Ramen", selected: false }),
				],
			}),
		);
	});

	it("names the list it is picking from", async () => {
		render(<Harness optionLists={[DINNER]} />);

		await user().press(screen.getByLabelText("Dinner ideas"));

		expect(screen.getByText("Select Options from Dinner ideas")).toBeTruthy();
	});

	it("marks the picked row, and only that row", async () => {
		render(<Harness optionLists={[DINNER, DATE_NIGHTS]} />);

		await user().press(screen.getByLabelText("Dinner ideas"));

		expect(screen.getByLabelText("Dinner ideas").props.accessibilityState).toEqual({
			checked: true,
		});
		expect(screen.getByLabelText("Date nights").props.accessibilityState).toEqual({
			checked: false,
		});
	});

	it("drops the list again on the opt-out row", async () => {
		const onFormDataChange = jest.fn();
		render(<Harness optionLists={[DINNER]} onFormDataChange={onFormDataChange} />);

		await user().press(screen.getByLabelText("Dinner ideas"));
		await user().press(screen.getByLabelText("No list — type my own"));

		expect(onFormDataChange).toHaveBeenLastCalledWith(
			expect.objectContaining({ selectedOptionListId: "", selectedOptions: [] }),
		);
		expect(screen.queryByText("Select Options from Dinner ideas")).toBeNull();
	});
});

describe("CreateDecisionForm — the list's options are a multi-select", () => {
	it("flips one option's `selected` on press", async () => {
		const onFormDataChange = jest.fn();
		render(<Harness optionLists={[DINNER]} onFormDataChange={onFormDataChange} />);

		await user().press(screen.getByLabelText("Dinner ideas"));
		await user().press(screen.getByLabelText("Tacos at home"));

		expect(onFormDataChange).toHaveBeenLastCalledWith(
			expect.objectContaining({
				selectedOptions: [
					expect.objectContaining({ title: "Thai on Grand", selected: false }),
					expect.objectContaining({ title: "Tacos at home", selected: true }),
					expect.objectContaining({ title: "Ramen", selected: false }),
				],
			}),
		);
	});

	it("keeps earlier picks — it is a multi-select, not a radio group", async () => {
		const onFormDataChange = jest.fn();
		render(<Harness optionLists={[DINNER]} onFormDataChange={onFormDataChange} />);

		await user().press(screen.getByLabelText("Dinner ideas"));
		await user().press(screen.getByLabelText("Tacos at home"));
		await user().press(screen.getByLabelText("Ramen"));

		expect(onFormDataChange).toHaveBeenLastCalledWith(
			expect.objectContaining({
				selectedOptions: [
					expect.objectContaining({ title: "Thai on Grand", selected: false }),
					expect.objectContaining({ title: "Tacos at home", selected: true }),
					expect.objectContaining({ title: "Ramen", selected: true }),
				],
			}),
		);
	});

	it("unselects on a second press", async () => {
		const onFormDataChange = jest.fn();
		render(<Harness optionLists={[DINNER]} onFormDataChange={onFormDataChange} />);

		await user().press(screen.getByLabelText("Dinner ideas"));
		await user().press(screen.getByLabelText("Ramen"));
		await user().press(screen.getByLabelText("Ramen"));

		expect(onFormDataChange).toHaveBeenLastCalledWith(
			expect.objectContaining({
				selectedOptions: expect.arrayContaining([
					expect.objectContaining({ title: "Ramen", selected: false }),
				]),
			}),
		);
	});
});

describe("CreateDecisionForm — Custom Options", () => {
	it("is one add pill when there are none", () => {
		render(<Harness />);

		expect(screen.getByLabelText("Add Custom Option")).toBeTruthy();
		expect(screen.queryByLabelText("Edit options")).toBeNull();
		expect(screen.queryByLabelText("Custom option 1")).toBeNull();
	});

	it("the pill opens one blank row in edit mode", async () => {
		render(<Harness />);

		await user().press(screen.getByLabelText("Add Custom Option"));

		expect(screen.getByLabelText("Custom option 1")).toBeTruthy();
		expect(screen.getByLabelText("Remove custom option 1")).toBeTruthy();
		expect(screen.getByLabelText("Cancel editing options")).toBeTruthy();
		expect(screen.getByLabelText("Confirm options")).toBeTruthy();
	});

	it("adds a row per press of the pill", async () => {
		render(<Harness />);

		await user().press(screen.getByLabelText("Add Custom Option"));
		await user().press(screen.getByLabelText("Add Custom Option"));

		expect(screen.getByLabelText("Custom option 2")).toBeTruthy();
	});

	/**
	 * The same keystroke contract the decision card's inline editor has: Enter
	 * opens the next row rather than doing nothing. Focus is not asserted —
	 * react-test-renderer hands `null` for every host ref unless a
	 * `createNodeMock` is given, so `.focus()` is a no-op here. What this
	 * proves is which row appears, and where.
	 */
	describe("Enter in a row", () => {
		it("opens the next row directly under the one it was pressed in", async () => {
			render(
				<Harness
					initial={{
						customOptions: [
							{ id: "c1", title: "Thai on Grand", selected: false },
							{ id: "c2", title: "Ramen", selected: false },
						],
					}}
				/>,
			);

			await user().press(screen.getByLabelText("Edit options"));
			fireEvent(screen.getByLabelText("Custom option 1"), "submitEditing");

			expect(screen.getByLabelText("Custom option 3")).toBeTruthy();
			expect(screen.getByLabelText("Custom option 2").props.value).toBe("");
			expect(screen.getByLabelText("Custom option 3").props.value).toBe("Ramen");
		});

		it("does not stack blanks on an empty last row", async () => {
			render(<Harness />);

			await user().press(screen.getByLabelText("Add Custom Option"));
			fireEvent(screen.getByLabelText("Custom option 1"), "submitEditing");
			fireEvent(screen.getByLabelText("Custom option 1"), "submitEditing");

			expect(screen.queryByLabelText("Custom option 2")).toBeNull();
		});

		it("keeps going row after row", async () => {
			render(<Harness />);

			await user().press(screen.getByLabelText("Add Custom Option"));
			fireEvent.changeText(screen.getByLabelText("Custom option 1"), "Thai on Grand");
			fireEvent(screen.getByLabelText("Custom option 1"), "submitEditing");
			fireEvent.changeText(screen.getByLabelText("Custom option 2"), "Ramen");
			fireEvent(screen.getByLabelText("Custom option 2"), "submitEditing");

			expect(screen.getByLabelText("Custom option 3")).toBeTruthy();
			await user().press(screen.getByLabelText("Confirm options"));
			expect(screen.getByText("Thai on Grand")).toBeTruthy();
			expect(screen.getByText("Ramen")).toBeTruthy();
		});
	});

	it("confirm writes back the rows that have text and drops the blanks", async () => {
		const onFormDataChange = jest.fn();
		render(<Harness onFormDataChange={onFormDataChange} />);

		await user().press(screen.getByLabelText("Add Custom Option"));
		await user().type(screen.getByLabelText("Custom option 1"), "Thai on Grand");
		await user().press(screen.getByLabelText("Add Custom Option"));
		await user().press(screen.getByLabelText("Confirm options"));

		expect(onFormDataChange).toHaveBeenLastCalledWith(
			expect.objectContaining({
				customOptions: [expect.objectContaining({ title: "Thai on Grand" })],
			}),
		);
	});

	it("leaves edit mode on confirm — read-only rows and a pencil", async () => {
		render(<Harness />);

		await user().press(screen.getByLabelText("Add Custom Option"));
		await user().type(screen.getByLabelText("Custom option 1"), "Thai on Grand");
		await user().press(screen.getByLabelText("Confirm options"));

		expect(screen.getByText("Thai on Grand")).toBeTruthy();
		expect(screen.queryByLabelText("Custom option 1")).toBeNull();
		expect(screen.getByLabelText("Edit options")).toBeTruthy();
	});

	it("the pencil goes back into edit mode on the committed rows", async () => {
		render(
			<Harness initial={{ customOptions: [{ id: "c1", title: "Thai on Grand", selected: false }] }} />,
		);

		await user().press(screen.getByLabelText("Edit options"));

		expect(screen.getByLabelText("Custom option 1").props.value).toBe("Thai on Grand");
	});

	it("cancel throws the draft away and keeps what was committed", async () => {
		render(
			<Harness initial={{ customOptions: [{ id: "c1", title: "Thai on Grand", selected: false }] }} />,
		);

		await user().press(screen.getByLabelText("Edit options"));
		await user().press(screen.getByLabelText("Add Custom Option"));
		expect(screen.getByLabelText("Custom option 2")).toBeTruthy();

		await user().press(screen.getByLabelText("Cancel editing options"));

		expect(screen.getByText("Thai on Grand")).toBeTruthy();
		expect(screen.queryByLabelText("Custom option 1")).toBeNull();
		expect(screen.getByLabelText("Edit options")).toBeTruthy();
	});

	it("the trash drops a row", async () => {
		render(
			<Harness
				initial={{
					customOptions: [
						{ id: "c1", title: "Thai on Grand", selected: false },
						{ id: "c2", title: "Ramen", selected: false },
					],
				}}
			/>,
		);

		await user().press(screen.getByLabelText("Edit options"));
		await user().press(screen.getByLabelText("Remove custom option 1"));

		expect(screen.getByLabelText("Custom option 1").props.value).toBe("Ramen");
		expect(screen.queryByLabelText("Custom option 2")).toBeNull();
	});

	// §1.10b writes the block back on blur as well as on confirm, so a row
	// typed and walked away from is not lost. `fireEvent` rather than
	// `userEvent.type` here: the blur IS the behaviour under test, and it
	// should not arrive as a side effect of how the typing helper finishes.
	it("a blur writes back the rows that have text", async () => {
		const onFormDataChange = jest.fn();
		render(
			<Harness
				initial={{ customOptions: [{ id: "c1", title: "Thai on Grand", selected: false }] }}
				onFormDataChange={onFormDataChange}
			/>,
		);

		await user().press(screen.getByLabelText("Edit options"));
		fireEvent.changeText(screen.getByLabelText("Custom option 1"), "Ramen");
		onFormDataChange.mockClear();

		fireEvent(screen.getByLabelText("Custom option 1"), "blur");

		expect(onFormDataChange).toHaveBeenLastCalledWith(
			expect.objectContaining({
				customOptions: [expect.objectContaining({ title: "Ramen" })],
			}),
		);
	});

	it("a blur with nothing but blanks writes back nothing", async () => {
		const onFormDataChange = jest.fn();
		render(<Harness onFormDataChange={onFormDataChange} />);

		await user().press(screen.getByLabelText("Add Custom Option"));
		onFormDataChange.mockClear();

		fireEvent(screen.getByLabelText("Custom option 1"), "blur");

		expect(onFormDataChange).not.toHaveBeenCalled();
	});
});

describe("CreateDecisionForm — the footer", () => {
	it("cannot be submitted with an empty title", async () => {
		const onSubmit = jest.fn();
		render(<Harness onSubmit={onSubmit} />);

		const submit = screen.getByLabelText("Create Decision");
		expect(submit.props.accessibilityState).toEqual({ disabled: true });

		await user().press(submit);
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("cannot be submitted with a title of only spaces", async () => {
		const onSubmit = jest.fn();
		render(<Harness initial={{ title: "   " }} onSubmit={onSubmit} />);

		await user().press(screen.getByLabelText("Create Decision"));

		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("submits once there is a title", async () => {
		const onSubmit = jest.fn();
		render(<Harness initial={{ title: "Tacos?" }} onSubmit={onSubmit} />);

		const submit = screen.getByLabelText("Create Decision");
		expect(submit.props.accessibilityState).toEqual({ disabled: false });

		await user().press(submit);
		expect(onSubmit).toHaveBeenCalledTimes(1);
	});

	it("is 'Update Decision' when editing", () => {
		render(<Harness initial={{ title: "Tacos?" }} isEditing />);

		expect(screen.getByText("Update Decision")).toBeTruthy();
		expect(screen.queryByText("Create Decision")).toBeNull();
	});

	it("is 'Creating…' while submitting, and refuses a second press", async () => {
		const onSubmit = jest.fn();
		render(<Harness initial={{ title: "Tacos?" }} isSubmitting onSubmit={onSubmit} />);

		expect(screen.getByText("Creating…")).toBeTruthy();

		await user().press(screen.getByLabelText("Creating…"));
		expect(onSubmit).not.toHaveBeenCalled();
	});

	// §1.10b: `isEditing` changes the label and nothing else — including while
	// the update is in flight.
	it("is 'Creating…' while submitting an edit too", () => {
		render(<Harness initial={{ title: "Tacos?" }} isEditing isSubmitting />);

		expect(screen.getByText("Creating…")).toBeTruthy();
	});

	it("cancels", async () => {
		const onCancel = jest.fn();
		render(<Harness onCancel={onCancel} />);

		await user().press(screen.getByLabelText("Cancel"));

		expect(onCancel).toHaveBeenCalledTimes(1);
	});
});
