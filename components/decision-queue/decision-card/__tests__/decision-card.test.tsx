import * as React from "react";
import { act, render, screen, userEvent, within } from "@testing-library/react-native";

import { DUR } from "@/theme/motion";

import { DecisionCard } from "@/components/decision-queue/decision-card/decision-card";
import type {
	DecisionCardProps,
	Person,
} from "@/components/decision-queue/decision-card/decision-card.model";

/**
 * Behaviour and accessibility only.
 *
 * nativewind/babel is off under jest (see babel.config.js) so class names
 * carry no style, and the Reanimated mock lands every animated value on its
 * target immediately — the round colour, the washes, the chevron turn and the
 * CTA cross-fade are all covered by decision-card.stories.tsx instead.
 *
 * `userEvent` rather than `fireEvent` throughout, for the reason spelled out
 * in chip.test.tsx: fireEvent walks up to composite parents and would fire a
 * handler the host element never accepted, so "disabled does nothing" would
 * pass by accident.
 *
 * `Character`'s testID is fixed at "character" and a poll card renders two of
 * them, so the voters are queried by accessible label ("Fish, Chase").
 */

const YOU: Person = { name: "Chase", person: "a" };
const PARTNER: Person = { name: "Sam", person: "b" };

function props(over: Partial<DecisionCardProps> = {}): DecisionCardProps {
	return {
		id: "d1",
		title: "Where are we eating?",
		description: "Somewhere we have not been.",
		mode: "vote",
		status: "pending",
		currentRound: 1,
		options: [
			{ id: "o1", title: "Tacos", selected: false },
			{ id: "o2", title: "Ramen", selected: false },
		],
		deadline: new Date("2026-09-25T12:00:00Z"),
		createdBy: PARTNER,
		you: YOU,
		partner: PARTNER,
		decidedBy: null,
		youVotedThisRound: false,
		partnerVotedThisRound: false,
		expanded: true,
		editing: false,
		submitting: false,
		error: null,
		onToggle: jest.fn(),
		onOptionSelect: jest.fn(),
		onDecide: jest.fn(),
		onEdit: jest.fn(),
		onCancelEdit: jest.fn(),
		onSaveEdit: jest.fn(),
		onDelete: jest.fn(),
		...over,
	};
}

describe("DecisionCard — header and collapse", () => {
	it("is a group labelled by its title", () => {
		render(<DecisionCard {...props()} />);

		const card = screen.getByLabelText("Where are we eating?");
		expect(card.props.role).toBe("group");
	});

	it("shows only header content when collapsed", () => {
		render(<DecisionCard {...props({ expanded: false })} />);

		expect(screen.getByText("Where are we eating?")).toBeTruthy();
		expect(screen.getByText("Created by Sam")).toBeTruthy();
		expect(screen.getByText("Sep 25, 2026")).toBeTruthy();
		expect(screen.queryByTestId("decision-card-body")).toBeNull();
		expect(screen.queryByLabelText("Tacos")).toBeNull();
		expect(screen.queryByTestId("decision-card-cta")).toBeNull();
	});

	it("shows the body when expanded", () => {
		render(<DecisionCard {...props()} />);

		expect(screen.getByTestId("decision-card-body")).toBeTruthy();
		expect(screen.getByText("Somewhere we have not been.")).toBeTruthy();
		expect(screen.getByLabelText("Tacos")).toBeTruthy();
		expect(screen.getByLabelText("Ramen")).toBeTruthy();
	});

	it("calls onToggle from the chevron, which names the action it will take", async () => {
		const onToggle = jest.fn();
		const { rerender } = render(<DecisionCard {...props({ expanded: false, onToggle })} />);

		await userEvent.setup().press(screen.getByLabelText("Expand"));
		expect(onToggle).toHaveBeenCalledTimes(1);

		rerender(<DecisionCard {...props({ expanded: true, onToggle })} />);
		expect(screen.getByLabelText("Collapse")).toBeTruthy();
	});

	it("falls back to the literal Partner when nobody is linked", () => {
		render(<DecisionCard {...props({ mode: "poll", partner: null })} />);

		expect(screen.getByText("Partner: waiting")).toBeTruthy();
	});

	it("says No deadline rather than leaving the slot empty", () => {
		render(<DecisionCard {...props({ deadline: null })} />);

		expect(screen.getByText("No deadline")).toBeTruthy();
	});
});

