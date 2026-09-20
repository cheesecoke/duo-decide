import * as React from "react";
import { render, screen, userEvent } from "@testing-library/react-native";

import { Button, buttonVariants } from "@/components/ui/reusables/button/button";
import { Text } from "@/components/ui/reusables/text/text";

/**
 * The vendored Button, and the one thing Duo changed about it.
 *
 * React Native Reusables ships each size as a height plus an `sm:` override
 * that shrinks the control on a ≥640 px viewport. A caller's own height
 * (`h-14` on a sheet footer) lands in the *unprefixed* height group, so
 * tailwind-merge keeps both — and above 640 px the media rule wins and the
 * button renders at the shadcn size instead of the one the sheet asked for.
 *
 * Duo has no responsive shrink anywhere, so the overrides are gone. This test
 * is the tripwire: `rnr add` would put them straight back.
 */

const SIZES = ["default", "sm", "lg", "icon"] as const;

describe("buttonVariants", () => {
	it.each(SIZES)("size %s carries no responsive override", (size) => {
		expect(buttonVariants({ size })).not.toMatch(/(^|\s)sm:/);
	});

	it.each(SIZES)("size %s still sets a height", (size) => {
		expect(buttonVariants({ size })).toMatch(/(^|\s)h-/);
	});

	it("lets a caller's explicit height be the last word", () => {
		// What a sheet footer does: `size` for the padding, its own height.
		const classes = buttonVariants({ size: "default" });
		expect(classes).toContain("h-10");
		expect(classes).not.toContain("sm:h-9");
	});
});

describe("Button", () => {
	it("presses", async () => {
		const onPress = jest.fn();
		render(
			<Button accessibilityLabel="Create Decision" onPress={onPress}>
				<Text>Create Decision</Text>
			</Button>,
		);

		await userEvent.press(screen.getByLabelText("Create Decision"));

		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("does not press while disabled", async () => {
		const onPress = jest.fn();
		render(
			<Button accessibilityLabel="Create Decision" disabled onPress={onPress}>
				<Text>Create Decision</Text>
			</Button>,
		);

		await userEvent.press(screen.getByLabelText("Create Decision"));

		expect(onPress).not.toHaveBeenCalled();
	});
});
