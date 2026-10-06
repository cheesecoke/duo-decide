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
 *
 * The SafeAreaView is the exception, and it is asserted here because a class
 * would *not* work on it: React Native's own SafeAreaView has no NativeWind
 * interop registration, so a `className` is dropped without a warning and the
 * middle layer of every screen silently loses `flex: 1`. That failure is
 * invisible to a class-based test, which is exactly why it is a style.
 */

describe("ContentLayout", () => {
	it("gives the SafeAreaView a real flex style, not a class", () => {
		render(
			<ContentLayout>
				<Text>body</Text>
			</ContentLayout>,
		);

		const safeArea = screen.UNSAFE_getByType("SafeAreaView" as never);
		expect(safeArea.props.style).toEqual({ flex: 1 });
		expect(safeArea.props.className).toBeUndefined();
	});

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

	it("pads the scroll CONTENT, not the viewport, and reserves the footer's room", () => {
		render(
			<ContentLayout scrollable footerInset={76}>
				<Text>body</Text>
			</ContentLayout>,
		);

		const scroll = screen.UNSAFE_getByType("ScrollView" as never);
		// v1's 18/30/24 plus the footer: padding on the ScrollView's own style
		// would clip the bottom by the same amount it meant to protect.
		expect(scroll.props.contentContainerStyle).toEqual({
			paddingTop: 18,
			paddingHorizontal: 30,
			paddingBottom: 24 + 76,
		});
		expect(scroll.props.style?.paddingBottom).toBeUndefined();
	});

	it("reserves nothing when no footer is declared", () => {
		render(
			<ContentLayout scrollable>
				<Text>body</Text>
			</ContentLayout>,
		);

		const scroll = screen.UNSAFE_getByType("ScrollView" as never);
		expect(scroll.props.contentContainerStyle.paddingBottom).toBe(24);
	});
});