describe("DecisionCard — options", () => {
	it("calls onOptionSelect with the option's id", async () => {
		const onOptionSelect = jest.fn();
		render(<DecisionCard {...props({ onOptionSelect })} />);

		await userEvent.setup().press(screen.getByLabelText("Ramen"));

		expect(onOptionSelect).toHaveBeenCalledWith("o2");
	});

	it("does not call onOptionSelect when the options are disabled", async () => {
		// Vote mode, and you made this decision: the creator cannot pick.
		const onOptionSelect = jest.fn();
		render(<DecisionCard {...props({ createdBy: YOU, onOptionSelect })} />);

		await userEvent.setup().press(screen.getByLabelText("Tacos"));

		expect(onOptionSelect).not.toHaveBeenCalled();
	});

	it("reports selection and disabled state on each chip", () => {
		render(
			<DecisionCard
				{...props({
					options: [
						{ id: "o1", title: "Tacos", selected: true },
						{ id: "o2", title: "Ramen", selected: false },
					],
				})}
			/>,
		);

		// Chip's contract (PLAN-3 task 2) is role=checkbox with `checked`,
		// not `selected`; it is a checkbox because an option is togglable.
		expect(screen.getByLabelText("Tacos").props.accessibilityState).toEqual({
			checked: true,
			disabled: false,
		});
		expect(screen.getByLabelText("Ramen").props.accessibilityState).toEqual({
			checked: false,
			disabled: false,
		});
	});

	it("marks every chip disabled once the decision is completed", () => {
		render(<DecisionCard {...props({ status: "completed", decidedBy: "Sam" })} />);

		expect(screen.getByLabelText("Tacos").props.accessibilityState.disabled).toBe(true);
	});

	it.each([
		["vote", "Add more than one option"],
		["poll", "Add at least 2 options to avoid bias"],
	] as const)("shows the %s validation line for a single option", (mode, line) => {
		render(
			<DecisionCard {...props({ mode, options: [{ id: "o1", title: "Tacos", selected: false }] })} />,
		);

		expect(screen.getByText(line)).toBeTruthy();
		expect(screen.getByLabelText("Tacos").props.accessibilityState.disabled).toBe(true);
	});

	it("asks for options when there are none", () => {
		render(<DecisionCard {...props({ options: [] })} />);

		expect(screen.getByText("Please add options")).toBeTruthy();
	});
});

describe("DecisionCard — the CTA", () => {
	it("calls onDecide when the button is live", async () => {
		const onDecide = jest.fn();
		render(
			<DecisionCard
				{...props({
					options: [
						{ id: "o1", title: "Tacos", selected: true },
						{ id: "o2", title: "Ramen", selected: false },
					],
					onDecide,
				})}
			/>,
		);

		const cta = screen.getByTestId("decision-card-cta");
		// The button's accessible name is its own text — there is no
		// duplicated accessibilityLabel to read it out a second time.
		expect(cta.props.accessibilityLabel).toBeUndefined();
		expect(within(cta).getByText("Decide")).toBeTruthy();

		await userEvent.setup().press(cta);
		expect(onDecide).toHaveBeenCalledTimes(1);
	});

	it.each([
		["completed", props({ status: "completed", decidedBy: "Sam" }), "Decided by Sam"],
		["the creator in vote mode", props({ createdBy: YOU }), "Wait for partner to vote"],
		["nothing picked", props(), "Select option"],
		[
			"a poll round already voted in",
			props({ mode: "poll", youVotedThisRound: true }),
			"Vote Submitted",
		],
	] as const)("does not call onDecide when %s", async (_name, given, label) => {
		const onDecide = jest.fn();
		render(<DecisionCard {...given} onDecide={onDecide} />);

		const cta = screen.getByTestId("decision-card-cta");
		expect(within(cta).getByText(label)).toBeTruthy();
		expect(cta.props.accessibilityState).toEqual({ disabled: true });

		await userEvent.setup().press(cta);
		expect(onDecide).not.toHaveBeenCalled();
	});

	it("goes quiet while a vote is in flight", async () => {
		const onDecide = jest.fn();
		render(
			<DecisionCard
				{...props({
					mode: "poll",
					submitting: true,
					options: [
						{ id: "o1", title: "Tacos", selected: true },
						{ id: "o2", title: "Ramen", selected: false },
					],
					onDecide,
				})}
			/>,
		);

		const cta = screen.getByTestId("decision-card-cta");
		expect(within(cta).getByText("Submitting…")).toBeTruthy();

		await userEvent.setup().press(cta);
		expect(onDecide).not.toHaveBeenCalled();
	});

	it("gives poll cards the round end-cap and vote cards none", () => {
		const { rerender } = render(<DecisionCard {...props({ mode: "poll" })} />);
		expect(screen.getByTestId("decision-card-cta-cap")).toBeTruthy();

		rerender(<DecisionCard {...props({ mode: "vote" })} />);
		expect(screen.queryByTestId("decision-card-cta-cap")).toBeNull();
	});
});

