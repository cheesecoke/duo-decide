import * as React from "react";
import { Text } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import ContentLayout from "@/components/layout/ContentLayout";
import { KEYBOARD_GAP } from "@/components/layout/keyboard";

type Node = ReturnType<typeof render>["UNSAFE_root"];

// eslint-disable-next-line @typescript-eslint/no-require-imports
const RN = require("react-native");

/** The handler ContentLayout registered for a keyboard event, newest first. */
function keyboardHandler(name: string): (event: unknown) => void {
	const calls = (RN.Keyboard.addListener as jest.Mock).mock.calls.filter(
		([event]) => event === name,
	);
	expect(calls.length).toBeGreaterThan(0);
	return calls[calls.length - 1][1];
}

/** An iPhone 14-sized keyboard (844 pt window): 336 pt tall, top edge at 508. */
const SHOWN = {
	endCoordinates: { screenX: 0, screenY: 508, width: 390, height: 336 },
	startCoordinates: { screenX: 0, screenY: 844, width: 390, height: 336 },
	duration: 250,
	easing: "keyboard",
	isEventFromThisApp: true,
};
const HIDDEN = {
	...SHOWN,
	endCoordinates: { screenX: 0, screenY: 844, width: 390, height: 336 },
};

const outer = () => screen.getByTestId("content-layout-keyboard");
const scroll = (root: Node) =>
	root.findAll(
		(n: Node) =>
			(n.type as unknown) === "ScrollView" &&
			(n.props as { keyboardShouldPersistTaps?: string }).keyboardShouldPersistTaps === "handled",
	)[0];

function renderForm() {
	return render(
		<ContentLayout keyboardAware>
			<Text>form</Text>
		</ContentLayout>,
		{ createNodeMock: () => ({}) },
	);
}

/**
 * `keyboardAware` is what keeps a pinned submit button reachable on iOS. It
 * lifts by the keyboard's own frame (keyboard.ts), not a measured offset:
 * build 9's `measureInWindow` offset came up short by the page sheet's top
 * offset, which left Sign In / Send Reset Link just under the keyboard.
 */
