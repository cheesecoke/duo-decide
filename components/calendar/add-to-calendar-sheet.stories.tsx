import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import {
	COPY,
	initialForm,
	type CalendarBody,
	type CalendarForm,
	type CalendarPlatform,
} from "@/components/calendar/add-to-calendar.model";
import {
	AddToCalendarSheet,
	type AddToCalendarSheetProps,
} from "@/components/calendar/add-to-calendar-sheet";
import { Title } from "@/components/ui/reusables/headline/headline";
import type { FollowUp, FollowUpWhen } from "@/lib/follow-up";

/**
 * AddToCalendarSheet — the four bodies of the Add to calendar drawer, and
 * each state of the form worth looking at.
 *
 * The stories draw the body in a stand-in for `BottomDrawer`'s sheet (its
 * title, its `surface`, its 20 px gutters). Nothing is wired: the buttons
 * that would open Google Calendar do nothing here, but the form is live, so
 * type in it, flip All day, change the destination.
 *
 * "Today" is pinned to Thu, Nov 19, 2026 so the past-date story stays past
 * and the others stay future. (The calendar pop-up uses the real today.)
 *
 * What to look for:
 *
 * - **ExplicitDate / RelativeDate**: the one caption under the date. Change
 *   the date and it goes away, because it was about the prefill.
 * - **NoDate / PastDate**: the date button wears the focus ring, the primary
 *   button reads "Pick a date first" and is disabled.
 * - **Timed**: turn All day off and on; the time and length rows open and
 *   close with `Reveal` (and simply appear under reduce-motion).
 * - **FirstUse / FirstUseWeb**: the "Adding to" choices are open. Pick one
 *   and the row folds to a single line with Change.
 * - **Footer**: side by side at this width. Narrow the window to about 320
 *   px (or raise the browser's text size) and the two buttons stack.
 */

const TODAY = "2026-11-19";
const DECISION = "Want to join me at the Nutcracker on Dec 12?";

const when = (over: Partial<FollowUpWhen> = {}): FollowUpWhen => ({
	date: "2026-12-12",
	time: null,
	matchedText: "Dec 12",
	relative: false,
	source: "parsed",
	foundIn: "title",
	...over,
});

const followUp = (over: Partial<FollowUp> = {}): FollowUp => ({
	suggested: "calendar",
	signal: "parsed_date",
	when: when(),
	datePast: false,
	link: null,
	isYesNo: true,
	negativeWon: false,
	available: ["calendar"],
	...over,
});

type DemoProps = {
	body?: CalendarBody;
	decisionTitle?: string;
	winningOption?: string;
	followUp?: FollowUp;
	platform?: CalendarPlatform;
	/** `null` is first use: the destination choices are open. */
	lastDestination?: string | null;
	form?: Partial<CalendarForm>;
} & Pick<
	AddToCalendarSheetProps,
	"partnerOpening" | "partnerMethod" | "changed" | "error" | "busy" | "showErrors"
>;

/** Holds the form, so the fields can be used. */
function Demo({
	body = "review",
	decisionTitle = DECISION,
	winningOption = "Yes",
	followUp: follow = followUp(),
	platform = "native",
	lastDestination = "google",
	form: over,
	...rest
}: DemoProps) {
	const [form, setForm] = React.useState<CalendarForm>(() => ({
		...initialForm({ decisionTitle, winningOption, followUp: follow, lastDestination, platform }),
		...over,
	}));
	const [partnerOpening, setPartnerOpening] = React.useState(rest.partnerOpening ?? null);

	return (
		<AddToCalendarSheet
			{...rest}
			body={body}
			form={form}
			onFormChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
			platform={platform}
			today={TODAY}
			followUp={follow}
			partnerName="Steph"
			partnerOpening={partnerOpening}
			onAddAnyway={() => setPartnerOpening(null)}
			onPrimary={() => {}}
			onNotNow={() => {}}
		/>
	);
}

const meta = {
	title: "Calendar/AddToCalendarSheet",
	component: Demo,
	decorators: [
		(Story) => (
			<View className="w-full max-w-[390px] gap-3 self-center rounded-sheet bg-surface px-5 pb-5 pt-[18px]">
				<Title>{COPY.drawerTitle}</Title>
				<Story />
			</View>
		),
	],
} satisfies Meta<typeof Demo>;

export default meta;

type Story = StoryObj<typeof meta>;

/* ------------------------------- review ---------------------------------- */

/** A date written in the title: all day, with where it was picked up from. */
export const ExplicitDate: Story = { name: "Review · explicit date (all day)" };

