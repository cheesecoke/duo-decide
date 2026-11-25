import * as React from "react";
import { Text } from "react-native";
import { render, screen, userEvent } from "@testing-library/react-native";

import { FilterChip } from "@/components/ui/reusables/filter-chip/filter-chip";

// nativewind/babel is off under jest (babel.config.js): behaviour and
// accessibility only; the look is in filter-chip.stories.tsx.

describe("FilterChip", () => {
	it("is a button named by its label and count", () => {
		render(<FilterChip label="Your turn" count={2} onPress={() => {}} />);
		expect(screen.getByLabelText("Your turn, 2 decisions").props.role).toBe("button");
	});

	it("uses the singular for one", () => {
		render(<FilterChip label="Decided" count={1} onPress={() => {}} />);
		expect(screen.getByLabelText("Decided, 1 decision")).toBeTruthy();
	});

	it("takes its own noun", () => {
		render(<FilterChip label="Mine" count={3} noun={["card", "cards"]} onPress={() => {}} />);
		expect(screen.getByLabelText("Mine, 3 cards")).toBeTruthy();
	});

	it("reports selected, not checked — it is a toggle in a single-select row", () => {
		render(<FilterChip label="Your turn" count={2} selected onPress={() => {}} />);
		const chip = screen.getByLabelText("Your turn, 2 decisions");
		expect(chip.props.accessibilityState).toEqual({ selected: true });
		expect(chip.props.role).toBe("button");
	});

	it("stays pressable at a count of 0", async () => {
		const onPress = jest.fn();
		render(<FilterChip label="Decided" count={0} onPress={onPress} />);
		await userEvent.setup().press(screen.getByLabelText("Decided, 0 decisions"));
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("hides its leading mark from assistive tech", () => {
		render(<FilterChip label="Your turn" count={1} leading={<Text>fish</Text>} onPress={() => {}} />);
		expect(screen.queryByText("fish")).toBeNull();
		expect(screen.getByText("fish", { includeHiddenElements: true })).toBeTruthy();
	});
});
