import * as React from "react";
import { Keyboard } from "react-native";
import { act, fireEvent, render, screen, userEvent } from "@testing-library/react-native";

import {
	QueueFilterBar,
	type QueueFilterBarProps,
} from "@/components/decision-queue/queue-filter-bar/queue-filter-bar";

const props = (over: Partial<QueueFilterBarProps> = {}): QueueFilterBarProps => ({
	counts: { all: 3, yours: 1, theirs: 1, decided: 1 },
	filter: "all",
	onFilterChange: jest.fn(),
	you: "Chase",
	partner: "Sam",
	query: "bea",
	onQueryChange: jest.fn(),
	searchOpen: true,
	onOpenSearch: jest.fn(),
	onCloseSearch: jest.fn(),
	onCancelSearch: jest.fn(),
	...over,
});

describe("QueueFilterBar search", () => {
	// The bug: folding on blur unmounted Cancel before its press landed (web
	// blurs on pointer-down, react-native-web starts the press ~50 ms later),
	// so Cancel kept the search as a pill instead of clearing it.
	it("does not fold when the field blurs, so Cancel is still there to press", async () => {
		const p = props();
		render(<QueueFilterBar {...p} />);

		fireEvent(screen.getByTestId("queue-search-input"), "blur");
		expect(p.onCloseSearch).not.toHaveBeenCalled();

		await userEvent.setup().press(screen.getByLabelText("Cancel search"));
		expect(p.onCancelSearch).toHaveBeenCalledTimes(1);
		expect(p.onCloseSearch).not.toHaveBeenCalled();
	});

	it("folds on Return", () => {
		const p = props();
		render(<QueueFilterBar {...p} />);
		fireEvent(screen.getByTestId("queue-search-input"), "submitEditing");
		expect(p.onCloseSearch).toHaveBeenCalledTimes(1);
	});

	it("folds when the keyboard hides, and stops listening once closed", () => {
		const listeners: Record<string, () => void> = {};
		const remove = jest.fn();
		const spy = jest.spyOn(Keyboard, "addListener").mockImplementation(((
			event: string,
			listener: () => void,
		) => {
			listeners[event] = listener;
			return { remove } as unknown as ReturnType<typeof Keyboard.addListener>;
		}) as typeof Keyboard.addListener);

		const p = props();
		const view = render(<QueueFilterBar {...p} />);
		act(() => listeners.keyboardDidHide());
		expect(p.onCloseSearch).toHaveBeenCalledTimes(1);

		view.rerender(<QueueFilterBar {...p} searchOpen={false} />);
		expect(remove).toHaveBeenCalled();
		spy.mockRestore();
	});
});