describe("DecisionCard — poll voters", () => {
	it("names each person's state in words, not only in a pose", () => {
		render(
			<DecisionCard
				{...props({ mode: "poll", youVotedThisRound: true, partnerVotedThisRound: false })}
			/>,
		);

		expect(screen.getByText("Chase: voted")).toBeTruthy();
		expect(screen.getByText("Sam: waiting")).toBeTruthy();
		expect(screen.getByLabelText("Fish, Chase")).toBeTruthy();
		expect(screen.getByLabelText("Goose, Sam")).toBeTruthy();
	});

	it("says the creator is sitting round 3 out", () => {
		render(<DecisionCard {...props({ mode: "poll", currentRound: 3, createdBy: YOU })} />);

		expect(screen.getByText("Chase: sitting out")).toBeTruthy();
		// "Round 3" is on the badge too, so scope to the body's round label —
		// the first link in the round-colour thread.
		expect(within(screen.getByTestId("decision-card-poll-round")).getByText("Round 3")).toBeTruthy();
	});

	it("never says the partner has a pick in flight", () => {
		render(
			<DecisionCard
				{...props({
					mode: "poll",
					options: [
						{ id: "o1", title: "Tacos", selected: true },
						{ id: "o2", title: "Ramen", selected: false },
					],
				})}
			/>,
		);

		// You have picked; the partner line must be indistinguishable from
		// one where nothing has happened (CollapsibleCard.tsx:254).
		expect(screen.getByText("Sam: waiting")).toBeTruthy();
		expect(screen.queryByText("Sam: voted")).toBeNull();
	});

	it("leaves the voter row out of vote-mode cards", () => {
		render(<DecisionCard {...props({ mode: "vote" })} />);

		expect(screen.queryByTestId("decision-card-poll-round")).toBeNull();
	});
});

