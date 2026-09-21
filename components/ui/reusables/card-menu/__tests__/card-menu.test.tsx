import * as React from "react";
import { View } from "react-native";
import { render, screen, userEvent } from "@testing-library/react-native";

import {
	CardMenu,
	CardMenuTrigger,
	TrashGlyph,
	useCardMenu,
	type CardMenuItem,
} from "@/components/ui/reusables/card-menu/card-menu";

/**
 * The `⋯` overflow. The trigger and the panel are two components sharing one
 * `useCardMenu`, so everything here mounts both — a test that rendered only
 * the panel would be testing markup, not the menu.
 */
function Harness({ items }: { items: readonly CardMenuItem[] }) {
	const menu = useCardMenu();

	return (
		<View>
			<CardMenuTrigger menu={menu} />
			<CardMenu menu={menu} items={items} testID="card-menu" />
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
	});

	it("opens on the trigger and closes on a second press", async () => {
		const user = userEvent.setup();
		render(<Harness items={[DELETE]} />);

		await user.press(screen.getByLabelText("More"));
		expect(screen.getByTestId("card-menu")).toBeTruthy();

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
});
