import * as React from "react";
import { Linking } from "react-native";
import { render, screen, userEvent, within } from "@testing-library/react-native";

import {
	DecidedOptionRow,
	OptionMark,
	OptionRowContent,
} from "@/components/ui/reusables/option-row/option-row";

// Behaviour and accessibility only — nativewind/babel is off under jest, so
// the tint, radius and tick colour are covered by option-row.stories.tsx.

const URL = "https://rodeo-labs.com/pages/phantom-canyon";

describe("OptionMark", () => {
	it("draws a tick when checked", () => {
		render(<OptionMark checked />);

		expect(screen.getByTestId("option-row-mark-checked")).toBeTruthy();
		expect(screen.getByTestId("option-row-tick")).toBeTruthy();
		expect(screen.queryByTestId("option-row-mark-empty")).toBeNull();
	});

	it("draws an empty ring when not", () => {
		render(<OptionMark checked={false} />);

		expect(screen.getByTestId("option-row-mark-empty")).toBeTruthy();
		expect(screen.queryByTestId("option-row-tick")).toBeNull();
	});
});

describe("OptionRowContent", () => {
	it("renders the title and its mark", () => {
		render(<OptionRowContent title="Tacos" checked />);

		expect(screen.getByText("Tacos")).toBeTruthy();
		expect(screen.getByTestId("option-row-mark-checked")).toBeTruthy();
	});
});

describe("DecidedOptionRow", () => {
	let openURL: jest.SpyInstance;

	beforeEach(() => {
		openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
	});

	afterEach(() => openURL.mockRestore());

	it("shows the winner with the tick, in either seat", () => {
		render(<DecidedOptionRow testID="winner" title="Farmers market" seat="b" />);

		const row = screen.getByTestId("winner");
		expect(within(row).getByText("Farmers market")).toBeTruthy();
		expect(within(row).getByTestId("option-row-tick")).toBeTruthy();
	});

	it("is read-only: no control, no role, no name of its own", () => {
		render(<DecidedOptionRow testID="winner" title="Tacos" />);

		expect(screen.getByTestId("winner").props.onPress).toBeUndefined();
		expect(screen.queryByRole("button")).toBeNull();
		expect(screen.queryByRole("radio")).toBeNull();
		expect(screen.queryByRole("checkbox")).toBeNull();
		expect(screen.queryByLabelText("Tacos")).toBeNull();
	});

	it("keeps a link inside it tappable", async () => {
		render(<DecidedOptionRow title={`Phantom Canyon (${URL})`} />);

		const link = screen.getByRole("link");
		expect(link.props.accessibilityLabel).toBe(URL);

		await userEvent.setup().press(link);
		expect(openURL).toHaveBeenCalledWith(URL);
	});
});
