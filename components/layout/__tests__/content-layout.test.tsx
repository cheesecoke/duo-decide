import * as React from "react";
import { Text } from "react-native";
import { render } from "@testing-library/react-native";

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
