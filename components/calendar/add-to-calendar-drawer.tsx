import * as React from "react";
import { Platform } from "react-native";
import { useRouter } from "expo-router";

import {
	buildEvent,
	icsFileName,
	initialBody,
	initialForm,
	localDay,
	methodFor,
	nextBody,
	partnerHoldsOff,
	usableDestination,
	validate,
	type CalendarBody,
	type CalendarForm,
	type CalendarPlatform,
} from "@/components/calendar/add-to-calendar.model";
import { AddToCalendarSheet, type SheetError } from "@/components/calendar/add-to-calendar-sheet";
import {
	downloadCalendarFile,
	onReturnToApp,
	openCalendarLink,
} from "@/components/calendar/hand-off";
import { getLastDestination, setLastDestination } from "@/components/calendar/last-destination";
import { useCalendarAdds } from "@/context/calendar-adds-provider";
import { useUserContext } from "@/context/user-context-provider";
import { logActionEvent } from "@/lib/action-events";
import { calendarAddView } from "@/lib/calendar-add-view";
import { calendarUid, deviceTimeZone, googleCalendarUrl, icsText } from "@/lib/calendar-link";
import type { FollowUp } from "@/lib/follow-up";
import type { CalendarAddMethod } from "@/types/database";

/**
 * AddToCalendarDrawer — the Add to calendar sheet, wired up. This is what the
 * queue screen hands to `showDrawer(COPY.drawerTitle, …, { type:
 * "addToCalendar" })`.
 *
 * `AddToCalendarSheet` draws; the model decides; this does the things that
 * touch the world: the couple's shared calendar rows (`useCalendarAdds`),
 * opening Google Calendar, noticing the person has come back, and counting.
 *
 * ## The hand-off
 *
 * 1. `markOpened`: the shared row says "I am adding this now", so the
 *    partner's card holds its button back.
 * 2. Open the link (or download the file, on web).
 * 3. When the person comes back (`onReturnToApp`), ask once: "Did it save?"
 * 4. "Yes, added" → `markAdded({ confirmed: true })`. "Not yet" →
 *    `markRemoved`, and back to the form with everything still typed in.
 *
 * **On a phone the write is awaited before the link opens.** If it does not
 * reach the server nothing is opened, and the offline notice says so
 * truthfully. **On web the two start in the same tick**: a browser only lets
 * a new tab open during the tap itself, and Safari counts an `await` as the
 * tap being over. So there a failed write does not stop the hand-off; the
 * answer to "Did it save?" writes the row again.
 *
 * ## The snapshot
 *
 * `snapshot` comes from the caller and is `eventSnapshot` of the decision's
 * own prefill (`prefillSnapshot` in the model), not of what was typed here.
 * The card recomputes the prefill to detect "changed since", so a snapshot
 * of an edited title would read as changed for ever.
 *
 * ## Where it must be mounted
 *
 * Under `CalendarAddsProvider` and `UserContextProvider`. The drawer's
 * content is rendered by `app/(protected)/(tabs)/_layout.tsx` (inside
 * `BottomDrawer`), so a provider mounted in `app/(protected)/_layout.tsx` is
 * above it.
 */

type AddToCalendarDrawerProps = {
	decisionId: string;
	/** The decision's title, as written. */
	decisionTitle: string;
	/** The winning option's title, as written. */
	winningOption?: string | null;
	/** `resolveFollowUp(…)` for this decision: the prefill, and the signal for counting. */
	followUp: FollowUp;
	/** `prefillSnapshot({ decisionTitle, winningOption, followUp })`, computed by the caller. */
	snapshot: string;
	/** The zone a stored event time was confirmed in (`decisions.event_tz`). */
	eventTz?: string | null;
	partnerName: string;
	/**
	 * Open on this body whatever the rows say. `review` is how "Add to my
	 * calendar too" gets past the partner's add. Left out, the rows decide.
	 */
	initialBody?: "review" | "added" | "already";
	onClose: () => void;
};

const PLATFORM: CalendarPlatform = Platform.OS === "web" ? "web" : "native";

