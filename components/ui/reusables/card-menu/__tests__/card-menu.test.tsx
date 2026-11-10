import * as React from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { act, fireEvent, render, screen, userEvent } from "@testing-library/react-native";
import { NavigationContext } from "@react-navigation/native";

import {
	CardMenu,
	CardMenuTrigger,
	TrashGlyph,
	placePanel,
	useCardMenu,
	type CardMenuItem,
} from "@/components/ui/reusables/card-menu/card-menu";

/**
 * The `⋯` overflow. The trigger and the panel are two components sharing one
 * `useCardMenu`, so everything here mounts both — a test that rendered only
 * the panel would be testing markup, not the menu.
 *
 * Under jest nothing hit-tests: a press on the trigger reaches the trigger
 * even while the backdrop is up. On a phone that same tap lands on the
 * backdrop, which closes the menu just the same — so "⋯ again closes it" is
 * asserted both ways, through the trigger and through the backdrop.
 */
function Harness({
	items,
	testID = "card-menu",
	label = "More",
	onUnderneath,
}: {
	items: readonly CardMenuItem[];
	testID?: string;
	label?: string;
	/** Something under the menu that must not fire on an outside tap. */
	onUnderneath?: () => void;
}) {
	const menu = useCardMenu();

	return (
		<View>
			<Pressable accessibilityLabel={`${label} card`} onPress={onUnderneath}>
				<Text>Card body</Text>
			</Pressable>
			<CardMenuTrigger menu={menu} label={label} />
			<CardMenu menu={menu} items={items} testID={testID} />
		</View>
	);
}

const DELETE: CardMenuItem = {
	label: "Delete list",
	destructive: true,
	icon: <TrashGlyph />,
	onPress: jest.fn(),
};

