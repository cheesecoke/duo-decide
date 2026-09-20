import * as React from "react";
import { Text } from "react-native";
import { render, screen } from "@testing-library/react-native";

import ContentLayout from "@/components/layout/ContentLayout";

/**
 * `ContentLayout` wraps every screen in the app, so the one thing worth
 * holding it to is the branch: `scrollable` picks a `ScrollView`, the default
 * picks a plain `View`. The padding and the 786 cap are classes, and classes
 * are not styled under jest (see babel.config.js) — Storybook and the preview
 * cover those.
 */

describe("ContentLayout", () => {
	it("renders its children in a plain View by default", () => {
		render(
			<ContentLayout>
				<Text>body</Text>
			</ContentLayout>,
		);

		expect(screen.getByText("body")).toBeTruthy();
		expect(screen.UNSAFE_queryAllByType("ScrollView" as never)).toHaveLength(0);
	});

	it("renders its children in a ScrollView when scrollable", () => {
		render(
			<ContentLayout scrollable>
				<Text>body</Text>
			</ContentLayout>,
		);

		expect(screen.getByText("body")).toBeTruthy();
		expect(screen.UNSAFE_queryAllByType("ScrollView" as never)).toHaveLength(1);
	});
});
