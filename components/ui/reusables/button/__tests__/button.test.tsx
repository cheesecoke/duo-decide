import * as React from "react";
import { render, screen, userEvent } from "@testing-library/react-native";

import { Button, buttonVariants } from "@/components/ui/reusables/button/button";
import { CONTROL_MAX_FONT_SCALE, Text } from "@/components/ui/reusables/text/text";

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

describe("Button under Larger Text", () => {
	// Callers pin a button's height (`h-12`, `h-14`), so its label is capped
	// at 1.3× rather than clipping at the largest iOS text sizes.
	it("caps its label's Dynamic Type scale", () => {
		render(
			<Button onPress={jest.fn()}>
				<Text>Save</Text>
			</Button>,
		);

		expect(screen.getByText("Save").props.maxFontSizeMultiplier).toBe(CONTROL_MAX_FONT_SCALE);
	});

	it("lets a label ask for its own cap", () => {
		render(
			<Button onPress={jest.fn()}>
				<Text maxFontSizeMultiplier={1.1}>Save</Text>
			</Button>,
		);

		expect(screen.getByText("Save").props.maxFontSizeMultiplier).toBe(1.1);
	});

	it("leaves text outside a button at the full scale", () => {
		render(<Text>Body copy</Text>);

		expect(screen.getByText("Body copy").props.maxFontSizeMultiplier).toBeUndefined();
	});
});

/**
 * Tripwires for two upstream habits `rnr add` would bring back. Neither has
 * a behaviour to assert: class shadows draw nothing on native (elevation is
 * `SHADOW.*` from theme/shadows.ts), and `dark:` follows the phone's system
 * appearance on native although Duo is light-only.
 */
const VARIANTS = ["default", "destructive", "outline", "secondary", "ghost", "link"] as const;

describe("buttonVariants on native", () => {
	it.each(VARIANTS)("variant %s carries no class shadow and no dark: class", (variant) => {
		const classes = buttonVariants({ variant });
		expect(classes).not.toMatch(/(^|\s)shadow-/);
		expect(classes).not.toMatch(/(^|\s|:)dark:/);
	});
});