describe("CardMenu", () => {
	it("starts closed, and the panel is not merely hidden", () => {
		render(<Harness items={[DELETE]} />);

		expect(screen.getByLabelText("More")).toBeTruthy();
		expect(screen.queryByTestId("card-menu")).toBeNull();
		expect(screen.queryByLabelText("Delete list")).toBeNull();
		expect(screen.queryByTestId("menu-backdrop")).toBeNull();
	});

	it("opens on the trigger and closes on a second press", async () => {
		const user = userEvent.setup();
		render(<Harness items={[DELETE]} />);

		await user.press(screen.getByLabelText("More"));
		expect(screen.getByTestId("card-menu")).toBeTruthy();
		expect(screen.getByLabelText("Delete list")).toBeTruthy();

		await user.press(screen.getByLabelText("More"));
		expect(screen.queryByTestId("card-menu")).toBeNull();
	});

	it("says whether it is open", async () => {
		render(<Harness items={[DELETE]} />);

		expect(screen.getByLabelText("More").props.accessibilityState).toMatchObject({
			expanded: false,
		});

		await userEvent.press(screen.getByLabelText("More"));

		expect(screen.getByLabelText("More").props.accessibilityState).toMatchObject({
			expanded: true,
		});
	});

	it("is a menu of menu items", async () => {
		render(<Harness items={[{ label: "Duplicate", onPress: jest.fn() }, DELETE]} />);

		await userEvent.press(screen.getByLabelText("More"));

		// Asserted on the props: RNTL's *ByRole only finds `accessible` views,
		// and an `accessible` panel would fold its rows into one VoiceOver stop.
		expect(screen.getByTestId("card-menu").props.role).toBe("menu");
		expect(screen.getByLabelText("Duplicate").props.role).toBe("menuitem");
		expect(screen.getByLabelText("Delete list").props.role).toBe("menuitem");
	});

	it("runs the item and closes behind it", async () => {
		const onPress = jest.fn();
		const user = userEvent.setup();
		render(<Harness items={[{ ...DELETE, onPress }]} />);

		await user.press(screen.getByLabelText("More"));
		await user.press(screen.getByLabelText("Delete list"));

		expect(onPress).toHaveBeenCalledTimes(1);
		expect(screen.queryByTestId("card-menu")).toBeNull();
	});

	it("renders every item, and its mark", async () => {
		const user = userEvent.setup();
		render(<Harness items={[{ label: "Duplicate", onPress: jest.fn() }, DELETE]} />);

		await user.press(screen.getByLabelText("More"));

		expect(screen.getByText("Duplicate")).toBeTruthy();
		expect(screen.getByText("Delete list")).toBeTruthy();
		expect(screen.getByTestId("glyph-trash")).toBeTruthy();
	});

	describe("closing without choosing (Chase, Nov 2026)", () => {
		it("a tap outside — on the backdrop — closes it and runs nothing", async () => {
			const onPress = jest.fn();
			const onUnderneath = jest.fn();
			const user = userEvent.setup();
			render(<Harness items={[{ ...DELETE, onPress }]} onUnderneath={onUnderneath} />);

			await user.press(screen.getByLabelText("More"));
			await user.press(screen.getByTestId("menu-backdrop"));

			expect(screen.queryByTestId("card-menu")).toBeNull();
			expect(onPress).not.toHaveBeenCalled();
			expect(onUnderneath).not.toHaveBeenCalled();
			expect(screen.getByLabelText("More").props.accessibilityState).toMatchObject({
				expanded: false,
			});
		});

		it("the backdrop is a named control, so VoiceOver can dismiss it too", async () => {
			render(<Harness items={[DELETE]} />);
			await userEvent.press(screen.getByLabelText("More"));

			const backdrop = screen.getByLabelText("Close menu");
			expect(backdrop).toBe(screen.getByTestId("menu-backdrop"));
			expect(backdrop.props.role).toBe("button");
		});

		it("the VoiceOver escape gesture closes it", async () => {
			render(<Harness items={[DELETE]} />);
			await userEvent.press(screen.getByLabelText("More"));

			const region = screen.getByTestId("menu-region");
			act(() => region.props.onAccessibilityEscape());

			expect(screen.queryByTestId("card-menu")).toBeNull();
		});

		it("Escape on web and Android's back button (onRequestClose) close it", async () => {
			const onPress = jest.fn();
			render(<Harness items={[{ ...DELETE, onPress }]} />);
			await userEvent.press(screen.getByLabelText("More"));

			fireEvent(screen.getByTestId("card-menu-modal"), "requestClose");

			expect(screen.queryByTestId("card-menu")).toBeNull();
			expect(onPress).not.toHaveBeenCalled();
		});

		it("opening a second menu closes the first", async () => {
			const user = userEvent.setup();
			render(
				<>
					<Harness items={[DELETE]} testID="first" label="First" />
					<Harness items={[DELETE]} testID="second" label="Second" />
				</>,
			);

			await user.press(screen.getByLabelText("First"));
			expect(screen.getByTestId("first")).toBeTruthy();

			await user.press(screen.getByLabelText("Second"));
			expect(screen.getByTestId("second")).toBeTruthy();
			expect(screen.queryByTestId("first")).toBeNull();
			expect(screen.getAllByTestId("menu-backdrop")).toHaveLength(1);
		});

		it("navigating away (the screen's blur) closes it", async () => {
			const listeners: Record<string, () => void> = {};
			const navigation = {
				addListener: jest.fn((event: string, listener: () => void) => {
					listeners[event] = listener;
					return () => delete listeners[event];
				}),
			};

			render(
				<NavigationContext.Provider value={navigation as never}>
					<Harness items={[DELETE]} />
				</NavigationContext.Provider>,
			);
			await userEvent.press(screen.getByLabelText("More"));
			expect(listeners.blur).toBeDefined();

			act(() => listeners.blur());

			expect(screen.queryByTestId("card-menu")).toBeNull();
			expect(listeners.blur).toBeUndefined();
		});
	});

	describe("the chosen item waits for the menu to go (a second Modal follows it)", () => {
		const realOS = Platform.OS;
		afterEach(() => {
			Platform.OS = realOS;
		});

		it("on iOS it runs once the menu's Modal has dismissed, and only once", async () => {
			jest.useFakeTimers();
			try {
				let panelWhenRun: unknown = "not run";
				const onPress = jest.fn(() => {
					panelWhenRun = screen.queryByTestId("card-menu");
				});
				render(<Harness items={[{ ...DELETE, onPress }]} />);
				fireEvent.press(screen.getByLabelText("More"));

				// The jest Modal reports onDismiss as iOS does, once it is gone.
				fireEvent.press(screen.getByLabelText("Delete list"));
				expect(onPress).toHaveBeenCalledTimes(1);
				expect(panelWhenRun).toBeNull();

				// The fallback timer does not run it a second time.
				act(() => jest.advanceTimersByTime(1000));
				expect(onPress).toHaveBeenCalledTimes(1);
			} finally {
				jest.useRealTimers();
			}
		});

		it("elsewhere it runs at once, without waiting", async () => {
			Platform.OS = "web";
			let panelWhenRun: unknown = "not run";
			const onPress = jest.fn(() => {
				panelWhenRun = screen.queryByTestId("card-menu");
			});
			render(<Harness items={[{ ...DELETE, onPress }]} />);
			await userEvent.press(screen.getByLabelText("More"));

			fireEvent.press(screen.getByLabelText("Delete list"));

			expect(onPress).toHaveBeenCalledTimes(1);
			expect(panelWhenRun).not.toBeNull();
			expect(screen.queryByTestId("card-menu")).toBeNull();
		});
	});

	describe("placement", () => {
		it("hangs under the trigger, right edges aligned", async () => {
			render(<Harness items={[DELETE]} />, {
				createNodeMock: () => ({
					measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) =>
						cb(330, 100, 30, 30),
				}),
			});
			await userEvent.press(screen.getByLabelText("More"));

			const layer = screen.getByTestId("card-menu-layer");
			fireEvent(layer, "layout", { nativeEvent: { layout: { width: 172, height: 96 } } });

			const style = Object.assign({}, ...[layer.props.style].flat(2));
			// 390 wide window (the jest mock): 390 - (330 + 30) = 30 from the right.
			// (The fade is a shared value; the Reanimated mock does not re-render
			// on one, so it is Storybook's to show.)
			expect(style).toMatchObject({ top: 136, right: 30 });
		});

		it("stays below when it fits", () => {
			expect(
				placePanel(
					{ x: 330, y: 100, width: 30, height: 30 },
					{ width: 172, height: 96 },
					{ width: 390, height: 844 },
				),
			).toEqual({ top: 136, right: 30 });
		});

		it("flips above the trigger when it would run off the bottom", () => {
			expect(
				placePanel(
					{ x: 330, y: 780, width: 30, height: 30 },
					{ width: 172, height: 96 },
					{ width: 390, height: 844 },
				),
			).toEqual({ top: 780 - 6 - 96, right: 30 });
		});

		it("is clamped to the window's edges", () => {
			// A trigger hard against the right edge, and one too far left for the panel.
			expect(
				placePanel(
					{ x: 385, y: 100, width: 30, height: 30 },
					{ width: 172, height: 96 },
					{ width: 390, height: 844 },
				).right,
			).toBe(12);
			expect(
				placePanel(
					{ x: 20, y: 100, width: 30, height: 30 },
					{ width: 172, height: 96 },
					{ width: 390, height: 844 },
				).right,
			).toBe(390 - 12 - 172);
		});
	});
});