describe("DecisionCard — editing and deleting", () => {
	it("offers the pencil only to the creator of a pending decision", () => {
		const { rerender } = render(<DecisionCard {...props({ createdBy: YOU })} />);
		expect(screen.getByLabelText("Edit decision")).toBeTruthy();

		rerender(<DecisionCard {...props({ createdBy: PARTNER })} />);
		expect(screen.queryByLabelText("Edit decision")).toBeNull();

		rerender(<DecisionCard {...props({ createdBy: YOU, status: "voted" })} />);
		expect(screen.queryByLabelText("Edit decision")).toBeNull();
	});

	it("calls onEdit from the pencil", async () => {
		const onEdit = jest.fn();
		render(<DecisionCard {...props({ createdBy: YOU, onEdit })} />);

		await userEvent.setup().press(screen.getByLabelText("Edit decision"));

		expect(onEdit).toHaveBeenCalledTimes(1);
	});

	it("swaps the pencil for cancel and save while editing, and hides the badge", () => {
		render(<DecisionCard {...props({ createdBy: YOU, editing: true })} />);

		expect(screen.getByLabelText("Cancel edit")).toBeTruthy();
		expect(screen.getByLabelText("Save edit")).toBeTruthy();
		expect(screen.queryByLabelText("Edit decision")).toBeNull();
		expect(screen.queryByTestId("decision-card-badge")).toBeNull();
	});

	it("hands the edited draft to onSaveEdit", async () => {
		const onSaveEdit = jest.fn();
		const deadline = new Date("2026-09-25T12:00:00Z");
		render(<DecisionCard {...props({ createdBy: YOU, editing: true, deadline, onSaveEdit })} />);

		const user = userEvent.setup();
		await user.clear(screen.getByLabelText("Title"));
		await user.type(screen.getByLabelText("Title"), "Where are we eating tonight?");
		await user.press(screen.getByLabelText("Save edit"));

		expect(onSaveEdit).toHaveBeenCalledWith({
			title: "Where are we eating tonight?",
			description: "Somewhere we have not been.",
			deadline,
			options: ["Tacos", "Ramen"],
		});
	});

	it("drops a blank option row from the draft", async () => {
		const onSaveEdit = jest.fn();
		render(<DecisionCard {...props({ createdBy: YOU, editing: true, onSaveEdit })} />);

		const user = userEvent.setup();
		await user.press(screen.getByLabelText("Add option"));
		await user.press(screen.getByLabelText("Save edit"));

		expect(onSaveEdit).toHaveBeenCalledWith(expect.objectContaining({ options: ["Tacos", "Ramen"] }));
	});

	it("removes an option row", async () => {
		const onSaveEdit = jest.fn();
		render(<DecisionCard {...props({ createdBy: YOU, editing: true, onSaveEdit })} />);

		const user = userEvent.setup();
		await user.press(screen.getByLabelText("Remove option 1"));
		await user.press(screen.getByLabelText("Save edit"));

		expect(onSaveEdit).toHaveBeenCalledWith(expect.objectContaining({ options: ["Ramen"] }));
	});

	it("calls onCancelEdit without touching onSaveEdit", async () => {
		const onCancelEdit = jest.fn();
		const onSaveEdit = jest.fn();
		render(<DecisionCard {...props({ createdBy: YOU, editing: true, onCancelEdit, onSaveEdit })} />);

		await userEvent.setup().press(screen.getByLabelText("Cancel edit"));

		expect(onCancelEdit).toHaveBeenCalledTimes(1);
		expect(onSaveEdit).not.toHaveBeenCalled();
	});

	it("keeps delete behind the overflow, and only for the creator", async () => {
		const onDelete = jest.fn();
		const { rerender } = render(<DecisionCard {...props({ createdBy: PARTNER })} />);
		expect(screen.queryByLabelText("More")).toBeNull();

		rerender(<DecisionCard {...props({ createdBy: YOU, onDelete })} />);
		expect(screen.queryByTestId("decision-card-menu")).toBeNull();

		const user = userEvent.setup();
		await user.press(screen.getByLabelText("More"));
		expect(screen.getByTestId("decision-card-menu")).toBeTruthy();

		await user.press(screen.getByLabelText("Delete decision"));
		expect(onDelete).toHaveBeenCalledTimes(1);
		expect(screen.queryByTestId("decision-card-menu")).toBeNull();
	});
});

/**
 * The inline deadline field (PLAN-3 final review I1) — v1's only edit path for
 * a deadline (DecisionCardHeader.tsx:159-166), restored.
 *
 * The calendar opens on *today's* month and clamps to [today, today + 1 year],
 * so the day this presses is computed from the real clock rather than written
 * down: three days out is always inside the 42-cell grid (a 31-day month with
 * the worst-case leading offset still shows five days of the next one) and
 * always selectable. The grid is rebuilt here the way the picker builds it so
 * the right *occurrence* of a repeated number can be pressed — "3" appears
 * once for this month and once for the next.
 */
