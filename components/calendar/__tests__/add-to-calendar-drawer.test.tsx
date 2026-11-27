import { act, fireEvent, render, screen, userEvent } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import * as React from "react";
import { AppState, Linking } from "react-native";

import {
	AddToCalendarDrawer,
	type AddToCalendarDrawerProps,
} from "@/components/calendar/add-to-calendar-drawer";
import { prefillSnapshot } from "@/components/calendar/add-to-calendar.model";
import { useCalendarAdds } from "@/context/calendar-adds-provider";
import { logActionEvent } from "@/lib/action-events";
import type { FollowUp } from "@/lib/follow-up";
import type { CalendarAdd } from "@/types/database";

/**
 * The container, with the three things it touches mocked: the couple's
 * calendar rows (`useCalendarAdds`), `Linking`, and `AppState`. The
 * react-native mock reports iOS, so this is the phone's flow: the shared row
 * is written and awaited before the link opens.
 */

jest.mock("@/context/calendar-adds-provider", () => ({ useCalendarAdds: jest.fn() }));
jest.mock("@/context/user-context-provider", () => ({
	useUserContext: () => ({ userContext: { userId: "me" } }),
}));
jest.mock("@/lib/action-events", () => ({ logActionEvent: jest.fn() }));

const DECISION_ID = "decision-1";
const TITLE = "Want to join me at the Nutcracker on Dec 12?";
/** Far enough out that the test never meets its own date. */
const DAY = `${new Date().getFullYear() + 1}-12-12`;

const FOLLOW_UP: FollowUp = {
	suggested: "calendar",
	signal: "parsed_date",
	when: {
		date: DAY,
		time: "19:30",
		matchedText: "Dec 12",
		relative: false,
		source: "parsed",
		foundIn: "title",
	},
	datePast: false,
	link: null,
	isYesNo: true,
	negativeWon: false,
	available: ["calendar"],
};

const SNAPSHOT = prefillSnapshot({
	decisionTitle: TITLE,
	winningOption: "Yes",
	followUp: FOLLOW_UP,
});

const row = (over: Partial<CalendarAdd> = {}): CalendarAdd => ({
	id: "row-1",
	decision_id: DECISION_ID,
	couple_id: "couple-1",
	added_by: "partner",
	method: "google_link",
	state: "added",
	confirmed: true,
	external_event_id: null,
	snapshot: SNAPSHOT,
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString(),
	...over,
});

const markOpened = jest.fn();
const markAdded = jest.fn();
const markRemoved = jest.fn();
const push = jest.fn();
let adds: { mine: CalendarAdd | null; partner: CalendarAdd | null };
/** What the drawer handed `AppState.addEventListener`. */
let appStateListener: ((state: string) => void) | null;
const removeAppStateListener = jest.fn();

beforeEach(() => {
	adds = { mine: null, partner: null };
	appStateListener = null;
	markOpened.mockResolvedValue(true);
	markAdded.mockResolvedValue(true);
	markRemoved.mockResolvedValue(true);
	(useCalendarAdds as jest.Mock).mockImplementation(() => ({
		addsFor: () => adds,
		markOpened,
		markAdded,
		markRemoved,
	}));
	(useRouter as jest.Mock).mockReturnValue({ push });
	(Linking.openURL as jest.Mock).mockResolvedValue(true);
	(AsyncStorage.getItem as jest.Mock).mockResolvedValue("google");
	(AppState.addEventListener as jest.Mock).mockImplementation((_type, listener) => {
		appStateListener = listener;
		return { remove: removeAppStateListener };
	});
});

async function open(over: Partial<AddToCalendarDrawerProps> = {}) {
	const onClose = jest.fn();
	const view = render(
		<AddToCalendarDrawer
			decisionId={DECISION_ID}
			decisionTitle={TITLE}
			winningOption="Yes"
			followUp={FOLLOW_UP}
			snapshot={SNAPSHOT}
			partnerName="Steph"
			onClose={onClose}
			{...over}
		/>,
	);
	// The remembered destination, and `useReducedMotion`, both resolve into state.
	await act(async () => {});
	return { ...view, onClose };
}

