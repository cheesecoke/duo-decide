import * as React from "react";
import { render, screen, userEvent, within } from "@testing-library/react-native";

import type { EditableOption } from "@/components/options/editable-options/editable-options";
import { OptionListCard } from "@/components/options/option-list-card/option-list-card";

/**
 * The option-list card (FEATURE-INVENTORY §1.11's `CollapsibleListCard`).
 *
 * It is pure, so everything here is props in / callbacks out. The Reanimated
 * mock lands every value on its target immediately (test-utils), so an
 * expanded body is queryable the moment it mounts; nothing asserts a frame.
 */

const OPTIONS: EditableOption[] = [
	{ id: "o1", title: "Tacos" },
	{ id: "o2", title: "Ramen" },
];

function renderCard(
	over: {
		list?: Partial<React.ComponentProps<typeof OptionListCard>["list"]>;
	} & Partial<Omit<React.ComponentProps<typeof OptionListCard>, "list">> = {},
) {
	const { list, ...rest } = over;
	const props = {
		list: {
			id: "l1",
			title: "Dinner spots",
			description: "Places we keep coming back to",
			options: OPTIONS,
			expanded: false,
			...list,
		},
		state: "neutral" as const,
		canDelete: false,
		onToggle: jest.fn(),
		onDelete: jest.fn(),
		onOptionsUpdate: jest.fn(),
		...rest,
	};

	render(<OptionListCard {...props} />);
	return props;
}

describe("collapsed", () => {
	it("shows the title, the description and the count, and nothing else", () => {
		renderCard();

		expect(screen.getByText("Dinner spots")).toBeTruthy();
		expect(screen.getByTestId("option-list-card-description")).toBeTruthy();
		expect(screen.getByText("Places we keep coming back to")).toBeTruthy();
		expect(screen.getByText("2 options")).toBeTruthy();
		// The body is not merely hidden — it is not mounted.
		expect(screen.queryByTestId("option-list-card-body")).toBeNull();
		expect(screen.queryByText("Tacos")).toBeNull();
	});

	// A list with no description used to render an empty line under the title.
	it("omits the description element when there is no description", () => {
		renderCard({ list: { description: "" } });

		expect(screen.getByText("Dinner spots")).toBeTruthy();
		expect(screen.getByText("2 options")).toBeTruthy();
		expect(screen.queryByTestId("option-list-card-description")).toBeNull();
	});

	it.each([
		["No options yet", []],
		["1 option", [OPTIONS[0]]],
		["2 options", OPTIONS],
	])("the meta line says %s", (copy, options) => {
		renderCard({ list: { options: options as EditableOption[] } });

		expect(screen.getByText(copy as string)).toBeTruthy();
	});
});

describe("the chevron", () => {
	it("is the one named control on the header, and says which way it goes", () => {
		renderCard();

		const chevron = screen.getByLabelText("Expand");
		expect(chevron.props.accessibilityState).toMatchObject({ expanded: false });
		expect(screen.queryByLabelText("Collapse")).toBeNull();
	});

	it("flips its name and its state once the card is open", () => {
		renderCard({ list: { expanded: true } });

		const chevron = screen.getByLabelText("Collapse");
		expect(chevron.props.accessibilityState).toMatchObject({ expanded: true });
	});

	it("toggles on press", async () => {
		const props = renderCard();

		await userEvent.press(screen.getByLabelText("Expand"));

		expect(props.onToggle).toHaveBeenCalledTimes(1);
	});

	// The whole header row is the target, not just the 30 px disc.
	it("toggles when the title is pressed too", async () => {
		const props = renderCard();

		await userEvent.press(screen.getByText("Dinner spots"));

		expect(props.onToggle).toHaveBeenCalledTimes(1);
	});

	/**
	 * PLAN-3 final review I6. The row is a mouse and touch target with no
	 * role and no name; React Native Web would still give it `tabIndex=0`,
	 * making it a keyboard stop that announces nothing, one Tab before the
	 * chevron that does the same job and says its name.
	 */
	it("is not a keyboard stop — the chevron is the named one", () => {
		renderCard();

		expect(screen.getByTestId("option-list-card-header").props.tabIndex).toBe(-1);
		expect(screen.getByLabelText("Expand")).toBeTruthy();
	});
});

describe("expanded", () => {
	it("puts the repeater in the body", () => {
		renderCard({ list: { expanded: true } });

		const body = screen.getByTestId("option-list-card-body");
		expect(within(body).getByText("Tacos")).toBeTruthy();
		expect(within(body).getByText("Ramen")).toBeTruthy();
		expect(within(body).getByLabelText("Edit options")).toBeTruthy();
	});

	it("uses the card's own empty copy, not the sheet's", () => {
		renderCard({ list: { expanded: true, options: [] } });

		expect(
			screen.getByText("No options in this list yet. Tap the edit button to add some!"),
		).toBeTruthy();
	});

	it("passes the repeater's output straight up", async () => {
		const props = renderCard({ list: { expanded: true } });

		await userEvent.press(screen.getByLabelText("Edit options"));
		await userEvent.press(screen.getByLabelText("Add option"));

		expect(props.onOptionsUpdate).toHaveBeenCalledWith([
			...OPTIONS,
			{ id: expect.stringMatching(/^temp-/), title: "" },
		]);
	});
});

describe("delete", () => {
	it("offers no trash circle to someone who did not make the list", () => {
		renderCard({ list: { expanded: true }, canDelete: false });

		expect(screen.queryByLabelText("Delete list")).toBeNull();
	});

	it("offers one to the creator", async () => {
		const props = renderCard({ list: { expanded: true }, canDelete: true });

		await userEvent.press(screen.getByLabelText("Delete list"));

		expect(props.onDelete).toHaveBeenCalledTimes(1);
	});

	// Collapsed, there is nowhere for it to be.
	it("keeps the trash out of a collapsed card", () => {
		renderCard({ canDelete: true });

		expect(screen.queryByLabelText("Delete list")).toBeNull();
	});
});

describe("whose card it is", () => {
	it.each(["neutral", "a", "b"] as const)("wears the %s seat", (state) => {
		renderCard({ state });

		expect(screen.getByTestId(`card-state-${state}`)).toBeTruthy();
	});
});
