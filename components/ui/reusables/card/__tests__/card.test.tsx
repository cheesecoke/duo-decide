import * as React from "react";
import { Text } from "react-native";
import { render, screen, userEvent } from "@testing-library/react-native";

import {
	Card,
	PERSON_WASH_OPACITY,
	TOGETHER_WASH_OPACITY,
} from "@/components/ui/reusables/card/card";

// NOTE: nativewind/babel is off under jest (see babel.config.js) and the
// Reanimated mock lands every animated value on its target immediately, so
// neither the wash nor the rail has a visible colour here. These tests cover
// structure, the state marker and press behaviour; the four states and the
// transition between them are covered by card.stories.tsx in Storybook.
//
// `userEvent` rather than `fireEvent`, for the reason spelled out in
// chip.test.tsx: fireEvent walks up to composite parents and would fire a
// handler the host element never accepted.

describe("Card", () => {
	it("renders its children", () => {
		render(
			<Card>
				<Text>Pizza or ramen?</Text>
			</Card>,
		);

		expect(screen.getByText("Pizza or ramen?")).toBeTruthy();
	});

	it("defaults to the neutral state", () => {
		render(<Card />);
		expect(screen.getByTestId("card-state-neutral")).toBeTruthy();
	});

	it.each(["a", "b", "together"] as const)("marks the %s state on the card", (state) => {
		render(<Card state={state} />);
		expect(screen.getByTestId(`card-state-${state}`)).toBeTruthy();
	});

	it("calls onPress when the card is pressed", async () => {
		const onPress = jest.fn();
		render(<Card state="a" onPress={onPress} />);

		await userEvent.setup().press(screen.getByTestId("card-state-a"));

		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("is a button only when onPress is given", () => {
		const { rerender } = render(<Card />);
		expect(screen.getByTestId("card-state-neutral").props.role).toBeUndefined();

		rerender(<Card onPress={() => {}} />);
		expect(screen.getByTestId("card-state-neutral").props.role).toBe("button");
	});

	// The wash opacities are the one card value the round-2 review moved
	// (tokens.md §10: 0.35 → 0.22 per person, 0.25 for `together`). Pinned
	// here because the layers themselves are invisible under the Reanimated
	// mock, so nothing else in this file would notice them drifting back.
	it("washes at the tokens.md §10 opacities", () => {
		expect(PERSON_WASH_OPACITY).toBe(0.22);
		expect(TOGETHER_WASH_OPACITY).toBe(0.25);
	});

	it("lets the caller add classes without losing the card's own", () => {
		render(<Card className="mt-4" />);

		expect(screen.getByTestId("card-state-neutral").props.className).toContain("mt-4");
		expect(screen.getByTestId("card-state-neutral").props.className).toContain("rounded-card");
	});
});
