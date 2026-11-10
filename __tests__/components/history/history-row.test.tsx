import * as React from "react";
import { Linking } from "react-native";
import { render, screen, userEvent, within } from "@testing-library/react-native";

import { HistoryRow } from "@/components/history/history-row/history-row";

/**
 * One settled decision (FEATURE-INVENTORY §1.12's history item).
 *
 * The row is pure and has no controls on it, so what is asserted is what it
 * says and how the winner is announced. The seat is carried by colour, and
 * nativewind/babel is off under jest (babel.config.js) — so the seat is read
 * off the winner row's testID, the same way `Card` exposes its state.
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
	 * button. The decider's own hue moves to the winner row.
	 */
	it("is a together card", () => {
		render(<HistoryRow {...ROW} />);

		expect(screen.getByTestId("card-state-together")).toBeTruthy();
	});

	it("wears your seat for a decision you ended", () => {
		render(<HistoryRow {...ROW} />);

		expect(screen.getByTestId("history-row-winner-a")).toBeTruthy();
		expect(screen.queryByTestId("history-row-winner-b")).toBeNull();
	});

	it("wears your partner's seat for one they ended", () => {
		render(<HistoryRow {...ROW} decidedBy="Sam" decidedBySeat="b" />);

		expect(screen.getByTestId("history-row-winner-b")).toBeTruthy();
		expect(screen.queryByTestId("history-row-winner-a")).toBeNull();
	});

	/**
	 * PLAN-3 final review M3: the winner is a record, not a control. It used
	 * to be a disabled chip — a checkbox a screen reader offers and then
	 * refuses. It is a plain row now, like the queue's decided winner but with
	 * no radio role: there is no group to pick from on this screen.
	 */
	it("prints the winner as text, not as a control", () => {
		render(<HistoryRow {...ROW} />);

		expect(screen.getByText("Tacos")).toBeTruthy();
		expect(screen.queryByRole("checkbox")).toBeNull();
		expect(screen.queryByRole("radio")).toBeNull();
		// No accessible name of its own either: the text is already in the
		// tree, and a label on the wrapper would only say it twice.
		expect(screen.queryByLabelText("Tacos")).toBeNull();
	});

	/** The decision card's winner mark, so the two screens read the same. */
	it("marks the winner with the decided card's tick", () => {
		render(<HistoryRow {...ROW} decidedBy="Sam" decidedBySeat="b" />);

		const winner = screen.getByTestId("history-row-winner-b");
		expect(within(winner).getByText("Tacos")).toBeTruthy();
		expect(within(winner).getByTestId("option-row-mark-checked")).toBeTruthy();
		expect(within(winner).getByTestId("option-row-tick")).toBeTruthy();
	});

	it("has nothing pressable on it", () => {
		render(<HistoryRow {...ROW} />);

		// A finished decision is a record, not a control.
		expect(screen.getByTestId("history-row-winner-a").props.onPress).toBeUndefined();
		expect(screen.queryByRole("button")).toBeNull();
		expect(screen.queryByRole("checkbox")).toBeNull();
		expect(screen.queryByRole("radio")).toBeNull();
	});

	it("makes a link in the winning option tappable, showing its host", async () => {
		const url = "https://www.psychologytoday.com/us/therapists/alexa-sharf-boulder-co/1234567";
		jest.mocked(Linking.openURL).mockClear();
		render(<HistoryRow {...ROW} chosenOption={`Alexa Sharf: ${url}`} />);

		expect(screen.getByText(/psychologytoday\.com/)).toBeTruthy();
		const link = screen.getByRole("link");
		expect(link.props.accessibilityLabel).toBe(url);

		await userEvent.setup().press(link);
		expect(Linking.openURL).toHaveBeenCalledWith(url);
		expect(Linking.openURL).toHaveBeenCalledTimes(1);
	});

	it("keeps the whole winning option, wrapping, not truncating", () => {
		const long =
			"Adventure Bikepacking Overnighter in Phantom Canyon (https://rodeo-labs.com/pages/phantom)";
		render(<HistoryRow {...ROW} chosenOption={long} />);

		const winner = screen.getByTestId("history-row-winner-a");
		expect(
			within(winner).getByText(/Adventure Bikepacking Overnighter in Phantom Canyon/),
		).toBeTruthy();
		expect(within(winner).getByRole("link").props.accessibilityLabel).toBe(
			"https://rodeo-labs.com/pages/phantom",
		);
		// No line cap: the row wraps it at the card's full width.
		expect(within(winner).getByText(/Adventure/).props.numberOfLines).toBeUndefined();
	});

	/** Migration 024: the row's ⋮. */
	describe("the ⋮ menu", () => {
		it("has no ⋮ without a handler — a record with nothing to do", () => {
			render(<HistoryRow {...ROW} />);
			expect(screen.queryByLabelText("More")).toBeNull();
		});

		it("on a row still in the queue: Delete only", async () => {
			const onDelete = jest.fn();
			const onMoveToQueue = jest.fn();
			render(<HistoryRow {...ROW} onDelete={onDelete} onMoveToQueue={onMoveToQueue} />);

			const user = userEvent.setup();
			await user.press(screen.getByLabelText("More"));
			expect(screen.getByTestId("history-row-menu")).toBeTruthy();
			expect(screen.queryByLabelText("Move back to queue")).toBeNull();

			await user.press(screen.getByLabelText("Delete"));
			expect(onDelete).toHaveBeenCalledTimes(1);
			expect(onMoveToQueue).not.toHaveBeenCalled();
			expect(screen.queryByTestId("history-row-menu")).toBeNull();
		});

		it("on an archived row: Move back to queue, then Delete", async () => {
			const onDelete = jest.fn();
			const onMoveToQueue = jest.fn();
			render(<HistoryRow {...ROW} archived onDelete={onDelete} onMoveToQueue={onMoveToQueue} />);

			const user = userEvent.setup();
			await user.press(screen.getByLabelText("More"));
			const menu = within(screen.getByTestId("history-row-menu"));
			expect(menu.getAllByText(/./).map((t) => t.props.children)).toEqual([
				"Move back to queue",
				"Delete",
			]);

			await user.press(screen.getByLabelText("Move back to queue"));
			expect(onMoveToQueue).toHaveBeenCalledTimes(1);
			expect(onDelete).not.toHaveBeenCalled();
		});

		it("a second press on ⋮ closes it", async () => {
			render(<HistoryRow {...ROW} onDelete={jest.fn()} />);
			const user = userEvent.setup();
			await user.press(screen.getByLabelText("More"));
			await user.press(screen.getByLabelText("More"));
			expect(screen.queryByTestId("history-row-menu")).toBeNull();
		});

		it("a tap outside closes it, and neither moves nor deletes the row", async () => {
			const onDelete = jest.fn();
			const onMoveToQueue = jest.fn();
			render(<HistoryRow {...ROW} archived onDelete={onDelete} onMoveToQueue={onMoveToQueue} />);

			const user = userEvent.setup();
			await user.press(screen.getByLabelText("More"));
			await user.press(screen.getByLabelText("Close menu"));

			expect(screen.queryByTestId("history-row-menu")).toBeNull();
			expect(onDelete).not.toHaveBeenCalled();
			expect(onMoveToQueue).not.toHaveBeenCalled();
			expect(screen.getByLabelText("More").props.accessibilityState).toMatchObject({
				expanded: false,
			});
		});

		it("is a menu of menu items, off an expanded trigger", async () => {
			render(<HistoryRow {...ROW} archived onDelete={jest.fn()} onMoveToQueue={jest.fn()} />);
			await userEvent.press(screen.getByLabelText("More"));

			expect(screen.getByTestId("history-row-menu").props.role).toBe("menu");
			expect(screen.getByLabelText("Move back to queue").props.role).toBe("menuitem");
			expect(screen.getByLabelText("Delete").props.role).toBe("menuitem");
			expect(screen.getByLabelText("More").props.accessibilityState).toMatchObject({
				expanded: true,
			});
		});

		it("opening another row's menu closes the first", async () => {
			const first = jest.fn();
			const second = jest.fn();
			render(
				<>
					<HistoryRow {...ROW} onDelete={first} />
					<HistoryRow {...ROW} title="Saturday" onDelete={second} />
				</>,
			);

			const user = userEvent.setup();
			const [moreOnFirst, moreOnSecond] = screen.getAllByLabelText("More");
			await user.press(moreOnFirst);
			await user.press(moreOnSecond);

			expect(screen.getAllByTestId("history-row-menu")).toHaveLength(1);
			await user.press(screen.getByLabelText("Delete"));
			expect(second).toHaveBeenCalledTimes(1);
			expect(first).not.toHaveBeenCalled();
		});
	});
});
