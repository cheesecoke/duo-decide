import * as React from "react";
import { render, screen } from "@testing-library/react-native";

import { HistoryRow } from "@/components/history/history-row/history-row";

/**
 * One settled decision (FEATURE-INVENTORY §1.12's history item).
 *
 * The row is pure and has no controls on it, so what is asserted is what it
 * says and how the chip is announced. The seat is carried by colour, and
 * nativewind/babel is off under jest (babel.config.js) — so the seat is read
 * off the chip's testID, the same way `Card` exposes its state.
 */

const ROW = {
	title: "Dinner tonight",
	chosenOption: "Tacos",
	decidedBy: "You",
	decidedBySeat: "a" as const,
	decisionDate: "Today",
};

describe("HistoryRow", () => {
	it("says the title, the date, the winning option and who ended it", () => {
		render(<HistoryRow {...ROW} decidedBy="Sam" decidedBySeat="b" decisionDate="3 days ago" />);

		expect(screen.getByText("Dinner tonight")).toBeTruthy();
		expect(screen.getByText("3 days ago")).toBeTruthy();
		expect(screen.getByText("Tacos")).toBeTruthy();
		expect(screen.getByText("by Sam")).toBeTruthy();
	});

	it("keeps the exact date string it was given, formatting nothing itself", () => {
		render(<HistoryRow {...ROW} decisionDate="Sep 13, 2026" />);

		expect(screen.getByText("Sep 13, 2026")).toBeTruthy();
	});

	/**
	 * tokens.md §10: a completed decision is the pair's, whoever pressed the
	 * button. The decider's own hue moves to the chip.
	 */
	it("is a together card", () => {
		render(<HistoryRow {...ROW} />);

		expect(screen.getByTestId("card-state-together")).toBeTruthy();
	});

	it("wears your seat for a decision you ended", () => {
		render(<HistoryRow {...ROW} />);

		expect(screen.getByTestId("history-row-chip-a")).toBeTruthy();
		expect(screen.queryByTestId("history-row-chip-b")).toBeNull();
	});

	it("wears your partner's seat for one they ended", () => {
		render(<HistoryRow {...ROW} decidedBy="Sam" decidedBySeat="b" />);

		expect(screen.getByTestId("history-row-chip-b")).toBeTruthy();
		expect(screen.queryByTestId("history-row-chip-a")).toBeNull();
	});

	/**
	 * Chip announces selection as `checked` on a `checkbox` role — the brief
	 * called it `selected`, but the component has spelled it `checked` since
	 * chip.tsx was written, and the queue's cards depend on that spelling.
	 */
	it("announces the winner as a checked, disabled chip", () => {
		render(<HistoryRow {...ROW} />);

		const chip = screen.getByLabelText("Tacos");

		expect(chip.props.accessibilityState).toEqual({ checked: true, disabled: true });
		expect(chip.props.role).toBe("checkbox");
	});

	it("has nothing pressable on it", () => {
		render(<HistoryRow {...ROW} />);

		// A finished decision is a record, not a control: the chip is inert
		// (Chip drops both `onPress` and hit-testing while disabled) and the
		// card takes no `onPress`.
		expect(screen.getByLabelText("Tacos").props.onPress).toBeUndefined();
		expect(screen.queryByRole("button")).toBeNull();
	});
});