describe("ContentLayout keyboardAware", () => {
	it("wraps the content in a tap-through scroll view that keeps a short form full height", () => {
		const { UNSAFE_root } = renderForm();

		expect(
			UNSAFE_root.findAll((n: Node) => (n.type as unknown) === "KeyboardAvoidingView"),
		).toHaveLength(0);
		expect(scroll(UNSAFE_root).props.contentContainerStyle).toMatchObject({
			flexGrow: 1,
			paddingBottom: 24,
		});
		expect(outer().props.style).toMatchObject({ paddingBottom: 0 });
	});

	it("listens for the keyboard on iOS", () => {
		renderForm();
		const names = (RN.Keyboard.addListener as jest.Mock).mock.calls.map(([name]) => name);
		expect(names).toEqual(
			expect.arrayContaining(["keyboardWillShow", "keyboardWillChangeFrame", "keyboardWillHide"]),
		);
	});

	it("lifts by exactly the keyboard's reach, and swaps the bottom padding for the 12 pt gap", () => {
		const { UNSAFE_root } = renderForm();

		act(() => keyboardHandler("keyboardWillShow")(SHOWN));

		expect(outer().props.style).toMatchObject({ paddingBottom: 336 });
		expect(scroll(UNSAFE_root).props.contentContainerStyle).toMatchObject({
			paddingBottom: KEYBOARD_GAP,
		});
	});

	it("follows a frame change (the QuickType bar) and comes back down on hide", () => {
		const { UNSAFE_root } = renderForm();

		act(() => keyboardHandler("keyboardWillShow")(SHOWN));
		act(() =>
			keyboardHandler("keyboardWillChangeFrame")({
				...SHOWN,
				endCoordinates: { screenX: 0, screenY: 464, width: 390, height: 380 },
			}),
		);
		expect(outer().props.style).toMatchObject({ paddingBottom: 380 });

		act(() => keyboardHandler("keyboardWillHide")(HIDDEN));
		expect(outer().props.style).toMatchObject({ paddingBottom: 0 });
		expect(scroll(UNSAFE_root).props.contentContainerStyle).toMatchObject({ paddingBottom: 24 });
	});

	it("moves with the keyboard's own duration and curve, once per change", () => {
		renderForm();

		act(() => keyboardHandler("keyboardWillShow")(SHOWN));
		act(() => keyboardHandler("keyboardWillChangeFrame")(SHOWN));

		expect(RN.LayoutAnimation.configureNext).toHaveBeenCalledTimes(1);
		expect(RN.LayoutAnimation.configureNext).toHaveBeenCalledWith({
			duration: 250,
			update: { duration: 250, type: "keyboard" },
		});
	});

	it("lands the lift without animating under reduced motion", async () => {
		(RN.AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValueOnce(true);
		renderForm();
		await act(async () => {});

		act(() => keyboardHandler("keyboardWillShow")(SHOWN));

		expect(outer().props.style).toMatchObject({ paddingBottom: 336 });
		expect(RN.LayoutAnimation.configureNext).not.toHaveBeenCalled();
	});

	it("stops listening on unmount", () => {
		const remove = jest.fn();
		(RN.Keyboard.addListener as jest.Mock).mockImplementation(() => ({ remove }));
		const { unmount } = renderForm();
		unmount();
		expect(remove).toHaveBeenCalledTimes(3);
		(RN.Keyboard.addListener as jest.Mock).mockImplementation(() => ({ remove: jest.fn() }));
	});

	it("does nothing on Android, which resizes the window itself", () => {
		RN.Platform.OS = "android";
		try {
			renderForm();
			expect(RN.Keyboard.addListener).not.toHaveBeenCalled();
		} finally {
			RN.Platform.OS = "ios";
		}
	});

	it("is off by default", () => {
		render(
			<ContentLayout>
				<Text>page</Text>
			</ContentLayout>,
		);
		expect(screen.queryByTestId("content-layout-keyboard")).toBeNull();
		expect(RN.Keyboard.addListener).not.toHaveBeenCalled();
	});
});

/**
 * A form too tall to sit above the keyboard whole (sign-up on a small
 * iPhone) scrolls, and the focused field is kept in view — the same
 * reveal-on-focus the bottom drawer has (#39).
 */
describe("ContentLayout keyboardAware — reveal-on-focus (iOS)", () => {
	const scrollTo: jest.Mock = RN.ScrollView.mockScrollTo;
	const focused: jest.Mock = RN.TextInput.State.currentlyFocusedInput;

	function focusFieldAt(y: number, height = 48) {
		focused.mockReturnValue({
			measureLayout: jest.fn((_node: unknown, onSuccess: (...box: number[]) => void) =>
				onSuccess(0, y, 330, height),
			),
		});
	}

	function layoutBody(root: Node, height: number) {
		fireEvent(scroll(root), "layout", {
			nativeEvent: { layout: { x: 0, y: 0, width: 390, height } },
		});
	}

	beforeEach(() => scrollTo.mockClear());
	afterEach(() => focused.mockReturnValue(null));

	it("scrolls a focused field below the visible part into view", () => {
		const { UNSAFE_root } = renderForm();
		layoutBody(UNSAFE_root, 300);
		focusFieldAt(400);

		fireEvent(screen.getByTestId("content-layout-fields"), "focus");

		// 400 + 48 + 16 margin - 300 visible.
		expect(scrollTo).toHaveBeenCalledWith({ y: 164, animated: true });
	});

	it("re-reveals when the keyboard landing shrinks the body under a focused field", () => {
		const { UNSAFE_root } = renderForm();
		layoutBody(UNSAFE_root, 640);
		focusFieldAt(400);
		fireEvent(screen.getByTestId("content-layout-fields"), "focus");
		expect(scrollTo).not.toHaveBeenCalled();

		layoutBody(UNSAFE_root, 300);

		expect(scrollTo).toHaveBeenCalledWith({ y: 164, animated: true });
	});

	it("leaves a field that is already in view alone", () => {
		const { UNSAFE_root } = renderForm();
		layoutBody(UNSAFE_root, 300);
		focusFieldAt(40);

		fireEvent(screen.getByTestId("content-layout-fields"), "focus");

		expect(scrollTo).not.toHaveBeenCalled();
	});
});

describe("ContentLayout scrollable (tab screens)", () => {
	it("insets itself by the keyboard and lets the first tap through (inline edits)", () => {
		const { UNSAFE_root } = render(
			<ContentLayout scrollable>
				<Text>list</Text>
			</ContentLayout>,
		);
		const views = UNSAFE_root.findAll(
			(n: Node) => (n.type as unknown) === "ScrollView" && typeof n.type === "string",
		);
		expect(views[0].props.automaticallyAdjustKeyboardInsets).toBe(true);
		expect(views[0].props.keyboardShouldPersistTaps).toBe("handled");
	});
});