describe("DecisionCard — the deadline field", () => {
	/** The picker's own grid: 42 days from the Sunday on or before the 1st. */
	function grid(month: Date): Date[] {
		const first = new Date(month.getFullYear(), month.getMonth(), 1);
		const start = new Date(first);
		start.setDate(start.getDate() - first.getDay());
		return Array.from({ length: 42 }, (_, index) => {
			const date = new Date(start);
			date.setDate(start.getDate() + index);
			return date;
		});
	}

	/** Three days out, and which of that number's cells is the one to press. */
	function target() {
		const today = new Date();
		const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3);
		const cells = grid(today);
		const index = cells.findIndex((cell) => cell.toDateString() === date.toDateString());
		const occurrence = cells
			.slice(0, index)
			.filter((cell) => cell.getDate() === date.getDate()).length;
		return { date, label: String(date.getDate()), occurrence };
	}

	it("shows the current deadline", () => {
		render(
			<DecisionCard {...props({ createdBy: YOU, editing: true, deadline: new Date(2026, 8, 25) })} />,
		);

		expect(screen.getByLabelText("Deadline")).toBeTruthy();
		expect(screen.getByText("Fri, Sep 25, 2026")).toBeTruthy();
	});

	// A fresh render rather than a rerender: the draft is seeded when the card
	// *enters* edit mode, so a prop change while already editing is ignored on
	// purpose (decision-card.tsx's `seedRef`).
	it("shows the placeholder when there is none", () => {
		render(<DecisionCard {...props({ createdBy: YOU, editing: true, deadline: null })} />);

		expect(screen.getByText("Select deadline")).toBeTruthy();
	});

	it("hands a newly picked date to onSaveEdit", async () => {
		const onSaveEdit = jest.fn();
		render(
			<DecisionCard
				{...props({ createdBy: YOU, editing: true, deadline: new Date(2026, 8, 25), onSaveEdit })}
			/>,
		);

		const user = userEvent.setup();
		await user.press(screen.getByLabelText("Deadline"));
		// The calendar's footer is its "I am open" proof (date-picker.test.tsx).
		expect(screen.getByText("Cancel")).toBeTruthy();

		const picked = target();
		await user.press(screen.getAllByText(picked.label)[picked.occurrence]);
		await user.press(screen.getByLabelText("Save edit"));

		expect(onSaveEdit).toHaveBeenCalledWith(expect.objectContaining({ deadline: picked.date }));
	});

	it("keeps 'No deadline' semantics: a null deadline stays null through a save", async () => {
		const onSaveEdit = jest.fn();
		render(
			<DecisionCard {...props({ createdBy: YOU, editing: true, deadline: null, onSaveEdit })} />,
		);

		await userEvent.setup().press(screen.getByLabelText("Save edit"));

		expect(onSaveEdit).toHaveBeenCalledWith(expect.objectContaining({ deadline: null }));
		// …which `toInlineEditPayload` writes as the column's blank — the
		// contract asserted in from-ui-decision.test.ts.
	});
});

describe("DecisionCard — the error strip", () => {
	it("renders the message above the body", () => {
		render(<DecisionCard {...props({ error: "Please select an option first" })} />);

		expect(screen.getByTestId("decision-card-error")).toBeTruthy();
		expect(screen.getByText("Please select an option first")).toBeTruthy();
	});

	it("renders nothing when there is no error", () => {
		render(<DecisionCard {...props()} />);

		expect(screen.queryByTestId("decision-card-error")).toBeNull();
	});
});

describe("DecisionCard — the two colours", () => {
	// `Card`'s state marker is the PERSON state: whose decision this
	// currently is. It is a different question from which round a poll card
	// is on, which is why a round-2 card can be in person A's hue.
	it.each([
		["nobody has voted", props({ mode: "poll", currentRound: 2 }), "card-state-neutral"],
		[
			"you voted in round 2",
			props({ mode: "poll", currentRound: 2, youVotedThisRound: true }),
			"card-state-a",
		],
		[
			"the partner voted in round 1",
			props({ mode: "poll", currentRound: 1, partnerVotedThisRound: true }),
			"card-state-b",
		],
		[
			"both voted",
			props({ mode: "poll", youVotedThisRound: true, partnerVotedThisRound: true }),
			"card-state-together",
		],
		["a completed poll", props({ mode: "poll", status: "completed" }), "card-state-together"],
		["an untouched vote", props(), "card-state-neutral"],
		[
			"a vote you voted on",
			props({
				status: "voted",
				options: [
					{ id: "o1", title: "Tacos", selected: true },
					{ id: "o2", title: "Ramen", selected: false },
				],
			}),
			"card-state-a",
		],
		// The regression this split was made for: a vote only the partner has
		// voted on used to be painted in the VIEWER's hue.
		["a vote only the partner voted on", props({ status: "voted" }), "card-state-b"],
	] as const)("dresses the card for %s", (_name, given, testID) => {
		render(<DecisionCard {...given} />);

		expect(screen.getByTestId(testID)).toBeTruthy();
	});

	// The thread is the round's own hue and does not follow the viewer or the
	// person state — tokens.md §10.
	it("keeps the round label on the round's hue, not the card's", () => {
		render(<DecisionCard {...props({ mode: "poll", currentRound: 2, youVotedThisRound: true })} />);

		// Person A's card (you voted) on person B's round (round 2).
		expect(screen.getByTestId("card-state-a")).toBeTruthy();
		expect(within(screen.getByTestId("decision-card-poll-round")).getByText("Round 2")).toBeTruthy();
	});
});