/** "Friday" was worked out from the day the decision was made: ask to check it. */
export const RelativeDate: Story = {
	name: "Review · relative date",
	args: {
		decisionTitle: "Dinner at Sushi Den Friday?",
		followUp: followUp({
			when: when({ date: "2026-12-04", matchedText: "Friday", relative: true }),
		}),
	},
};

/** Nothing found. The date has the focus ring; the button says what is missing. */
export const NoDate: Story = {
	name: "Review · no date",
	args: {
		decisionTitle: "Where should we eat?",
		winningOption: "Tacos",
		followUp: followUp({ suggested: null, signal: "none", when: null, isYesNo: false }),
	},
};

/** The date in the title has gone by. It is not prefilled, and the caption says why. */
export const PastDate: Story = {
	name: "Review · past date",
	args: {
		decisionTitle: "Want to see Wicked on Nov 2?",
		followUp: followUp({
			suggested: null,
			when: when({ date: "2026-11-02", matchedText: "Nov 2" }),
			datePast: true,
		}),
	},
};

/** A time was found, so All day is off and the time and length rows are open. */
export const Timed: Story = {
	name: "Review · timed",
	args: {
		decisionTitle: "Want to join me at the Nutcracker on Dec 12 at 7:30?",
		followUp: followUp({ when: when({ time: "19:30", matchedText: "Dec 12 at 7:30" }) }),
		form: { durationMinutes: 120, location: "Ellie Caulkins Opera House" },
	},
};

/** A submit with All day off and no time: the time field's own error. */
export const BadTime: Story = {
	name: "Review · missing time",
	args: { form: { allDay: false, time: null }, showErrors: true },
};

/** A date stored on the decision when it was made: confirmed, so no caption. */
export const StoredDate: Story = {
	name: "Review · stored date (no caption)",
	args: {
		followUp: followUp({
			signal: "event_date",
			when: when({ source: "stored", matchedText: "", foundIn: null, time: "19:30" }),
		}),
	},
};

/** First use on a phone: the choices are open, Google is picked. */
export const FirstUse: Story = {
	name: "Review · first use (phone)",
	args: { lastDestination: null },
};

/** First use on web: a calendar file instead of "Another calendar". */
export const FirstUseWeb: Story = {
	name: "Review · first use (web)",
	args: { lastDestination: null, platform: "web" },
};

/** Web, with the calendar file remembered: the button hands over a file. */
export const CalendarFile: Story = {
	name: "Review · calendar file (web)",
	args: { lastDestination: "ics", platform: "web" },
};

/** A phone, "Another calendar" picked: not supported yet, with a way to ask. */
export const UnsupportedCalendar: Story = {
	name: "Review · unsupported calendar",
	args: { lastDestination: null, form: { destination: "other", destinationOpen: true } },
};

/** The partner handed off moments ago. "Add anyway" clears it and frees the button. */
export const PartnerMidAdd: Story = {
	name: "Review · partner mid-add",
	args: { partnerOpening: "google_link" },
};

/** The link would not open. */
export const OpenFailed: Story = {
	name: "Review · couldn't open the link",
	args: { error: "open" },
};

/** The shared record would not save, so nothing was opened. */
export const Offline: Story = {
	name: "Review · offline",
	args: { error: "offline" },
};

/** A hand-off in flight. */
export const Busy: Story = { name: "Review · busy", args: { busy: true } };

/* ------------------------------- confirm --------------------------------- */

/** Asked once, on coming back from the calendar. */
export const Confirm: Story = {
	name: "Confirm · did it save?",
	args: { body: "confirm", followUp: followUp({ when: when({ time: "19:30" }) }) },
};

export const ConfirmNotSaved: Story = {
	name: "Confirm · answer not saved",
	args: { body: "confirm", error: "save" },
};

/* -------------------------------- added ---------------------------------- */

export const Added: Story = { name: "Added", args: { body: "added" } };

/** The decision's title or date moved after it was added. */
export const AddedChanged: Story = {
	name: "Added · details changed",
	args: { body: "added", changed: true },
};

/* ------------------------------- already --------------------------------- */

/** The partner got there first. */
export const Already: Story = {
	name: "Already · partner added it",
	args: { body: "already", partnerMethod: "google_link" },
};

/** Added some other way: the calendar is not named. */
export const AlreadyOtherCalendar: Story = {
	name: "Already · another calendar",
	args: { body: "already", partnerMethod: "ics" },
};
