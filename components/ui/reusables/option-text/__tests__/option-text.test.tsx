import * as React from "react";
import { Linking, Pressable } from "react-native";
import { render, screen, userEvent } from "@testing-library/react-native";

import { OptionText } from "@/components/ui/reusables/option-text/option-text";

// Behaviour and accessibility only — nativewind/babel is off under jest, so
// the link's colour and underline are covered by option-text.stories.tsx.

const URL = "https://www.psychologytoday.com/us/therapists/alexa-sharf-boulder-co/1234567";

describe("OptionText", () => {
	let openURL: jest.SpyInstance;

	beforeEach(() => {
		openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
	});

	afterEach(() => openURL.mockRestore());

	it("renders plain text as it was written", () => {
		render(<OptionText text="Coffee/Boulder Creek Festival" />);

		expect(screen.getByText("Coffee/Boulder Creek Festival")).toBeTruthy();
		expect(screen.queryByRole("link")).toBeNull();
	});

	it("shows a link as its hostname, and names it by the full URL", () => {
		render(<OptionText text={`Alexa Sharf: ${URL}`} />);

		const link = screen.getByRole("link");
		expect(link.props.accessibilityLabel).toBe(URL);
		expect(screen.getByText(/psychologytoday\.com/)).toBeTruthy();
		expect(screen.queryByText(new RegExp(URL.replace(/[.?/]/g, "\\$&")))).toBeNull();
		expect(screen.getByText(/^Alexa Sharf: /)).toBeTruthy();
	});

	it("opens the URL when the link is pressed", async () => {
		render(<OptionText text={`Alexa Sharf: ${URL}`} />);

		await userEvent.setup().press(screen.getByRole("link"));

		expect(openURL).toHaveBeenCalledWith(URL);
	});

	it("opens a bare www. link over https", async () => {
		render(<OptionText text="www.yelp.com/biz/x" />);

		await userEvent.setup().press(screen.getByRole("link"));

		expect(openURL).toHaveBeenCalledWith("https://www.yelp.com/biz/x");
	});

	it("does not press the row it sits in", async () => {
		const onRow = jest.fn();
		render(
			<Pressable testID="row" onPress={onRow}>
				<OptionText text={`Alexa Sharf: ${URL}`} />
			</Pressable>,
		);

		const user = userEvent.setup();
		await user.press(screen.getByRole("link"));
		expect(openURL).toHaveBeenCalledTimes(1);
		expect(onRow).not.toHaveBeenCalled();

		await user.press(screen.getByTestId("row"));
		expect(onRow).toHaveBeenCalledTimes(1);
	});

	it("gives every link its own target", async () => {
		render(<OptionText text="https://a.com or https://b.org" />);

		const links = screen.getAllByRole("link");
		expect(links.map((link) => link.props.accessibilityLabel)).toEqual([
			"https://a.com",
			"https://b.org",
		]);

		await userEvent.setup().press(links[1]);
		expect(openURL).toHaveBeenCalledWith("https://b.org");
	});
});
