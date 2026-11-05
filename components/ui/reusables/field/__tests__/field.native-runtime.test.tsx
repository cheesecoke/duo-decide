import { render, screen } from "@testing-library/react-native";
import * as React from "react";

import { Input, Textarea } from "@/components/ui/reusables/field/field";
import { compileNativeCss, nativeStyleOf, type NativeRule } from "@/test-utils/native-css";

/**
 * What a field's classes set on iOS, compiled the way Metro compiles them.
 *
 * iOS applies `lineHeight` to a single-line `UITextField` unevenly (the text
 * moves, the caret does not), so the value and the caret sat off-centre in
 * every one-line field. A single-line `Input` sets no line-height on native
 * and lets its padding make the height; a `Textarea` keeps one, because a
 * multi-line field needs it between lines.
 */

const SIZES = ["md", "sm"] as const;

let rules: Record<string, NativeRule>;

beforeAll(async () => {
	const classes: string[] = [];
	for (const size of SIZES) {
		const { unmount } = render(
			<>
				<Input accessibilityLabel="input" size={size} />
				<Textarea accessibilityLabel="textarea" size={size} />
			</>,
		);
		classes.push(
			screen.getByLabelText("input").props.className,
			screen.getByLabelText("textarea").props.className,
		);
		unmount();
	}
	({ rules } = await compileNativeCss({ content: [{ raw: classes.join(" ") }] }));
}, 30_000);

function nativeStyle(element: React.ReactElement) {
	const { unmount } = render(element);
	const style = nativeStyleOf(rules, screen.getByLabelText("field").props.className);
	unmount();
	return style;
}

describe("Input on iOS", () => {
	it.each(SIZES)("size %s sets no line-height, so text and caret centre", (size) => {
		const style = nativeStyle(<Input accessibilityLabel="field" size={size} />);

		expect(style).not.toHaveProperty("lineHeight");
		expect(style.fontSize).toBeGreaterThan(0);
	});

	// The padding makes the height now: the old rem padding plus the old
	// line-height, less the font's own line (~19 pt at 16, ~18 at 15), within
	// a point of where the field was.
	it.each([
		["md", 10],
		["sm", 8],
	] as const)("size %s pads to its old height", (size, padding) => {
		const style = nativeStyle(<Input accessibilityLabel="field" size={size} />);

		expect(style).toMatchObject({ paddingTop: padding, paddingBottom: padding });
	});
});

describe("Textarea on iOS", () => {
	it.each([
		["md", 22],
		["sm", 20],
	] as const)("size %s keeps its %i pt line-height", (size, lineHeight) => {
		const style = nativeStyle(<Textarea accessibilityLabel="field" size={size} />);

		expect(style.lineHeight).toBe(lineHeight);
	});
});
