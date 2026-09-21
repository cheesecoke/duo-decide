import * as React from "react";
import { act, fireEvent, render, screen, userEvent, within } from "@testing-library/react-native";

import {
	COMMIT_DELAY,
	type EditableOption,
} from "@/components/options/editable-options/editable-options";
import { OptionListCard } from "@/components/options/option-list-card/option-list-card";

/**
 * The option-list card (FEATURE-INVENTORY §1.11's `CollapsibleListCard`).
 *
 * It is pure, so everything here is props in / callbacks out. The Reanimated
 * mock lands every value on its target immediately (test-utils), so an
 * expanded body is queryable the moment it mounts; nothing asserts a frame.
 */

const OPTIONS: EditableOption[] = [
	{ id: "o1", title: "Tacos" },
	{ id: "o2", title: "Ramen" },
];

function renderCard(
	over: {
		list?: Partial<React.ComponentProps<typeof OptionListCard>["list"]>;
	} & Partial<Omit<React.ComponentProps<typeof OptionListCard>, "list">> = {},
) {
	const { list, ...rest } = over;
	const props = {
		list: {
			id: "l1",
			title: "Dinner spots",
			description: "Places we keep coming back to",
			options: OPTIONS,
			expanded: false,
			...list,
		},
		state: "neutral" as const,
		canDelete: false,
		onToggle: jest.fn(),
		onDelete: jest.fn(),
		onOptionsUpdate: jest.fn(),
		...rest,
	};

	render(<OptionListCard {...props} />);
	return props;
}

describe("collapsed", () => {
	it("shows the title, the description and the count, and nothing else", () => {
		renderCard();

		expect(screen.getByText("Dinner spots")).toBeTruthy();
		expect(screen.getByTestId("option-list-card-description")).toBeTruthy();
		expect(screen.getByText("Places we keep coming back to")).toBeTruthy();
		expect(screen.getByText("2 options")).toBeTruthy();
		// The body is not merely hidden — it is not mounted.
		expect(screen.queryByTestId("option-list-card-body")).toBeNull();
		expect(screen.queryByText("Tacos")).toBeNull();
	});

	// A list with no description used to render an empty line under the title.
	it("omits the description element when there is no description", () => {
		renderCard({ list: { description: "" } });

		expect(screen.getByText("Dinner spots")).toBeTruthy();
		expect(screen.getByText("2 options")).toBeTruthy();
		expect(screen.queryByTestId("option-list-card-description")).toBeNull();
	});

	it.each([
		["No options yet", []],
		["1 option", [OPTIONS[0]]],
		["2 options", OPTIONS],
	])("the meta line says %s", (copy, options) => {
		renderCard({ list: { options: options as EditableOption[] } });

		expect(screen.getByText(copy as string)).toBeTruthy();
	});

	/**
	 * Tweak T4, the caption half. "Movies · 4 options" over two titles and two
	 * empty hairlines is the screenshot in Chase's report — the blanks are in
	 * the database and the caption was counting them.
	 */
	it("counts filled options only, whatever is stored", () => {
		renderCard({
			list: {
				options: [
					{ id: "o1", title: "Shrek" },
					{ id: "o2", title: "Pirate King" },
					{ id: "o3", title: "" },
					{ id: "o4", title: "   " },
				],
			},
		});

		expect(screen.getByText("2 options")).toBeTruthy();
		expect(screen.queryByText("4 options")).toBeNull();
	});
});

describe("the chevron", () => {
	it("is the one named control on the header, and says which way it goes", () => {
		renderCard();

		const chevron = screen.getByLabelText("Expand");
		expect(chevron.props.accessibilityState).toMatchObject({ expanded: false });
		expect(screen.queryByLabelText("Collapse")).toBeNull();
	});

	it("flips its name and its state once the card is open", () => {
		renderCard({ list: { expanded: true } });

		const chevron = screen.getByLabelText("Collapse");
		expect(chevron.props.accessibilityState).toMatchObject({ expanded: true });
	});

	it("toggles on press", async () => {
		const props = renderCard();

		await userEvent.press(screen.getByLabelText("Expand"));

		expect(props.onToggle).toHaveBeenCalledTimes(1);
	});

	// The whole header row is the target, not just the 30 px disc.
	it("toggles when the title is pressed too", async () => {
		const props = renderCard();

		await userEvent.press(screen.getByText("Dinner spots"));

		expect(props.onToggle).toHaveBeenCalledTimes(1);
	});

	/**
	 * PLAN-3 final review I6. The row is a mouse and touch target with no
	 * role and no name; React Native Web would still give it `tabIndex=0`,
	 * making it a keyboard stop that announces nothing, one Tab before the
	 * chevron that does the same job and says its name.
	 */
	it("is not a keyboard stop — the chevron is the named one", () => {
		renderCard();

		expect(screen.getByTestId("option-list-card-header").props.tabIndex).toBe(-1);
		expect(screen.getByLabelText("Expand")).toBeTruthy();
	});
});

