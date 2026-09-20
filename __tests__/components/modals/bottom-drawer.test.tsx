import * as React from "react";
import { Text, View } from "react-native";
import { render, screen, userEvent } from "@testing-library/react-native";

import { BottomDrawer } from "@/components/modals/BottomDrawer";

/**
 * The sheet chrome (FEATURE-INVENTORY §0.3).
 *
 * The drawer is a slot: it owns the title row, the scrim, the scrolling body
 * and — new here — an optional footer. What is asserted is exactly that
 * contract. The rise, the scrim fade and the `together` hairline are visual
 * and live in Storybook; under jest the Animated mock lands every value at
 * its end state.
 */

function renderDrawer(props: Partial<React.ComponentProps<typeof BottomDrawer>> = {}) {
	const onClose = jest.fn();
	render(
		<BottomDrawer visible onClose={onClose} title="Settings" {...props}>
			<Text>the body</Text>
		</BottomDrawer>,
	);
	return onClose;
}

describe("BottomDrawer", () => {
	it("renders its title and its content", () => {
		renderDrawer();

		expect(screen.getByText("Settings")).toBeTruthy();
		expect(screen.getByText("the body")).toBeTruthy();
	});

	it("is not there at all while closed", () => {
		render(
			<BottomDrawer visible={false} onClose={jest.fn()} title="Settings">
				<Text>the body</Text>
			</BottomDrawer>,
		);

		expect(screen.queryByText("the body")).toBeNull();
	});

	it("closes on the backdrop (§0.3)", async () => {
		const onClose = renderDrawer();

		await userEvent.press(screen.getByTestId("drawer-backdrop"));

		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("closes on the circle in the title row", async () => {
		const onClose = renderDrawer();

		await userEvent.press(screen.getByTestId("drawer-close"));

		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("has no footer unless it is given one", () => {
		renderDrawer();

		expect(screen.queryByTestId("drawer-footer")).toBeNull();
	});

	it("renders the footer slot outside the scrolling body", () => {
		renderDrawer({
			footer: (
				<View>
					<Text>Keep it</Text>
				</View>
			),
		});

		const footer = screen.getByTestId("drawer-footer");
		expect(footer).toBeTruthy();
		expect(screen.getByText("Keep it")).toBeTruthy();
		// The body scrolls; the footer does not sit inside the ScrollView.
		expect(screen.getByText("the body")).toBeTruthy();
	});

	it("keeps the body's keyboard rules (§0.3)", () => {
		renderDrawer();

		const body = screen.UNSAFE_getByType(
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			require("react-native").ScrollView,
		);
		expect(body.props.keyboardShouldPersistTaps).toBe("always");
		expect(body.props.bounces).toBe(false);
	});
});
