import * as React from "react";
import { StyleSheet } from "react-native";
import { render, screen } from "@testing-library/react-native";

import {
	Body,
	Caption,
	Display,
	Eyebrow,
	Numeral,
	Title,
} from "@/components/ui/reusables/headline/headline";

// NOTE: nativewind/babel is off under jest (see babel.config.js), so the
// class-driven sizes and colours carry no style here — the type scale itself
// is checked in headline.stories.tsx. What IS asserted below is the pair of
// values that are real style props precisely because they have to survive
// class merging: the Display.Strong weight and the Numeral font variant.

/** The mocked StyleSheet.flatten is a jest.fn, so flatten arrays by hand. */
function flattenStyle(style: unknown): Record<string, unknown> {
	if (Array.isArray(style)) return Object.assign({}, ...style.map(flattenStyle));
	return (style ?? {}) as Record<string, unknown>;
}

describe("headline type scale", () => {
	it.each([
		["Eyebrow", Eyebrow],
		["Title", Title],
		["Body", Body],
		["Caption", Caption],
		["Display", Display],
		["Numeral", Numeral],
	] as const)("%s renders its children", (label, Component) => {
		render(<Component>{label} text</Component>);
		expect(screen.getByText(`${label} text`)).toBeTruthy();
	});

	it("StyleSheet is mocked, so the manual flatten above is the real one", () => {
		expect(jest.isMockFunction(StyleSheet.flatten)).toBe(true);
	});
});

describe("Display as the page heading", () => {
	// PLAN-3 final review I5. Before this, `role`/`aria-level` were the call
	// site's job and only two of them did it, so Welcome and all three tabs
	// had no h1 at all.
	it("is a level-1 heading with nothing passed", () => {
		render(<Display>What are we deciding today?</Display>);

		const heading = screen.getByRole("heading");
		expect(heading.props["aria-level"]).toBe(1);
		expect(screen.getByText("What are we deciding today?")).toBeTruthy();
	});

	it("lets a caller override the level", () => {
		render(<Display aria-level={2}>A section</Display>);

		expect(screen.getByRole("heading").props["aria-level"]).toBe(2);
	});

	// A Display used for something that is not a page heading — a hero
	// numeral, a word inside a card — says so and stops being one.
	it("lets a caller override the role", () => {
		render(<Display role="none">404</Display>);

		expect(screen.queryByRole("heading")).toBeNull();
		expect(screen.getByText("404")).toBeTruthy();
	});
});

describe("Display.Strong", () => {
	it("renders at weight 700 inside a light Display", () => {
		render(
			<Display>
				What are we <Display.Strong>deciding today?</Display.Strong>
			</Display>,
		);

		const strong = screen.getByText("deciding today?");
		expect(flattenStyle(strong.props.style).fontWeight).toBe("700");
	});

	it("keeps weight 700 when the caller passes a style of their own", () => {
		render(
			<Display>
				<Display.Strong style={{ letterSpacing: -0.5 }}>deciding today?</Display.Strong>
			</Display>,
		);

		const style = flattenStyle(screen.getByText("deciding today?").props.style);
		expect(style.fontWeight).toBe("700");
		expect(style.letterSpacing).toBe(-0.5);
	});

	it("leaves the surrounding Display alone", () => {
		render(
			<Display>
				What are we <Display.Strong>deciding today?</Display.Strong>
			</Display>,
		);

		// [0] is the Display's own Text, [1] the Strong nested inside it. Only
		// the nested one may be bold, or the "ONE bold phrase" rule of
		// tokens.md §5 has no effect.
		const [display, strong] = screen.UNSAFE_getAllByType("Text" as never);
		expect(flattenStyle(display.props.style).fontWeight).toBeUndefined();
		expect(flattenStyle(strong.props.style).fontWeight).toBe("700");
	});
});

describe("Numeral", () => {
	it("asks for tabular figures so counts do not jitter", () => {
		render(<Numeral>12</Numeral>);

		expect(flattenStyle(screen.getByText("12").props.style).fontVariant).toEqual(["tabular-nums"]);
	});
});
