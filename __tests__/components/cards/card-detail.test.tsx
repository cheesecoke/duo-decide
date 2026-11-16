import * as React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react-native";

import { BalanceStrip } from "@/components/cards/balance-strip/balance-strip";
import { CardDetail, type CardDetailProps } from "@/components/cards/card-detail/card-detail";

/**
 * CardDetail (the opened card) and BalanceStrip (the week's count). Both are
 * pure, so each test is props in, callbacks and words out.
 */

function renderDetail(over: Partial<CardDetailProps> = {}) {
	const handlers = { onDone: jest.fn(), onUndo: jest.fn(), onDeal: jest.fn(), onRemove: jest.fn() };
	render(
		<CardDetail
			category="home"
			daily
			deckKey="trash"
			holder="a"
			partnerLabel="Sam"
			doneByYouToday={false}
			log={[]}
			{...handlers}
			{...over}
		/>,
	);
	return handlers;
}

describe("CardDetail", () => {
	it("offers the one button until you have done it today", () => {
		const { onDone, onUndo } = renderDetail();

		fireEvent.press(screen.getByLabelText("I did this today"));

		expect(onDone).toHaveBeenCalledTimes(1);
		expect(onUndo).not.toHaveBeenCalled();
		expect(screen.queryByTestId("card-detail-done")).toBeNull();
	});

	it("swaps the button for Done today and an Undo once you have", () => {
		const { onDone, onUndo } = renderDetail({ doneByYouToday: true });

		expect(screen.queryByLabelText("I did this today")).toBeNull();
		expect(within(screen.getByTestId("card-detail-done")).getByText("Done today")).toBeTruthy();

		fireEvent.press(screen.getByLabelText("Undo done today"));
		expect(onUndo).toHaveBeenCalledTimes(1);
		expect(onDone).not.toHaveBeenCalled();
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

	it("lists the latest marks, or says there are none", () => {
		renderDetail();
		expect(screen.getByText("Nobody has marked this one done yet.")).toBeTruthy();

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
