import * as React from "react";
import { Text, View } from "react-native";
import { render, screen, userEvent } from "@testing-library/react-native";

import { vars } from "nativewind";

import { BottomDrawer } from "@/components/modals/BottomDrawer";
import { DatePickerComponent } from "@/components/ui/DatePicker";
import { PersonPairProvider } from "@/theme/PersonPairProvider";
import { PersonVarsBoundary } from "@/theme/PersonVarsBoundary";
import { DEFAULT_PERSON_A, DEFAULT_PERSON_B, pairVars } from "@/theme/presets";

/**
 * A React Native `Modal` portals its tree out of the app root on web, so the
 * `--person-*` custom properties `PersonPairProvider` writes onto its own View
 * do not reach anything inside a sheet — a `person-a-tint` chip in the create
 * sheet would fall back to the sage + blush `:root` block in global.css while
 * the screen behind it was on the pair the couple actually picked.
 *
 * What is asserted is the fix's whole contract: the boundary is inside the
 * Modal, and the vars it emits are `vars(pairVars(a, b))` for the *live* pair
 * — the same call, from the same ids, as the provider above it. Classes are
 * not styled under jest (see babel.config.js), so the chip below is there to
 * show what consumes the vars; the style object on the boundary is the proof.
 *
 * There are exactly two Modals in the tree — `BottomDrawer`'s sheet and the
 * deadline calendar's overlay — and both are covered here, because a boundary
 * that only ever went into one of them would leave the calendar's selected
 * day sage on a `sky` couple.
 */

function renderSheet(pair?: { a: string; b: string }) {
	return render(
		<PersonPairProvider a={pair?.a} b={pair?.b}>
			<BottomDrawer visible onClose={jest.fn()} title="Create decision">
				{/* What the vars are for: the create sheet's option chips. */}
				<View testID="option-chip" className="bg-person-a-tint">
					<Text>Thai</Text>
				</View>
			</BottomDrawer>
		</PersonPairProvider>,
	);
}

describe("PersonVarsBoundary", () => {
	it("re-emits the picked pair's vars inside the drawer's Modal", () => {
		renderSheet({ a: "sky", b: "butter" });

		expect(screen.getByTestId("person-vars-boundary").props.style).toEqual(
			vars(pairVars("sky", "butter")),
		);
	});

	it("re-emits the defaults when nothing has been picked", () => {
		renderSheet();

		expect(screen.getByTestId("person-vars-boundary").props.style).toEqual(
			vars(pairVars(DEFAULT_PERSON_A, DEFAULT_PERSON_B)),
		);
	});

	it("wraps the sheet's content, so a consumer is inside the vars", () => {
		renderSheet({ a: "sky", b: "butter" });

		const boundary = screen.getByTestId("person-vars-boundary");
		const chip = screen.getByTestId("option-chip");

		// The chip is a descendant of the boundary, not a sibling — which is
		// the only thing that makes a custom property reach it on web.
		let node = chip.parent;
		let found = false;
		while (node) {
			if (node === boundary) {
				found = true;
				break;
			}
			node = node.parent;
		}
		expect(found).toBe(true);
	});

	it("takes the pair from the provider rather than holding one", () => {
		// The boundary is a re-emitter: with no provider above it, it emits
		// the context defaults, never a pair of its own.
		render(
			<PersonVarsBoundary>
				<Text>child</Text>
			</PersonVarsBoundary>,
		);

		expect(screen.getByTestId("person-vars-boundary").props.style).toEqual(
			vars(pairVars(DEFAULT_PERSON_A, DEFAULT_PERSON_B)),
		);
	});
});

describe("PersonVarsBoundary — the calendar's Modal", () => {
	/**
	 * The calendar is the app's other Modal. Its selected day is
	 * `bg-person-a-base` and its today ring `text-person-a-deep`, so it has
	 * the same exposure as the create sheet's chips.
	 */
	function renderCalendar(pair?: { a: string; b: string }) {
		return render(
			<PersonPairProvider a={pair?.a} b={pair?.b}>
				<DatePickerComponent
					value="2026-09-25"
					onChange={jest.fn()}
					renderTrigger={({ label, onPress }) => (
						<Text onPress={onPress} accessibilityLabel="Due date">
							{label}
						</Text>
					)}
				/>
			</PersonPairProvider>,
		);
	}

	it("re-emits the picked pair's vars inside the calendar's Modal", async () => {
		renderCalendar({ a: "sky", b: "butter" });

		// The calendar is closed until the trigger is pressed, and a closed
		// Modal renders nothing — so there is nothing to assert before this.
		expect(screen.queryByTestId("date-picker-vars-boundary")).toBeNull();
		await userEvent.press(screen.getByLabelText("Due date"));

		expect(screen.getByTestId("date-picker-vars-boundary").props.style).toEqual(
			vars(pairVars("sky", "butter")),
		);
	});

	it("wraps the calendar grid, so the selected day is inside the vars", async () => {
		renderCalendar({ a: "sky", b: "butter" });
		await userEvent.press(screen.getByLabelText("Due date"));

		const boundary = screen.getByTestId("date-picker-vars-boundary");
		// The footer's "Cancel" is the cheapest node that is unambiguously
		// inside the calendar overlay.
		let node: typeof boundary | null = screen.getByText("Cancel").parent;
		let found = false;
		while (node) {
			if (node === boundary) {
				found = true;
				break;
			}
			node = node.parent;
		}
		expect(found).toBe(true);
	});
});
