import * as React from "react";
import { render, screen, userEvent } from "@testing-library/react-native";

import {
	ResponsibilityCard,
	cardMeta,
} from "@/components/cards/responsibility-card/responsibility-card";

/**
 * The responsibility card. Pure, so everything here is props in / callbacks
 * out. Class strings are not styled under jest, so nothing asserts a colour:
 * the seat is read off `Card`'s own test id and the chips' checked state.
 */

function renderCard(over: Partial<React.ComponentProps<typeof ResponsibilityCard>> = {}) {
	const props = {
		title: "Trash & recycling",
		category: "home" as const,
		daily: true,
		holder: "none" as const,
		partnerLabel: "Sam" as string | null,
		onDeal: jest.fn(),
		onRemove: jest.fn(),
		...over,
	};
	render(<ResponsibilityCard {...props} />);
	return props;
}

const checked = (label: string) => screen.getByLabelText(label).props.accessibilityState.checked;

describe("what it shows", () => {
	it("shows the title, the category and that it is daily", () => {
		renderCard();

		expect(screen.getByText("Trash & recycling")).toBeTruthy();
		expect(screen.getByText("Home · Daily")).toBeTruthy();
	});

	it("leaves 'Daily' off a job that is not", () => {
		expect(cardMeta("out", false)).toBe("Out");
		expect(cardMeta("us", true)).toBe("Us · Daily");
	});

	it.each([
		["none", "neutral", false, false],
		["a", "a", true, false],
		["b", "b", false, true],
	] as const)("holder %s wears the %s card and checks the right chip", (holder, state, you, sam) => {
		renderCard({ holder });

		expect(screen.getByTestId(`card-state-${state}`)).toBeTruthy();
		expect(checked("You")).toBe(you);
		expect(checked("Sam")).toBe(sam);
	});

	it("has no partner chip while no partner is linked", () => {
		renderCard({ partnerLabel: null });

		expect(screen.getByLabelText("You")).toBeTruthy();
		expect(screen.queryByLabelText("Sam")).toBeNull();
	});
});

describe("dealing", () => {
	it("deals to whoever's chip is tapped", async () => {
		const props = renderCard();
		const user = userEvent.setup();

		await user.press(screen.getByLabelText("Sam"));
		await user.press(screen.getByLabelText("You"));

		expect(props.onDeal).toHaveBeenNthCalledWith(1, "b");
		expect(props.onDeal).toHaveBeenNthCalledWith(2, "a");
	});

	it("puts the card back when the holder's own chip is tapped again", async () => {
		const props = renderCard({ holder: "b" });
		const user = userEvent.setup();

		await user.press(screen.getByLabelText("Sam"));

		expect(props.onDeal).toHaveBeenCalledWith("none");
	});

	it("moves a held card straight to the other person", async () => {
		const props = renderCard({ holder: "b" });
		const user = userEvent.setup();

		await user.press(screen.getByLabelText("You"));

		expect(props.onDeal).toHaveBeenCalledWith("a");
	});
});

describe("the overflow", () => {
	it("is named after its card", () => {
		renderCard();

		expect(screen.getByLabelText("More for Trash & recycling")).toBeTruthy();
	});

	it("offers only 'Remove card' on a card nobody holds", async () => {
		const props = renderCard();
		const user = userEvent.setup();

		await user.press(screen.getByLabelText("More for Trash & recycling"));
		expect(screen.queryByLabelText("Put back in the deck")).toBeNull();

		await user.press(screen.getByLabelText("Remove card"));

		expect(props.onRemove).toHaveBeenCalledTimes(1);
		expect(props.onDeal).not.toHaveBeenCalled();
		expect(screen.queryByTestId("responsibility-card-menu")).toBeNull();
	});

	it("offers 'Put back in the deck' on a held card", async () => {
		const props = renderCard({ holder: "a" });
		const user = userEvent.setup();

		await user.press(screen.getByLabelText("More for Trash & recycling"));
		await user.press(screen.getByLabelText("Put back in the deck"));

		expect(props.onDeal).toHaveBeenCalledWith("none");
		expect(props.onRemove).not.toHaveBeenCalled();
	});
});