describe("DecisionCard — opening and closing", () => {
	// The Reveal's release is a real timer, so these drive it directly. The
	// Reanimated mock lands every animated value on its target immediately,
	// so `progress` reads 1 the moment the open starts — which is what makes
	// "is a height applied at all" the meaningful assertion here.
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	/**
	 * The flattened style on the body wrapper. It is an array — the animated
	 * style plus whatever NativeWind's interop contributes for the className —
	 * so the question "is a height applied at all" has to be asked of the
	 * merge, not of one slot.
	 */
	function bodyStyle(): Record<string, unknown> {
		const style = screen.getByTestId("decision-card-body").props.style;
		const parts: unknown[] = Array.isArray(style) ? style : [style];
		return Object.assign({}, ...parts.filter(Boolean));
	}

	function measure(testID: string, height: number) {
		act(() => {
			screen.getByTestId(`${testID}-content`).props.onLayout({ nativeEvent: { layout: { height } } });
		});
	}

	it("stops constraining the body's height once the open has finished", () => {
		render(<DecisionCard {...props()} />);

		measure("decision-card-body", 240);
		// Mid-open the wrapper is driven: it carries a height taken from the
		// content, so the card can grow into it.
		expect(bodyStyle()).toMatchObject({ height: 240 });

		act(() => {
			jest.advanceTimersByTime(DUR.base);
		});

		// Settled: the wrapper is released back to `auto` rather than the
		// animated style being detached — detaching leaves the measured
		// height on the element on web, and a body stuck at its opening
		// height clips inside Card's overflow-hidden the moment it grows.
		expect(bodyStyle()).toMatchObject({ height: "auto", opacity: 1 });
	});

	it("animates the body closed before it unmounts", () => {
		const { rerender } = render(<DecisionCard {...props({ expanded: true })} />);
		measure("decision-card-body", 240);
		act(() => {
			jest.advanceTimersByTime(DUR.base);
		});

		rerender(<DecisionCard {...props({ expanded: false })} />);

		// Still mounted, and driven again — this is the close animating.
		expect(screen.getByTestId("decision-card-body")).toBeTruthy();
		expect(bodyStyle()).toMatchObject({ height: expect.any(Number) });

		act(() => {
			jest.advanceTimersByTime(DUR.base);
		});

		expect(screen.queryByTestId("decision-card-body")).toBeNull();
	});

	// The card drives a timing animation toward 1 on open and 0 on close.
	// Deliberately paired with the behavioural test above rather than trusted
	// alone: the chevron and the CTA also call `withTiming` at `dur.base`, so
	// this says "both directions animate", and the mount/unmount test above is
	// what pins the close animation to the body itself.
	it("drives a timing animation in both directions", () => {
		const reanimated = jest.requireMock("react-native-reanimated") as {
			withTiming: (to: number, config?: unknown) => number;
		};
		const withTiming = jest.spyOn(reanimated, "withTiming");

		const { rerender } = render(<DecisionCard {...props({ expanded: true })} />);
		expect(withTiming).toHaveBeenCalledWith(1, { duration: DUR.base });

		withTiming.mockClear();
		rerender(<DecisionCard {...props({ expanded: false })} />);
		expect(withTiming).toHaveBeenCalledWith(0, { duration: DUR.base });

		withTiming.mockRestore();
	});
});

describe("DecisionCard — editing a collapsed card", () => {
	// FEATURE-INVENTORY §1.10a (CollapsibleCard.tsx:136-147): starting an
	// edit force-expands the card. The edit form must never render under a
	// collapsed header.
	it("shows the full edit body and an open header", () => {
		render(<DecisionCard {...props({ createdBy: YOU, expanded: false, editing: true })} />);

		expect(screen.getByTestId("decision-card-edit")).toBeTruthy();
		expect(screen.getByLabelText("Title")).toBeTruthy();
		expect(screen.getByLabelText("Description")).toBeTruthy();
		expect(screen.getByLabelText("Option 1")).toBeTruthy();
		expect(screen.getByLabelText("Save edit")).toBeTruthy();
	});

	it("still hands the draft over from a collapsed card", async () => {
		const onSaveEdit = jest.fn();
		render(
			<DecisionCard {...props({ createdBy: YOU, expanded: false, editing: true, onSaveEdit })} />,
		);

		await userEvent.setup().press(screen.getByLabelText("Save edit"));

		expect(onSaveEdit).toHaveBeenCalledWith(
			expect.objectContaining({ title: "Where are we eating?" }),
		);
	});
});
