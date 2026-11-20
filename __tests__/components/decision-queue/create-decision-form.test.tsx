import * as React from "react";
import { act, fireEvent, render, screen, userEvent } from "@testing-library/react-native";

import {
	CreateDecisionForm,
	type CreateDecisionFormData,
} from "@/components/decision-queue/CreateDecisionForm";
import type { suggestWhen } from "@/lib/suggest-when";
import type { OptionListWithItems } from "@/types/database";

// The zone a confirmed date is stamped with is the device's; jest's is
// whatever the machine running it has. Pinned, so the assertion is not.
jest.mock("@/lib/calendar-link", () => ({ deviceTimeZone: () => "America/Denver" }));

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
				: React_.createElement("Pressable", { accessibilityLabel: "Decide by", onPress }, label);
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
	/** Called with the form data the screen holds at the moment of submit. */
	onSubmit?: (data: CreateDecisionFormData) => void;
	onCancel?: () => void;
	isEditing?: boolean;
	isSubmitting?: boolean;
	suggest?: typeof suggestWhen;
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
			onSubmit={() => props.onSubmit?.(formData)}
			onCancel={props.onCancel ?? jest.fn()}
			isEditing={props.isEditing ?? false}
			isSubmitting={props.isSubmitting ?? false}
			optionLists={optionLists}
			suggest={props.suggest}
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

		await user().press(screen.getByLabelText("Decide by"));

		expect(onFormDataChange).toHaveBeenCalledWith(expect.objectContaining({ dueDate: "2026-09-25" }));
	});

	it("labels the deadline 'Decide by', so it is not taken for the event's date", () => {
		render(<Harness />);

		expect(screen.getByText("Decide by")).toBeTruthy();
		expect(screen.getByLabelText("Decide by").props.role).toBe("button");
		expect(screen.queryByText("Due date")).toBeNull();
		expect(screen.queryByLabelText("Due date")).toBeNull();
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

	it("submits once there is a title and enough options", async () => {
		const onSubmit = jest.fn();
		render(
			<Harness
				initial={{
					title: "Tacos?",
					customOptions: [
						{ id: "c1", title: "Tacos", selected: false },
						{ id: "c2", title: "Ramen", selected: false },
					],
				}}
				onSubmit={onSubmit}
			/>,
		);

		const submit = screen.getByLabelText("Create Decision");
		expect(submit.props.accessibilityState).toEqual({ disabled: false });

		await user().press(submit);
		expect(onSubmit).toHaveBeenCalledTimes(1);
	});

	describe("option minimums (polls need 3, votes 2)", () => {
		const opts = (n: number) =>
			["Tacos", "Ramen", "Pho"]
				.slice(0, n)
				.map((title, i) => ({ id: `c${i}`, title, selected: false }));

		it.each([
			["vote", 1, "Add at least 2 options", true],
			["vote", 2, null, false],
			["poll", 2, "Polls need at least 3 options", true],
			["poll", 3, null, false],
		] as const)("%s with %i option(s)", (decisionType, n, message, disabled) => {
			render(<Harness initial={{ title: "Dinner?", decisionType, customOptions: opts(n) }} />);

			expect(screen.getByLabelText("Create Decision").props.accessibilityState).toEqual({ disabled });
			if (message) expect(screen.getByText(message)).toBeTruthy();
			else expect(screen.queryByTestId("create-options-message")).toBeNull();
		});

		it("counts options picked from a list together with custom ones", () => {
			render(
				<Harness
					initial={{
						title: "Dinner?",
						decisionType: "poll",
						selectedOptions: [
							{ id: "l1", title: "Sushi", selected: true },
							{ id: "l2", title: "Curry", selected: false },
						],
						customOptions: opts(2),
					}}
				/>,
			);

			expect(screen.getByLabelText("Create Decision").props.accessibilityState).toEqual({
				disabled: false,
			});
		});

		it("ignores blank custom rows", () => {
			render(
				<Harness
					initial={{
						title: "Dinner?",
						decisionType: "poll",
						customOptions: [...opts(2), { id: "blank", title: "  ", selected: false }],
					}}
				/>,
			);

			expect(screen.getByText("Polls need at least 3 options")).toBeTruthy();
		});
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

describe("CreateDecisionForm — the event-date chip", () => {
	// A stand-in for lib/suggest-when.ts (table-tested on its own): it knows
	// three phrases and nothing else, so each test says which date the text
	// "contains" without going through chrono.
	const KNOWN: [RegExp, { date: string; time: string | null }][] = [
		[/Dec 12 at 7:30pm/, { date: "2026-12-12", time: "19:30" }],
		[/Dec 12/, { date: "2026-12-12", time: null }],
		[/Dec 19/, { date: "2026-12-19", time: null }],
		[/Nov 2\b/, { date: "2026-11-02", time: null }],
	];
	const suggest: typeof suggestWhen = ({ title, description }) => {
		for (const source of ["title", "description"] as const) {
			const text = (source === "title" ? title : description) ?? "";
			const hit = KNOWN.find(([pattern]) => pattern.test(text));
			if (hit) return { ...hit[1], matchedText: text, source, relative: false };
		}
		return null;
	};

	const TWO_OPTIONS = [
		{ id: "c1", title: "Yes", selected: false },
		{ id: "c2", title: "No", selected: false },
	];

	const chip = () => screen.queryByTestId("event-date-chip");
	/** Type into a field and let the debounce run out. */
	const typeAndRest = (label: string, text: string) => {
		fireEvent.changeText(screen.getByLabelText(label), text);
		act(() => {
			jest.advanceTimersByTime(300);
		});
	};

	beforeEach(() => {
		jest.useFakeTimers();
		jest.setSystemTime(new Date(2026, 10, 19, 12));
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("shows nothing at all for a title with no date in it", () => {
		render(<Harness suggest={suggest} />);

		typeAndRest("Title", "Movie night");

		expect(chip()).toBeNull();
		expect(screen.queryByText(/happening/i)).toBeNull();
	});

	it("offers the date once the typing rests, not on the keystroke", () => {
		render(<Harness suggest={suggest} />);

		fireEvent.changeText(screen.getByLabelText("Title"), "Nutcracker on Dec 12?");
		expect(chip()).toBeNull();

		act(() => {
			jest.advanceTimersByTime(300);
		});

		expect(screen.getByLabelText("Sat, Dec 12 · happening then?").props.role).toBe("checkbox");
		expect(chip()?.props.accessibilityState).toMatchObject({ selected: false, checked: false });
	});

	it("includes the time when the text gives one", () => {
		render(<Harness suggest={suggest} />);

		typeAndRest("Title", "Nutcracker on Dec 12 at 7:30pm");

		expect(screen.getByLabelText("Sat, Dec 12 · 7:30 pm · happening then?")).toBeTruthy();
	});

	it("reads the description too", () => {
		render(<Harness suggest={suggest} initial={{ title: "Nutcracker?" }} />);

		typeAndRest("Description", "It is on Dec 12");

		expect(screen.getByLabelText("Sat, Dec 12 · happening then?")).toBeTruthy();
	});

	it("never offers a day that has already gone", () => {
		render(<Harness suggest={suggest} />);

		typeAndRest("Title", "That thing on Nov 2");

		expect(chip()).toBeNull();
	});

	it("stores nothing while the chip is only offered", () => {
		const onSubmit = jest.fn();
		render(
			<Harness suggest={suggest} onSubmit={onSubmit} initial={{ customOptions: TWO_OPTIONS }} />,
		);

		typeAndRest("Title", "Nutcracker on Dec 12?");
		fireEvent.press(screen.getByLabelText("Create Decision"));

		const submitted = onSubmit.mock.calls[0][0];
		expect(submitted.title).toBe("Nutcracker on Dec 12?");
		expect(submitted.eventOn).toBeUndefined();
		expect(submitted.eventTime).toBeUndefined();
		expect(submitted.eventTz).toBeUndefined();
	});

	it("confirms on a tap: the chip is selected and the submitted data carries the date", () => {
		const onSubmit = jest.fn();
		render(
			<Harness suggest={suggest} onSubmit={onSubmit} initial={{ customOptions: TWO_OPTIONS }} />,
		);

		typeAndRest("Title", "Nutcracker on Dec 12 at 7:30pm");
		fireEvent.press(chip()!);

		expect(screen.getByLabelText("Happening Sat, Dec 12 · 7:30 pm")).toBeTruthy();
		expect(chip()?.props.accessibilityState).toMatchObject({ selected: true, checked: true });
		expect(screen.queryByText(/happening then/)).toBeNull();

		fireEvent.press(screen.getByLabelText("Create Decision"));

		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({
				eventOn: "2026-12-12",
				eventTime: "19:30",
				eventTz: "America/Denver",
			}),
		);
	});

	it("stores an all-day date with no time", () => {
		const onFormDataChange = jest.fn();
		render(<Harness suggest={suggest} onFormDataChange={onFormDataChange} />);

		typeAndRest("Title", "Nutcracker on Dec 12?");
		fireEvent.press(chip()!);

		expect(screen.getByLabelText("Happening Sat, Dec 12")).toBeTruthy();
		expect(onFormDataChange).toHaveBeenLastCalledWith(
			expect.objectContaining({ eventOn: "2026-12-12", eventTime: null, eventTz: "America/Denver" }),
		);
	});

	it("takes the confirmation back on a second tap, and offers it again", () => {
		const onFormDataChange = jest.fn();
		render(<Harness suggest={suggest} onFormDataChange={onFormDataChange} />);

		typeAndRest("Title", "Nutcracker on Dec 12?");
		fireEvent.press(chip()!);
		fireEvent.press(chip()!);

		expect(onFormDataChange).toHaveBeenLastCalledWith(
			expect.objectContaining({ eventOn: null, eventTime: null, eventTz: null }),
		);
		expect(screen.getByLabelText("Sat, Dec 12 · happening then?")).toBeTruthy();
		expect(chip()?.props.accessibilityState).toMatchObject({ selected: false });
	});

	it("drops the confirmation the moment the text names another day", () => {
		const onFormDataChange = jest.fn();
		render(<Harness suggest={suggest} onFormDataChange={onFormDataChange} />);

		typeAndRest("Title", "Nutcracker on Dec 12?");
		fireEvent.press(chip()!);
		// No resting: the confirmation must not outlive the keystroke.
		fireEvent.changeText(screen.getByLabelText("Title"), "Nutcracker on Dec 19?");

		expect(onFormDataChange).toHaveBeenLastCalledWith(
			expect.objectContaining({
				title: "Nutcracker on Dec 19?",
				eventOn: null,
				eventTime: null,
				eventTz: null,
			}),
		);
		expect(screen.getByLabelText("Sat, Dec 19 · happening then?")).toBeTruthy();
		expect(chip()?.props.accessibilityState).toMatchObject({ selected: false });
	});

	it("keeps the confirmation through an edit that leaves the date alone", () => {
		const onFormDataChange = jest.fn();
		render(<Harness suggest={suggest} onFormDataChange={onFormDataChange} />);

		typeAndRest("Title", "Nutcracker on Dec 12?");
		fireEvent.press(chip()!);
		typeAndRest("Title", "The Nutcracker on Dec 12, with your mum?");

		expect(onFormDataChange).toHaveBeenLastCalledWith(
			expect.objectContaining({ eventOn: "2026-12-12" }),
		);
		expect(screen.getByLabelText("Happening Sat, Dec 12")).toBeTruthy();
	});

	it("clears the date and removes the chip when the date text is deleted", () => {
		const onFormDataChange = jest.fn();
		render(<Harness suggest={suggest} onFormDataChange={onFormDataChange} />);

		typeAndRest("Title", "Nutcracker on Dec 12?");
		fireEvent.press(chip()!);
		typeAndRest("Title", "Nutcracker?");

		expect(chip()).toBeNull();
		expect(onFormDataChange).toHaveBeenLastCalledWith(
			expect.objectContaining({ eventOn: null, eventTime: null, eventTz: null }),
		);
	});

	it("opens confirmed on a decision that already has a date, showing the stored one", () => {
		render(
			<Harness
				suggest={suggest}
				isEditing
				initial={{
					title: "Nutcracker?",
					eventOn: "2026-12-12",
					eventTime: "19:30",
					eventTz: "America/Denver",
				}}
			/>,
		);

		expect(screen.getByLabelText("Happening Sat, Dec 12 · 7:30 pm")).toBeTruthy();
		expect(chip()?.props.accessibilityState).toMatchObject({ selected: true });
	});

	it("carries on without a chip when the reader throws", () => {
		const broken = () => {
			throw new Error("chrono did not load");
		};
		render(<Harness suggest={broken} />);

		typeAndRest("Title", "Nutcracker on Dec 12?");

		expect(chip()).toBeNull();
		expect(screen.getByLabelText("Title").props.value).toBe("Nutcracker on Dec 12?");
	});
});