const press = (label: string) => userEvent.setup().press(screen.getByLabelText(label));

/** The person comes back from the calendar. */
const comeBack = () =>
	act(async () => {
		appStateListener?.("active");
	});

describe("AddToCalendarDrawer", () => {
	it("opens on the form, prefilled from the decision", async () => {
		await open();

		expect(screen.getByLabelText("What").props.value).toBe("Nutcracker");
		expect(screen.getByLabelText("Starts").props.value).toBe("7:30");
		expect(screen.getByLabelText("All day").props.accessibilityState).toEqual({ checked: false });
		expect(screen.getByLabelText("Note").props.value).toBe(
			`Decided together in Duo.\n\n${TITLE}\nWe picked: Yes`,
		);
		// A remembered destination: the row is collapsed.
		expect(screen.getByLabelText("Change calendar")).toBeTruthy();
	});

	it("opens the destination choices on first use", async () => {
		(AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
		await open();

		expect(screen.getByLabelText("Adding to").props.role).toBe("radiogroup");
	});

	describe("the happy path", () => {
		it("marks it opened, opens Google, asks on return, and records the yes", async () => {
			const { onClose } = await open();

			await press("Open in Google Calendar");

			// The shared row first, with the caller's snapshot, then the link.
			expect(markOpened).toHaveBeenCalledWith(DECISION_ID, {
				method: "google_link",
				snapshot: SNAPSHOT,
			});
			expect(Linking.openURL).toHaveBeenCalledTimes(1);
			const url = (Linking.openURL as jest.Mock).mock.calls[0][0] as string;
			expect(url).toContain("https://calendar.google.com/calendar/render?action=TEMPLATE");
			expect(url).toContain("text=Nutcracker");
			expect(url).toContain(`dates=${DAY.replace(/-/g, "")}T193000/${DAY.replace(/-/g, "")}T203000`);
			expect(markOpened.mock.invocationCallOrder[0]).toBeLessThan(
				(Linking.openURL as jest.Mock).mock.invocationCallOrder[0],
			);
			// Still the form until they come back.
			expect(screen.getByTestId("add-to-calendar-review")).toBeTruthy();
			expect(AsyncStorage.setItem).toHaveBeenCalledWith("duo_calendar_destination_me", "google");

			await comeBack();
			expect(screen.getByText("Did it save?")).toBeTruthy();
			expect(removeAppStateListener).toHaveBeenCalled();

			await press("Yes, added");
			expect(markAdded).toHaveBeenCalledWith(DECISION_ID, {
				method: "google_link",
				snapshot: SNAPSHOT,
				confirmed: true,
			});
			expect(logActionEvent).toHaveBeenCalledWith({
				decisionId: DECISION_ID,
				action: "calendar",
				event: "completed",
				signal: "parsed_date",
			});
			expect(screen.getByText("On the calendar")).toBeTruthy();

			await press("Done");
			expect(onClose).toHaveBeenCalledTimes(1);
		});

		it("sends what was typed, but the caller's snapshot", async () => {
			await open();

			fireEvent.changeText(screen.getByLabelText("What"), "The Nutcracker");
			fireEvent.changeText(screen.getByLabelText("Where"), "Ellie Caulkins");
			await press("Open in Google Calendar");

			const url = (Linking.openURL as jest.Mock).mock.calls[0][0] as string;
			expect(url).toContain("text=The%20Nutcracker");
			expect(url).toContain("location=Ellie%20Caulkins");
			expect(markOpened).toHaveBeenCalledWith(DECISION_ID, {
				method: "google_link",
				snapshot: SNAPSHOT,
			});
		});

		it("ignores coming back to the app when nothing was handed off", async () => {
			await open();

			await comeBack();

			expect(screen.getByTestId("add-to-calendar-review")).toBeTruthy();
		});
	});

	describe("not yet", () => {
		it("takes the row back and returns to the form with the fields intact", async () => {
			await open();
			fireEvent.changeText(screen.getByLabelText("Where"), "Ellie Caulkins");
			await press("Open in Google Calendar");
			await comeBack();

			await press("Not yet");

			expect(markRemoved).toHaveBeenCalledWith(DECISION_ID);
			expect(markAdded).not.toHaveBeenCalled();
			expect(logActionEvent).not.toHaveBeenCalled();
			expect(screen.getByTestId("add-to-calendar-review")).toBeTruthy();
			expect(screen.getByLabelText("Where").props.value).toBe("Ellie Caulkins");
			expect(screen.getByLabelText("What").props.value).toBe("Nutcracker");
		});

		it("stays on the question when the answer could not be saved", async () => {
			await open();
			await press("Open in Google Calendar");
			await comeBack();
			markAdded.mockResolvedValue(false);

			await press("Yes, added");

			expect(screen.getByText("Did it save?")).toBeTruthy();
			expect(screen.getByTestId("add-to-calendar-error").props.role).toBe("alert");
			expect(logActionEvent).not.toHaveBeenCalled();
		});
	});

	describe("the partner", () => {
		it("already added it: says so instead of the form", async () => {
			adds = { mine: null, partner: row() };
			const { onClose } = await open();

			expect(screen.getByText("Already on the calendar")).toBeTruthy();
			expect(screen.getByText("Steph added this to Google Calendar.")).toBeTruthy();
			expect(screen.queryByTestId("add-to-calendar-review")).toBeNull();

			await press("Got it");
			expect(onClose).toHaveBeenCalledTimes(1);
			expect(markOpened).not.toHaveBeenCalled();
		});

		it("already added it: 'Add to mine too' goes to the form and stays there", async () => {
			adds = { mine: null, partner: row() };
			await open();

			await press("Add to mine too");

			expect(screen.getByTestId("add-to-calendar-review")).toBeTruthy();
			expect(screen.getByLabelText("Open in Google Calendar").props.accessibilityState).toEqual({
				disabled: false,
			});
		});

		it("already added it, but the caller asked for the form", async () => {
			adds = { mine: null, partner: row() };
			await open({ initialBody: "review" });

			expect(screen.getByTestId("add-to-calendar-review")).toBeTruthy();
		});

		it("adds it while my form is open: the form gives way", async () => {
			const { rerender } = await open();
			expect(screen.getByTestId("add-to-calendar-review")).toBeTruthy();

			adds = { mine: null, partner: row() };
			rerender(
				<AddToCalendarDrawer
					decisionId={DECISION_ID}
					decisionTitle={TITLE}
					winningOption="Yes"
					followUp={FOLLOW_UP}
					snapshot={SNAPSHOT}
					partnerName="Steph"
					onClose={jest.fn()}
				/>,
			);
			await act(async () => {});

			expect(screen.getByText("Already on the calendar")).toBeTruthy();
		});

		it("is mid-add: the button waits for 'Add anyway'", async () => {
			adds = { mine: null, partner: row({ state: "opened", confirmed: false }) };
			await open();

			expect(screen.getByTestId("add-to-calendar-partner-opening")).toBeTruthy();
			expect(screen.getByLabelText("Open in Google Calendar").props.accessibilityState).toEqual({
				disabled: true,
			});

			await press("Add anyway");

			expect(screen.queryByTestId("add-to-calendar-partner-opening")).toBeNull();
			expect(screen.getByLabelText("Open in Google Calendar").props.accessibilityState).toEqual({
				disabled: false,
			});
		});
	});

	describe("my own rows", () => {
		it("an unanswered hand-off opens on the question", async () => {
			adds = {
				mine: row({ added_by: "me", state: "opened", confirmed: false, method: "ics" }),
				partner: null,
			};
			await open();

			expect(screen.getByText("Did it save?")).toBeTruthy();

			await press("Yes, added");
			// No hand-off in this session: the row says how it was made.
			expect(markAdded).toHaveBeenCalledWith(DECISION_ID, {
				method: "ics",
				snapshot: SNAPSHOT,
				confirmed: true,
			});
		});

		it("already added: 'Mark as not added' takes it back and shows the form", async () => {
			adds = { mine: row({ added_by: "me" }), partner: null };
			await open();
			expect(screen.getByText("On the calendar")).toBeTruthy();

			await press("Mark as not added");

			expect(markRemoved).toHaveBeenCalledWith(DECISION_ID);
			expect(screen.getByTestId("add-to-calendar-review")).toBeTruthy();
		});

		it("already added: a failed take-back says so and stays put", async () => {
			adds = { mine: row({ added_by: "me" }), partner: null };
			markRemoved.mockResolvedValue(false);
			await open();

			await press("Mark as not added");

			expect(screen.getByText("On the calendar")).toBeTruthy();
			expect(screen.getByTestId("add-to-calendar-error").props.role).toBe("alert");
		});

		it("added with other details: offers to add again", async () => {
			adds = { mine: row({ added_by: "me", snapshot: "v1:00000000" }), partner: null };
			await open();

			await press("Add again");

			expect(screen.getByTestId("add-to-calendar-review")).toBeTruthy();
		});
	});

	describe("failures", () => {
		it("the link will not open: says so, frees the partner, and can try again", async () => {
			(Linking.openURL as jest.Mock).mockRejectedValueOnce(new Error("no handler"));
			await open();

			await press("Open in Google Calendar");

			expect(screen.getByTestId("add-to-calendar-error").props.role).toBe("alert");
			expect(screen.getByText("We couldn't open Google Calendar.")).toBeTruthy();
			expect(markRemoved).toHaveBeenCalledWith(DECISION_ID);
			expect(AsyncStorage.setItem).not.toHaveBeenCalled();

			// Nothing is being waited for.
			await comeBack();
			expect(screen.getByTestId("add-to-calendar-review")).toBeTruthy();

			await press("Try again");
			expect(Linking.openURL).toHaveBeenCalledTimes(2);
			expect(screen.queryByTestId("add-to-calendar-error")).toBeNull();

			await comeBack();
			expect(screen.getByText("Did it save?")).toBeTruthy();
		});

		it("the shared row will not save: nothing is opened, and the offline copy shows", async () => {
			markOpened.mockResolvedValue(false);
			await open();

			await press("Open in Google Calendar");

			expect(Linking.openURL).not.toHaveBeenCalled();
			expect(
				screen.getByText(
					"No connection right now, so nothing was added. Try again when you're back online.",
				),
			).toBeTruthy();

			markOpened.mockResolvedValue(true);
			await press("Try again");
			expect(Linking.openURL).toHaveBeenCalledTimes(1);
		});

		it("a timed event with no time: the press shows the field's error and opens nothing", async () => {
			await open();
			fireEvent.changeText(screen.getByLabelText("Starts"), "");

			await press("Open in Google Calendar");

			expect(screen.getByText("Try a time like 7:30.")).toBeTruthy();
			expect(markOpened).not.toHaveBeenCalled();
			expect(Linking.openURL).not.toHaveBeenCalled();
		});
	});

	describe("leaving", () => {
		it("'Not now' closes and counts a dismissal", async () => {
			const { onClose } = await open();

			await press("Not now");

			expect(onClose).toHaveBeenCalledTimes(1);
			expect(logActionEvent).toHaveBeenCalledWith({
				decisionId: DECISION_ID,
				action: "calendar",
				event: "dismissed",
				signal: "parsed_date",
			});
		});

		it("'Ask for it' closes the sheet and goes to /support", async () => {
			(AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
			const { onClose } = await open();

			await press("Another calendar");
			await press("Ask for it");

			expect(onClose).toHaveBeenCalledTimes(1);
			expect(push).toHaveBeenCalledWith("/support");
		});

		it("stops listening for the return when it closes", async () => {
			const { unmount } = await open();
			await press("Open in Google Calendar");

			unmount();

			expect(removeAppStateListener).toHaveBeenCalled();
		});
	});
});
