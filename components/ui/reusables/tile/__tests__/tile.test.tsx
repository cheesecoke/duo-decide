import * as React from "react";
import { Text as RNText } from "react-native";
import { render, screen, userEvent } from "@testing-library/react-native";

import { Tile } from "@/components/ui/reusables/tile/tile";
import { NEUTRAL } from "@/theme/neutrals";

// NOTE: nativewind/babel is off under jest (see babel.config.js) and
// react-native-svg is a host-element mock (test-utils/react-native-svg-mock),
// so neither the tint nor the drawn arrow has an appearance here. These tests
// cover content, the press and the accessibility surface; the three tints and
// the illustration slot are covered by tile.stories.tsx in Storybook.

describe("Tile", () => {
	it("renders its title", () => {
		render(<Tile title="Decision Queue" tint="a" onPress={() => {}} />);
		expect(screen.getByText("Decision Queue")).toBeTruthy();
	});

	it("renders a subtitle when given one", () => {
		render(<Tile title="Decision Queue" subtitle="3 waiting on you" tint="a" onPress={() => {}} />);
		expect(screen.getByText("3 waiting on you")).toBeTruthy();
	});

	it("calls onPress when pressed", async () => {
		const onPress = jest.fn();
		render(<Tile title="Decision Queue" tint="a" onPress={onPress} />);

		await userEvent.setup().press(screen.getByLabelText("Decision Queue"));

		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("reads out as one button carrying both lines", () => {
		render(<Tile title="Decision Queue" subtitle="3 waiting on you" tint="a" onPress={() => {}} />);

		const tile = screen.getByLabelText("Decision Queue. 3 waiting on you");
		expect(tile.props.role).toBe("button");
	});

	it("renders whatever the illustration slot is given", () => {
		render(
			<Tile
				title="History"
				tint="surface-2"
				onPress={() => {}}
				illustration={<RNText>a fish</RNText>}
			/>,
		);

		expect(screen.getByText("a fish")).toBeTruthy();
	});

	it("draws the arrow rather than typing a glyph", () => {
		render(<Tile title="History" tint="b" onPress={() => {}} />);

		// Two stroked paths, not a "↗" text node — see the note in tile.tsx.
		expect(screen.UNSAFE_getAllByType("Path" as never)).toHaveLength(2);
		expect(screen.queryByText("↗")).toBeNull();
	});

	it("colours both arrow paths from one place", () => {
		render(<Tile title="History" tint="b" onPress={() => {}} />);

		// Each path defers to `currentColor`, and the Svg's `color` is what
		// resolves it — so recolouring the arrow is one prop, not two.
		for (const path of screen.UNSAFE_getAllByType("Path" as never)) {
			expect(path.props.stroke).toBe("currentColor");
		}
		expect(screen.UNSAFE_getByType("Svg" as never).props.color).toBe(NEUTRAL.ink);
	});
});
