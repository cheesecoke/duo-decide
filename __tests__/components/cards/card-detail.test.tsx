import * as React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react-native";

import { BalanceStrip } from "@/components/cards/balance-strip/balance-strip";
import {
	CardDetail,
	type CardDay,
	type CardDetailProps,
} from "@/components/cards/card-detail/card-detail";

/**
 * CardDetail (the opened card) and BalanceStrip (the week's count). Both are
 * pure, so each test is props in, callbacks and words out.
 */

/** Mon 9 to Sun 15 November; `done` is the indexes that are logged. */
const week = (done: number[]): CardDay[] =>
	["M", "T", "W", "T", "F", "S", "S"].map((weekday, index) => ({
		day: `2026-11-${String(9 + index).padStart(2, "0")}`,
		weekday,
		date: String(9 + index),
		label: index === 6 ? "Today" : `November ${9 + index}`,
		done: done.includes(index),
	}));

function renderDetail(over: Partial<CardDetailProps> = {}) {
	const handlers = { onToggleDay: jest.fn(), onDeal: jest.fn(), onRemove: jest.fn() };
	render(
		<CardDetail
			category="home"
			daily
			deckKey="trash"
			holder="a"
			partnerLabel="Sam"
			week={week([])}
			log={[]}
			{...handlers}
			{...over}
		/>,
	);
	return handlers;
}

describe("CardDetail", () => {
	it("offers the holder the one button until today is logged", () => {
		const { onToggleDay } = renderDetail();

		fireEvent.press(screen.getByLabelText("I did this today"));

		expect(onToggleDay).toHaveBeenCalledWith("2026-11-15", false);
		expect(screen.queryByTestId("card-detail-done")).toBeNull();
	});

	it("swaps the button for Did it today and an Undo once it is", () => {
		const { onToggleDay } = renderDetail({ week: week([6]) });

		expect(screen.queryByLabelText("I did this today")).toBeNull();
		expect(within(screen.getByTestId("card-detail-done")).getByText("Did it today")).toBeTruthy();

		fireEvent.press(screen.getByLabelText("Undo today"));
		expect(onToggleDay).toHaveBeenCalledWith("2026-11-15", true);
	});

	it("lets the holder log an earlier day, and take a logged day back", () => {
		const { onToggleDay } = renderDetail({ week: week([3]) });

		fireEvent.press(screen.getByLabelText("November 10, not logged"));
		fireEvent.press(screen.getByLabelText("November 12, done"));

		expect(onToggleDay.mock.calls).toEqual([
			["2026-11-10", false],
			["2026-11-12", true],
		]);
	});

	it("shows the partner's card read only: the week, no button, nothing to tap", () => {
		const { onToggleDay } = renderDetail({ holder: "b", week: week([3]) });

		expect(screen.queryByLabelText("I did this today")).toBeNull();
		expect(screen.getByLabelText("November 12, done")).toBeTruthy();
		fireEvent.press(screen.getByLabelText("November 12, done"));
		fireEvent.press(screen.getByLabelText("Today, not logged"));
		expect(onToggleDay).not.toHaveBeenCalled();
		expect(screen.getByText("Sam holds this card, so Sam logs it.")).toBeTruthy();
	});

	it("asks for a card nobody holds to be dealt before it is logged", () => {
		const { onToggleDay } = renderDetail({ holder: "none" });

		expect(screen.queryByLabelText("I did this today")).toBeNull();
		fireEvent.press(screen.getByLabelText("Today, not logged"));
		expect(onToggleDay).not.toHaveBeenCalled();
		expect(screen.getByText("Deal this card to one of you to start logging it.")).toBeTruthy();
	});

	it("hands the card over, and puts it back on the holder's own chip", () => {
		const { onDeal } = renderDetail({ holder: "a" });

		fireEvent.press(screen.getByLabelText("Sam"));
		fireEvent.press(screen.getByLabelText("You"));

		expect(onDeal.mock.calls).toEqual([["b"], ["none"]]);
	});

	it("leaves the partner's chip out while no partner is linked", () => {
		renderDetail({ partnerLabel: null });

		expect(within(screen.getByLabelText("Who holds it")).queryByLabelText("Sam")).toBeNull();
		expect(screen.getByLabelText("You")).toBeTruthy();
	});

	it("lists the latest logged days, or says there are none", () => {
		renderDetail();
		expect(screen.getByText("No days logged yet.")).toBeTruthy();

		screen.unmount();
		renderDetail({
			log: [
				{ id: "1", who: "a", name: "You", when: "Today" },
				{ id: "2", who: "b", name: "Sam", when: "Yesterday" },
			],
		});
		const log = screen.getByTestId("card-detail-log");
		expect(within(log).getByText("Today")).toBeTruthy();
		expect(within(log).getByText("Sam")).toBeTruthy();
		expect(within(log).getByText("Yesterday")).toBeTruthy();
	});

	it("removes through the callback", () => {
		const { onRemove } = renderDetail();

		fireEvent.press(screen.getByLabelText("Remove card"));

		expect(onRemove).toHaveBeenCalledTimes(1);
	});
});

describe("BalanceStrip", () => {
	it("shows each person's week and what they hold", () => {
		render(
			<BalanceStrip
				you={{ done: 14, holding: 11 }}
				partner={{ done: 1, holding: 1 }}
				partnerLabel="Sam"
			/>,
		);

		expect(screen.getByLabelText("You: 14 done in the last 7 days, holding 11 cards")).toBeTruthy();
		expect(screen.getByLabelText("Sam: 1 done in the last 7 days, holding 1 card")).toBeTruthy();
		expect(within(screen.getByTestId("balance-a")).getByText("14")).toBeTruthy();
	});

	it("is one side while no partner is linked", () => {
		render(
			<BalanceStrip
				you={{ done: 2, holding: 3 }}
				partner={{ done: 0, holding: 0 }}
				partnerLabel={null}
			/>,
		);

		expect(screen.getByTestId("balance-a")).toBeTruthy();
		expect(screen.queryByTestId("balance-b")).toBeNull();
	});
});