function AddToCalendarDrawer({
	decisionId,
	decisionTitle,
	winningOption,
	followUp,
	snapshot,
	eventTz,
	partnerName,
	initialBody: requestedBody,
	onClose,
}: AddToCalendarDrawerProps) {
	const { addsFor, markOpened, markAdded, markRemoved } = useCalendarAdds();
	const { userContext } = useUserContext();
	const userId = userContext?.userId ?? null;
	const router = useRouter();

	const adds = addsFor(decisionId);
	const view = calendarAddView(adds.mine, adds.partner, new Date(), snapshot);
	const today = localDay(new Date());

	const [body, setBody] = React.useState<CalendarBody>(() => initialBody(view.kind, requestedBody));
	const [form, setForm] = React.useState<CalendarForm>(() =>
		// Collapsed on Google until the remembered destination has been read:
		// see the effect below.
		initialForm({
			decisionTitle,
			winningOption,
			followUp,
			lastDestination: "google",
			platform: PLATFORM,
		}),
	);
	const [error, setError] = React.useState<SheetError | null>(null);
	const [busy, setBusy] = React.useState(false);
	const [showErrors, setShowErrors] = React.useState(false);
	/** "Add anyway" / "Add to mine too" / an explicit `review`: stop deferring to the partner. */
	const [insisted, setInsisted] = React.useState(requestedBody === "review");
	/** The link is open and the person has not come back yet. */
	const [awaitingReturn, setAwaitingReturn] = React.useState(false);

	/** How the last hand-off was made, for the row "Yes, added" writes. */
	const handedOffBy = React.useRef<CalendarAddMethod | null>(null);
	/** Mine was already `added` when this hand-off began ("Add again"). */
	const wasAdded = React.useRef(false);
	const mounted = React.useRef(true);
	React.useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);

	// The destination last used on this device. Read once; ignored if the
	// person has already touched the row. `null` is first use: open the choices.
	const destinationTouched = React.useRef(false);
	React.useEffect(() => {
		let active = true;
		void getLastDestination(userId).then((stored) => {
			if (!active || destinationTouched.current) return;
			setForm((current) => ({
				...current,
				destination: usableDestination(stored, PLATFORM),
				destinationOpen: stored == null,
			}));
		});
		return () => {
			active = false;
		};
	}, [userId]);

	const onFormChange = React.useCallback((patch: Partial<CalendarForm>) => {
		if ("destination" in patch || "destinationOpen" in patch) destinationTouched.current = true;
		setForm((current) => ({ ...current, ...patch }));
	}, []);

	// Back from the calendar: ask once.
	React.useEffect(() => {
		if (!awaitingReturn) return;
		return onReturnToApp(() => {
			setAwaitingReturn(false);
			setBody((current) => nextBody(current, "returned"));
		});
	}, [awaitingReturn]);

	// The partner's add landed while the form was open: say so, rather than
	// let the event go on the shared calendar twice.
	React.useEffect(() => {
		if (view.kind === "partner-added" && body === "review" && !insisted && !awaitingReturn && !busy) {
			setBody("already");
		}
	}, [view.kind, body, insisted, awaitingReturn, busy]);

	const submit = async () => {
		if (busy) return;
		const check = validate(form, today);
		if (!check.ok) {
			setShowErrors(true);
			return;
		}

		// A time confirmed on the create form means that time *where it was
		// confirmed*. Left as it was, it keeps that zone; a time typed here is
		// this phone's.
		const stored = followUp.when?.source === "stored" && !form.allDay;
		const keepsZone =
			stored && form.time === followUp.when?.time && form.date === followUp.when?.date;
		const event = buildEvent(form, (keepsZone ? eventTz : null) ?? deviceTimeZone());
		const destination = form.destination === "ics" ? "ics" : "google";
		const method = methodFor(destination);
		const url = destination === "google" ? googleCalendarUrl(event) : null;
		const file = destination === "ics" ? icsText(event, calendarUid(decisionId)) : null;
		if (!url && !file) {
			setError("open");
			return;
		}

		setError(null);
		setShowErrors(false);
		setBusy(true);
		handedOffBy.current = method;

		// The shared row first, so the partner's card holds off.
		// Unless mine is already on the calendar ("Add again"): that row stays
		// `added`, so the partner's card does not flip back to "adding now" and
		// a "Not yet" cannot unmark an event that is really there.
		const alreadyAdded = adds.mine?.state === "added";
		wasAdded.current = alreadyAdded;
		const writing = alreadyAdded
			? Promise.resolve(true)
			: markOpened(decisionId, { method, snapshot });
		// A phone waits for it; web cannot (see the file comment).
		if (PLATFORM === "native" && !(await writing)) {
			if (!mounted.current) return;
			setBusy(false);
			setError("offline");
			return;
		}

		const opened = url
			? await openCalendarLink(url)
			: downloadCalendarFile(file ?? "", icsFileName(form.title));
		if (PLATFORM === "web") await writing;
		if (!mounted.current) return;

		if (!opened) {
			// Nothing was handed off: do not leave the partner held back.
			if (!alreadyAdded) void markRemoved(decisionId);
			setBusy(false);
			setError("open");
			return;
		}

		void setLastDestination(userId, destination);
		setBusy(false);
		if (url) {
			setAwaitingReturn(true);
		} else {
			// A download does not leave the page: there is no coming back to wait for.
			setBody((current) => nextBody(current, "returned"));
		}
	};

	/** Runs a write from one of the later bodies; on failure, says it was not saved. */
	const save = async (write: () => Promise<boolean>, then: () => void) => {
		if (busy) return;
		setError(null);
		setBusy(true);
		const ok = await write();
		if (!mounted.current) return;
		setBusy(false);
		if (ok) then();
		else setError("save");
	};

	const onYes = () =>
		save(
			() =>
				markAdded(decisionId, {
					method: handedOffBy.current ?? adds.mine?.method ?? methodFor(form.destination),
					snapshot,
					confirmed: true,
				}),
			() => {
				logActionEvent({
					decisionId,
					action: "calendar",
					event: "completed",
					signal: followUp.signal,
				});
				setBody((current) => nextBody(current, "yes"));
			},
		);

	const onNotYet = () =>
		save(
			() => (wasAdded.current ? Promise.resolve(true) : markRemoved(decisionId)),
			() => setBody((current) => nextBody(current, "notYet")),
		);

	const onMarkNotAdded = () =>
		save(
			() => markRemoved(decisionId),
			() => {
				setInsisted(true);
				setBody((current) => nextBody(current, "markNotAdded"));
			},
		);

	const onNotNow = () => {
		logActionEvent({ decisionId, action: "calendar", event: "dismissed", signal: followUp.signal });
		onClose();
	};

	return (
		<AddToCalendarSheet
			body={body}
			form={form}
			onFormChange={onFormChange}
			platform={PLATFORM}
			today={today}
			followUp={followUp}
			partnerName={partnerName}
			partnerOpening={
				partnerHoldsOff(view.kind) && !insisted && adds.partner ? adds.partner.method : null
			}
			partnerMethod={adds.partner?.method}
			changed={view.changed}
			error={error}
			// Not held while waiting for the person to come back: if the tab
			// never opened (a blocked pop-up), the button has to work again.
			busy={busy}
			showErrors={showErrors}
			onPrimary={() => void submit()}
			onRetry={() => void submit()}
			onNotNow={onNotNow}
			onAddAnyway={() => setInsisted(true)}
			onAskForIt={() => {
				onClose();
				router.push("/support");
			}}
			onYes={() => void onYes()}
			onNotYet={() => void onNotYet()}
			onMarkNotAdded={() => void onMarkNotAdded()}
			onDone={onClose}
			onAddAgain={() => {
				setInsisted(true);
				setBody((current) => nextBody(current, "addAgain"));
			}}
			onAddMine={() => {
				setInsisted(true);
				setBody((current) => nextBody(current, "addMine"));
			}}
			onGotIt={onClose}
		/>
	);
}

export { AddToCalendarDrawer };
export type { AddToCalendarDrawerProps };
