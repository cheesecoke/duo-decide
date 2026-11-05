import * as React from "react";
import { Text } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";

import ContentLayout from "@/components/layout/ContentLayout";

type Node = ReturnType<typeof render>["UNSAFE_root"];

/**
 * `keyboardAware` is what keeps a pinned submit button reachable on iOS.
 * There is no keyboard under jest, so this pins the structure that makes it
 * work: a KeyboardAvoidingView around a ScrollView that lets taps through.
 */
describe("ContentLayout keyboardAware", () => {
	it("wraps the content in a keyboard-avoiding, tap-through scroll view", () => {
		const { UNSAFE_root } = render(
			<ContentLayout keyboardAware>
				<Text>form</Text>
			</ContentLayout>,
		);

		const avoiding = UNSAFE_root.findAll((n: Node) => (n.type as unknown) === "KeyboardAvoidingView");
		expect(avoiding).toHaveLength(1);
		const scroll = avoiding[0].findAll(
			(n: Node) =>
				(n.props as { keyboardShouldPersistTaps?: string }).keyboardShouldPersistTaps === "handled",
		);
		expect(scroll.length).toBeGreaterThan(0);
		expect(scroll[0].props.contentContainerStyle).toMatchObject({ flexGrow: 1 });
	});

	it("is off by default", () => {
		const { UNSAFE_root } = render(
			<ContentLayout>
				<Text>page</Text>
			</ContentLayout>,
		);
		expect(
			UNSAFE_root.findAll((n: Node) => (n.type as unknown) === "KeyboardAvoidingView"),
		).toHaveLength(0);
	});
});

/**
 * KeyboardAvoidingView measures itself relative to its parent, so on a screen
 * that starts below the top of the window (an iOS sheet, or under the
 * header) its lift comes up short by that much. The layout measures where it
 * really is and hands that over as the offset.
 */
describe("ContentLayout keyboard offset", () => {
	const keyboardOffset = (root: Node) =>
		root.findAll((n: Node) => (n.type as unknown) === "KeyboardAvoidingView")[0].props
			.keyboardVerticalOffset;

	it("offsets the lift by where the layout sits in the window", () => {
		const { UNSAFE_root } = render(
			<ContentLayout keyboardAware>
				<Text>form</Text>
			</ContentLayout>,
			{
				createNodeMock: () => ({
					measureInWindow: (cb: (x: number, y: number) => void) => cb(0, 126),
				}),
			},
		);
		expect(keyboardOffset(UNSAFE_root)).toBe(0);

		const outer = UNSAFE_root.findAll(
			(n: Node) => typeof n.type === "string" && typeof n.props.onLayout === "function",
		)[0];
		act(() => {
			fireEvent(outer, "layout", { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 700 } } });
		});

		expect(keyboardOffset(UNSAFE_root)).toBe(126);
	});

	it("insets the plain scrolling layout by the keyboard (inline edits)", () => {
		const { UNSAFE_root } = render(
			<ContentLayout scrollable>
				<Text>list</Text>
			</ContentLayout>,
		);
		const scroll = UNSAFE_root.findAll(
			(n: Node) => (n.type as unknown) === "ScrollView" && typeof n.type === "string",
		);
		expect(scroll[0].props.automaticallyAdjustKeyboardInsets).toBe(true);
	});
});
