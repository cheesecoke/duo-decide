import { act, render, screen, userEvent } from "@testing-library/react-native";
import * as React from "react";

import { Notice } from "@/components/ui/reusables/notice/notice";

// Behaviour and accessibility, not classes: nativewind/babel is off in jest.

const MESSAGE = "Steph just opened this in Google Calendar. Hold off so it doesn't land twice.";

describe("Notice", () => {
	// The react-native mock's Pressable is not an "accessible" host element, so
	// `getAllByRole` cannot see it; ask the host nodes for the prop instead.
	const buttons = () =>
		screen.root.findAll(
			(node: { type: unknown; props: Record<string, unknown> }) =>
				typeof node.type === "string" && node.props.role === "button",
		);

	/** `useReducedMotion` resolves a promise into state on mount. */
	async function flush() {
		await act(async () => {});
	}

	it("is a polite status by default", async () => {
		render(<Notice message={MESSAGE} />);
		await flush();

		expect(screen.getByTestId("notice").props.role).toBe("status");
		expect(screen.getByText(MESSAGE)).toBeTruthy();
	});

	it("is an alert when urgent", async () => {
		render(<Notice urgent message="We couldn't open Google Calendar." />);
		await flush();

		expect(screen.getByTestId("notice").props.role).toBe("alert");
	});

	it("shows a title above the message", async () => {
		render(<Notice title="Heads up" message={MESSAGE} />);
		await flush();

		expect(screen.getByText("Heads up")).toBeTruthy();
	});

	it("renders no buttons without actions", async () => {
		render(<Notice message={MESSAGE} />);
		await flush();

		expect(buttons()).toHaveLength(0);
	});

	it("runs an action when pressed", async () => {
		const addAnyway = jest.fn();
		const askFor = jest.fn();
		render(
			<Notice
				message={MESSAGE}
				actions={[
					{ label: "Add anyway", onPress: addAnyway },
					{ label: "Ask for it", onPress: askFor },
				]}
			/>,
		);
		await flush();

		await userEvent.setup().press(screen.getByLabelText("Add anyway"));

		expect(addAnyway).toHaveBeenCalledTimes(1);
		expect(askFor).not.toHaveBeenCalled();
		expect(buttons()).toHaveLength(2);
	});

	it("uses an action's own accessible label when it has one", async () => {
		render(
			<Notice
				message={MESSAGE}
				actions={[
					{ label: "Try again", accessibilityLabel: "Try opening it again", onPress: jest.fn() },
				]}
			/>,
		);
		await flush();

		expect(screen.getByLabelText("Try opening it again")).toBeTruthy();
	});

	it("does not run a disabled action, and says it is disabled", async () => {
		const onPress = jest.fn();
		render(<Notice message={MESSAGE} actions={[{ label: "Try again", onPress, disabled: true }]} />);
		await flush();

		const button = screen.getByLabelText("Try again");
		await userEvent.setup().press(button);

		expect(onPress).not.toHaveBeenCalled();
		expect(button.props.accessibilityState).toEqual({ disabled: true });
	});

	it("keeps only the first two actions", async () => {
		const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
		render(
			<Notice
				message={MESSAGE}
				actions={["One", "Two", "Three"].map((label) => ({ label, onPress: jest.fn() }))}
			/>,
		);
		await flush();

		expect(buttons()).toHaveLength(2);
		expect(screen.queryByLabelText("Three")).toBeNull();
		expect(warn).toHaveBeenCalledWith(expect.stringContaining("at most 2 actions"));
		warn.mockRestore();
	});
});
