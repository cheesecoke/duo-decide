import { act, fireEvent, render, screen, userEvent } from "@testing-library/react-native";
import * as React from "react";
import { AccessibilityInfo, Keyboard } from "react-native";

import { COPY, type CalendarForm } from "@/components/calendar/add-to-calendar.model";
import {
	AddToCalendarSheet,
	type AddToCalendarSheetProps,
} from "@/components/calendar/add-to-calendar-sheet";
import type { FollowUp } from "@/lib/follow-up";

// Behaviour and accessibility, not classes: nativewind/babel is off in jest.

const TODAY = "2026-11-19";

const FOLLOW_UP: Pick<FollowUp, "when" | "datePast"> = {
	when: {
		date: "2026-12-12",
		time: null,
		matchedText: "Dec 12",
		relative: false,
		source: "parsed",
		foundIn: "title",
	},
	datePast: false,
};

const form = (over: Partial<CalendarForm> = {}): CalendarForm => ({
	title: "Nutcracker",
	date: "2026-12-12",
	allDay: true,
	time: null,
	durationMinutes: 60,
	location: "",
	notes: "Decided together in Duo.",
	destination: "google",
	destinationOpen: false,
	...over,
});

const handlers = () => ({
	onFormChange: jest.fn(),
	onPrimary: jest.fn(),
	onNotNow: jest.fn(),
	onAddAnyway: jest.fn(),
	onRetry: jest.fn(),
	onAskForIt: jest.fn(),
	onYes: jest.fn(),
	onNotYet: jest.fn(),
	onMarkNotAdded: jest.fn(),
	onDone: jest.fn(),
	onAddAgain: jest.fn(),
	onAddMine: jest.fn(),
	onGotIt: jest.fn(),
});

async function show(over: Partial<AddToCalendarSheetProps> = {}) {
	const spies = handlers();
	const props: AddToCalendarSheetProps = {
		body: "review",
		form: form(),
		platform: "native",
		today: TODAY,
		followUp: FOLLOW_UP,
		partnerName: "Steph",
		...spies,
		...over,
	};
	const view = render(<AddToCalendarSheet {...props} />);
	// `useReducedMotion` resolves a promise into state on mount.
	await act(async () => {});
	return { ...view, props, spies: { ...spies, ...over } as ReturnType<typeof handlers> };
}

const press = (label: string) => userEvent.setup().press(screen.getByLabelText(label));