describe("expanded", () => {
	it("puts the repeater in the body", () => {
		renderCard({ list: { expanded: true } });

		const body = screen.getByTestId("option-list-card-body");
		expect(within(body).getByText("Tacos")).toBeTruthy();
		expect(within(body).getByText("Ramen")).toBeTruthy();
		expect(within(body).getByLabelText("Edit options")).toBeTruthy();
	});

	it("uses the card's own empty copy, not the sheet's", () => {
		renderCard({ list: { expanded: true, options: [] } });

		expect(
			screen.getByText("No options in this list yet. Tap the edit button to add some!"),
		).toBeTruthy();
	});

	/**
	 * The card is a pass-through: whatever the repeater decides to report, it
	 * reports. Since tweak T4 that is the *filled* rows, on a debounce — the
	 * card's `onOptionsUpdate` is a Supabase write, so a blank row reaching it
	 * was a blank option saved.
	 */
	it("passes the repeater's output straight up", () => {
		jest.useFakeTimers();
		try {
			const props = renderCard({ list: { expanded: true } });

			fireEvent.press(screen.getByLabelText("Edit options"));
			fireEvent.changeText(screen.getByLabelText("Option 1"), "Tacos al pastor");
			fireEvent.press(screen.getByLabelText("Add option"));

			expect(props.onOptionsUpdate).not.toHaveBeenCalled();

			act(() => {
				jest.advanceTimersByTime(COMMIT_DELAY);
			});

			expect(props.onOptionsUpdate).toHaveBeenCalledWith([
				{ id: "o1", title: "Tacos al pastor" },
				{ id: "o2", title: "Ramen" },
			]);
			// …and the card is still open, in edit mode, with the blank row.
			expect(screen.getByLabelText("Done editing")).toBeTruthy();
			expect(screen.getByLabelText("Option 3")).toBeTruthy();
		} finally {
			jest.runOnlyPendingTimers();
			jest.useRealTimers();
		}
	});

	// Already-saved blanks are not offered back for re-saving.
	it("never draws a stored blank in the open body", () => {
		renderCard({
			list: {
				expanded: true,
				options: [
					{ id: "o1", title: "Shrek" },
					{ id: "o2", title: "" },
				],
			},
		});

		const body = screen.getByTestId("option-list-card-body");
		expect(within(body).getByText("Shrek")).toBeTruthy();
		expect(within(body).getAllByTestId("option-row")).toHaveLength(1);
	});
});

describe("delete", () => {
	/**
	 * Tweak T3. This used to be a trash circle at the foot of the open body —
	 * a second delete gesture on a card that otherwise reads like a decision
	 * card. It is the queue's `⋯` overflow now, and these assert the three
	 * things that makes true: same trigger, same shape, same place.
	 */
	it("offers no overflow to someone who did not make the list", () => {
		renderCard({ list: { expanded: true }, canDelete: false });

		expect(screen.queryByLabelText("More")).toBeNull();
		expect(screen.queryByLabelText("Delete list")).toBeNull();
	});

	it("keeps delete behind the overflow, not on the card", async () => {
		const props = renderCard({ list: { expanded: true }, canDelete: true });
		expect(screen.queryByTestId("option-list-card-menu")).toBeNull();
		expect(screen.queryByLabelText("Delete list")).toBeNull();

		const user = userEvent.setup();
		await user.press(screen.getByLabelText("More"));
		expect(screen.getByTestId("option-list-card-menu")).toBeTruthy();

		await user.press(screen.getByLabelText("Delete list"));

		expect(props.onDelete).toHaveBeenCalledTimes(1);
		expect(screen.queryByTestId("option-list-card-menu")).toBeNull();
	});

	// The queue's overflow is on the header, so a collapsed card has one too —
	// which is the point: the gesture does not move about.
	it("reaches the overflow without opening the card", async () => {
		const props = renderCard({ canDelete: true });

		await userEvent.press(screen.getByLabelText("More"));

		expect(screen.getByTestId("option-list-card-menu")).toBeTruthy();
		expect(props.onToggle).not.toHaveBeenCalled();
	});

	/**
	 * The trigger sits inside the header row, which is itself a pressable.
	 * The responder hands the touch to the innermost pressable, so the row
	 * never sees it — the same reason the chevron does not fire twice.
	 */
	it("does not toggle the card when the overflow is pressed", async () => {
		const props = renderCard({ list: { expanded: true }, canDelete: true });
		const user = userEvent.setup();

		await user.press(screen.getByLabelText("More"));
		await user.press(screen.getByLabelText("Delete list"));

		expect(props.onToggle).not.toHaveBeenCalled();
	});
});

describe("whose card it is", () => {
	it.each(["neutral", "a", "b"] as const)("wears the %s seat", (state) => {
		renderCard({ state });

		expect(screen.getByTestId(`card-state-${state}`)).toBeTruthy();
	});
});