describe("AddToCalendarSheet", () => {
	const announce = jest.fn();
	beforeEach(() => {
		(
			AccessibilityInfo as unknown as { announceForAccessibility: jest.Mock }
		).announceForAccessibility = announce;
	});

	describe("review", () => {
		it("labels every field and prefills from the form", async () => {
			await show();

			expect(screen.getByLabelText("What").props.value).toBe("Nutcracker");
			expect(screen.getByLabelText("Where").props.value).toBe("");
			expect(screen.getByLabelText("Note").props.value).toBe("Decided together in Duo.");
			for (const label of ["What", "When", "All day", "Where", "Note", "Adding to"]) {
				expect(screen.getByText(label)).toBeTruthy();
			}
		});

		it("names the date button with the whole date", async () => {
			await show();

			expect(screen.getByLabelText("When, Saturday, December 12, 2026")).toBeTruthy();
			expect(screen.getByText("Sat, Dec 12, 2026")).toBeTruthy();
		});

		it("says where the date came from", async () => {
			await show();

			expect(screen.getByText("Picked up from “Dec 12” in the title.")).toBeTruthy();
		});

		it("dismisses the keyboard before opening the calendar", async () => {
			await show();

			await press("When, Saturday, December 12, 2026");

			expect(Keyboard.dismiss).toHaveBeenCalled();
			// The calendar's own month arrows are on screen.
			expect(screen.getByLabelText("Next month")).toBeTruthy();
		});

		it("reports edits as patches", async () => {
			const { spies } = await show();

			fireEvent.changeText(screen.getByLabelText("What"), "The Nutcracker");
			fireEvent.changeText(screen.getByLabelText("Where"), "Ellie Caulkins");
			fireEvent.changeText(screen.getByLabelText("Note"), "Bring the tickets");

			expect(spies.onFormChange.mock.calls).toEqual([
				[{ title: "The Nutcracker" }],
				[{ location: "Ellie Caulkins" }],
				[{ notes: "Bring the tickets" }],
			]);
		});

		it("with no date: says so, asks for one, and disables the button", async () => {
			const { spies } = await show({
				form: form({ date: "" }),
				followUp: { when: null, datePast: false },
			});

			expect(screen.getByLabelText("When, no date picked")).toBeTruthy();
			expect(screen.getByText("Pick a date")).toBeTruthy();
			const primary = screen.getByLabelText("Pick a date first");
			expect(primary.props.accessibilityState).toEqual({ disabled: true });

			await userEvent.setup().press(primary);
			expect(spies.onPrimary).not.toHaveBeenCalled();
		});

		it("announces a date that has passed as a problem", async () => {
			await show({
				form: form({ date: "" }),
				followUp: {
					when: { ...FOLLOW_UP.when!, date: "2026-11-02", matchedText: "Nov 2" },
					datePast: true,
				},
			});

			const caption = screen.getByText("“Nov 2” has already passed. Pick the new date.");
			expect(caption.props.role).toBe("alert");
		});

		it("hides the time and length while All day is on", async () => {
			await show();

			expect(screen.getByLabelText("All day").props.role).toBe("switch");
			expect(screen.getByLabelText("All day").props.accessibilityState).toEqual({ checked: true });
			expect(screen.queryByLabelText("Starts")).toBeNull();
			expect(screen.queryByLabelText("How long")).toBeNull();
		});

		it("turns All day off through the switch", async () => {
			const { spies } = await show();

			await press("All day");

			expect(spies.onFormChange).toHaveBeenCalledWith({ allDay: false });
		});

		it("shows the time and the three lengths for a timed event", async () => {
			const { spies } = await show({
				form: form({ allDay: false, time: "19:30", durationMinutes: 120 }),
			});

			expect(screen.getByLabelText("Starts").props.value).toBe("7:30");
			expect(screen.getByLabelText("How long").props.role).toBe("radiogroup");
			expect(screen.getByLabelText("1 hour").props.role).toBe("radio");
			expect(screen.getByLabelText("1 hour").props.accessibilityState).toEqual({ checked: false });
			expect(screen.getByLabelText("2 hours").props.accessibilityState).toEqual({ checked: true });

			await press("3 hours");
			expect(spies.onFormChange).toHaveBeenCalledWith({ durationMinutes: 180 });

			fireEvent.changeText(screen.getByLabelText("Starts"), "8");
			// The prefilled pm sticks: 8 is 8 pm, not the bare-hour default.
			expect(spies.onFormChange).toHaveBeenCalledWith({ time: "20:00" });
		});

		it("shows the time error only once a submit was tried", async () => {
			const timed = form({ allDay: false, time: null });
			const { rerender, props } = await show({ form: timed });
			expect(screen.queryByText("Try a time like 7:30.")).toBeNull();

			rerender(<AddToCalendarSheet {...props} showErrors />);
			expect(screen.getByText("Try a time like 7:30.").props.role).toBe("alert");
		});

		it("shows the destination collapsed, with a way to change it", async () => {
			const { spies } = await show();

			expect(screen.getByText("Google Calendar")).toBeTruthy();
			expect(screen.getByText("You'll pick your shared calendar there.")).toBeTruthy();
			expect(screen.queryByLabelText("Adding to")).toBeNull();

			await press("Change calendar");
			expect(spies.onFormChange).toHaveBeenCalledWith({ destinationOpen: true });
		});

		it("offers Google and 'another calendar' on a phone", async () => {
			const { spies } = await show({ form: form({ destinationOpen: true }) });

			expect(screen.getByLabelText("Adding to").props.role).toBe("radiogroup");
			expect(screen.getByLabelText("Google Calendar").props.accessibilityState).toEqual({
				checked: true,
			});
			expect(screen.getByLabelText("Another calendar").props.accessibilityState).toEqual({
				checked: false,
			});
			expect(screen.queryByLabelText("Calendar file")).toBeNull();

			await press("Another calendar");
			expect(spies.onFormChange).toHaveBeenCalledWith({ destination: "other", destinationOpen: true });
		});

		it("offers Google and a calendar file on web", async () => {
			const { spies } = await show({ platform: "web", form: form({ destinationOpen: true }) });

			expect(screen.queryByLabelText("Another calendar")).toBeNull();

			await press("Calendar file");
			expect(spies.onFormChange).toHaveBeenCalledWith({ destination: "ics", destinationOpen: false });
		});

		it("says a calendar is not supported yet, with a way to ask and a way back", async () => {
			const { spies } = await show({ form: form({ destination: "other", destinationOpen: true }) });

			expect(screen.getByTestId("add-to-calendar-unsupported").props.role).toBe("status");
			expect(screen.getByText(COPY.unsupported)).toBeTruthy();
			expect(screen.getByLabelText("Not supported yet").props.accessibilityState).toEqual({
				disabled: true,
			});

			await press("Ask for it");
			expect(spies.onAskForIt).toHaveBeenCalledTimes(1);

			await press("Use Google Calendar");
			expect(spies.onFormChange).toHaveBeenCalledWith({
				destination: "google",
				destinationOpen: false,
			});
		});

		it("holds the button back while the partner is mid-add", async () => {
			const { spies } = await show({ partnerOpening: "google_link" });

			expect(screen.getByTestId("add-to-calendar-partner-opening").props.role).toBe("status");
			expect(
				screen.getByText(
					"Steph just opened this in Google Calendar. Hold off so it doesn't land twice.",
				),
			).toBeTruthy();
			expect(screen.getByLabelText("Open in Google Calendar").props.accessibilityState).toEqual({
				disabled: true,
			});

			await press("Add anyway");
			expect(spies.onAddAnyway).toHaveBeenCalledTimes(1);
		});

		it.each([
			["open", "We couldn't open Google Calendar."],
			["offline", "No connection right now, so nothing was added. Try again when you're back online."],
		] as const)("announces a failed hand-off (%s) and offers another go", async (error, message) => {
			const { spies } = await show({ error });

			expect(screen.getByTestId("add-to-calendar-error").props.role).toBe("alert");
			expect(screen.getByText(message)).toBeTruthy();

			await press("Try again");
			expect(spies.onRetry).toHaveBeenCalledTimes(1);
		});

		it("ends with Not now and the primary action", async () => {
			const { spies } = await show();

			await press("Open in Google Calendar");
			await press("Not now");

			expect(spies.onPrimary).toHaveBeenCalledTimes(1);
			expect(spies.onNotNow).toHaveBeenCalledTimes(1);
		});

		it("names the file button on web when a calendar file is chosen", async () => {
			await show({ platform: "web", form: form({ destination: "ics" }) });

			expect(screen.getByLabelText("Get calendar file")).toBeTruthy();
		});

		it("disables the button while busy", async () => {
			await show({ busy: true });

			expect(screen.getByLabelText("Open in Google Calendar").props.accessibilityState).toEqual({
				disabled: true,
			});
		});
	});

	describe("confirm", () => {
		it("asks once, with the event in one line", async () => {
			const { spies } = await show({
				body: "confirm",
				form: form({ allDay: false, time: "19:30" }),
			});

			expect(screen.getByText("Did it save?").props.role).toBe("heading");
			expect(screen.getByText("Nutcracker · Sat, Dec 12 · 7:30 pm")).toBeTruthy();
			expect(
				screen.getByText("We can't see your calendar, so tell us and Steph will know it's handled."),
			).toBeTruthy();
			expect(announce).toHaveBeenCalledWith("Did it save?");

			await press("Yes, added");
			await press("Not yet");
			expect(spies.onYes).toHaveBeenCalledTimes(1);
			expect(spies.onNotYet).toHaveBeenCalledTimes(1);
		});

		it("says when the answer was not saved", async () => {
			await show({ body: "confirm", error: "save" });

			expect(screen.getByTestId("add-to-calendar-error").props.role).toBe("alert");
			expect(screen.getByText(COPY.notSaved)).toBeTruthy();
		});
	});

	describe("added", () => {
		it("says it is on the calendar, and lets it be taken back", async () => {
			const { spies } = await show({ body: "added" });

			expect(screen.getByText("On the calendar").props.role).toBe("heading");
			expect(screen.getByText("Nutcracker · Sat, Dec 12")).toBeTruthy();
			expect(screen.queryByTestId("add-to-calendar-changed")).toBeNull();

			await press("Mark as not added");
			await press("Done");
			expect(spies.onMarkNotAdded).toHaveBeenCalledTimes(1);
			expect(spies.onDone).toHaveBeenCalledTimes(1);
		});

		it("offers to add again when the details changed", async () => {
			const { spies } = await show({ body: "added", changed: true });

			expect(screen.getByText("The details changed since this was added.")).toBeTruthy();

			await press("Add again");
			expect(spies.onAddAgain).toHaveBeenCalledTimes(1);
		});
	});

	describe("already", () => {
		it("says the partner added it, and how", async () => {
			const { spies } = await show({ body: "already", partnerMethod: "google_link" });

			expect(screen.getByText("Already on the calendar").props.role).toBe("heading");
			expect(screen.getByText("Steph added this to Google Calendar.")).toBeTruthy();
			expect(screen.getByText("If you two share that calendar, you're set.")).toBeTruthy();

			await press("Add to mine too");
			await press("Got it");
			expect(spies.onAddMine).toHaveBeenCalledTimes(1);
			expect(spies.onGotIt).toHaveBeenCalledTimes(1);
		});
	});

	describe("swapping bodies", () => {
		it("announces the new heading, and the sheet's title on the way back", async () => {
			const { rerender, props } = await show();
			expect(announce).not.toHaveBeenCalled();

			rerender(<AddToCalendarSheet {...props} body="confirm" />);
			expect(announce).toHaveBeenLastCalledWith("Did it save?");

			rerender(<AddToCalendarSheet {...props} body="review" />);
			expect(announce).toHaveBeenLastCalledWith("Add to calendar");
			// The form is back, with what was in it.
			expect(screen.getByLabelText("What").props.value).toBe("Nutcracker");
		});
	});
});
