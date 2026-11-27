/**
 * decision-card.model.ts — the decision card's props and its state machine.
 *
 * Everything the card *decides* lives here as a pure function, so the whole
 * FEATURE-INVENTORY §1.10a matrix is assertable without rendering: the 7-case
 * CTA ladder, the 6 status badges, the round colour, when options go dead, and
 * the two voter marks (including the privacy rule).
 *
 * Copy is verbatim from FEATURE-INVENTORY §1.10a. Where the round-3 mock
 * (design-refs/mocks/decision-queue-round-3.html) writes a friendlier label —
 * "Lock my vote", "Sam decides this round", "Select an option" — the
 * inventory wins, per the PLAN-3 task-6 brief. The mock's *colours* are
 * followed, because the inventory's palette (yellow / green / round1-3
 * purple) does not exist in the v2 token set.
 */

import type { CalendarAddView } from "@/lib/calendar-add-view";
import type { FollowUp, FollowUpAction } from "@/lib/follow-up";

export type Person = { name: string; person: "a" | "b" };

export type DecisionCardOption = { id: string; title: string; selected: boolean };

export type DecisionMode = "vote" | "poll";
export type DecisionStatus = "pending" | "voted" | "completed";
export type DecisionRound = 1 | 2 | 3;

/** What `onSaveEdit` is handed when the creator confirms an inline edit. */
export type DecisionEditDraft = {
	title: string;
	description: string;
	deadline: Date | null;
	options: string[];
};

export type DecisionCardProps = {
	id: string;
	title: string;
	/** `UIDecision.details`. */
	description: string;
	mode: DecisionMode;
	status: DecisionStatus;
	/** Poll only; vote mode ignores it. */
	currentRound: DecisionRound;
	/** 0, 1, or 2+ — all three renders exist. */
	options: DecisionCardOption[];
	/** `null` → "No deadline". */
	deadline: Date | null;
	createdBy: Person;
	/** The viewer. */
	you: Person;
	/** `null` → the name falls back to the literal "Partner", person "b". */
	partner: Person | null;
	/** Completed only. */
	decidedBy: string | null;
	youVotedThisRound: boolean;
	partnerVotedThisRound: boolean;
	expanded: boolean;
	editing: boolean;
	submitting: boolean;
	/** Inline strip above the body (mock `.strip`). */
	error?: string | null;
	onToggle(): void;
	onOptionSelect(optionId: string): void;
	onDecide(): void;
	onEdit(): void;
	onCancelEdit(): void;
	onSaveEdit(draft: DecisionEditDraft): void;
	/**
	 * An open decision's ⋮ → Delete (a soft delete since migration 024). The
	 * card only calls it; confirmation is the screen's job.
	 */
	onDelete(): void;
	/** A decided decision's ⋮ → Archive: off the queue, still in History. */
	onArchive(): void;

	/* ---- the decided card's next action (all optional) ------------------- */

	/**
	 * What a decided decision offers next (`resolveFollowUp`, lib/follow-up.ts).
	 * `null` / left out → nothing is suggested and the ⋮ menu gains no
	 * follow-ups: the card ends at its option rows.
	 */
	followUp?: FollowUp | null;
	/**
	 * The two partners' calendar rows as one view (`calendarAddView`,
	 * lib/calendar-add-view.ts). Left out → `{ kind: "none", changed: false }`.
	 * Anything but `none` takes the footer slot over a suggested pill.
	 */
	calendar?: CalendarAddView;
	/**
	 * The clock the date label's year rule reads ("Fri, Dec 12", and the year
	 * only when it is not this one). Left out → the moment of the render.
	 */
	now?: Date;
	/**
	 * A follow-up was picked: from the footer pill (`slot`) or the ⋮ menu
	 * (`menu`). `calendar` means "open the calendar sheet" — it is also what
	 * "Add again" and "Add to my calendar too" call.
	 */
	onFollowUp?(action: FollowUpAction, from: FollowUpFrom): void;
	/** The inline "Did it save?  Yes · Not yet". */
	onCalendarAnswer?(answer: CalendarAnswer): void;
	/** A press on a calendar status line ("Sam added it to the calendar …"). */
	onCalendarOpen?(): void;
	/** ⋮ → "Mark as not added". */
	onCalendarRemove?(): void;
};

export type FollowUpFrom = "slot" | "menu";
export type CalendarAnswer = "yes" | "not-yet";

/** What `calendar` is when the screen passes none. */
export const NO_CALENDAR: CalendarAddView = { kind: "none", changed: false };

/**
 * The slice of the props every helper below reads. Pulled out so a table row
 * in the tests is a dozen fields rather than the full component contract.
 */
export type DecisionCardState = Pick<
	DecisionCardProps,
	| "mode"
	| "status"
	| "currentRound"
	| "options"
	| "createdBy"
	| "you"
	| "partner"
	| "decidedBy"
	| "youVotedThisRound"
	| "partnerVotedThisRound"
	| "submitting"
>;

/**
 * FEATURE-INVENTORY §1.10a: with nobody linked the app shows the literal
 * "Partner". Person "b" because the viewer is always drawn as their own hue
 * and the other seat is the other hue.
 */
export const PARTNER_FALLBACK: Person = { name: "Partner", person: "b" };

/** Every verbatim string the card renders that is not a helper's own label. */
export const COPY = {
	/** OptionsDisplay.tsx:42-44 — zero options, either mode. */
	emptyOptions: "Please add options",
	/** OptionsDisplay.tsx:47-68 — exactly one option. */
	validateVote: "Add more than one option",
	validatePoll: "Add at least 2 options to avoid bias",
	/** DecisionCardHeader.tsx:141-152 — a null deadline. */
	noDeadline: "No deadline",
	/**
	 * The inline edit form's deadline row. It read "Deadline" until the
	 * decision gained a separate *event* date (migration 028): this one is when
	 * to decide by, and the label now says so.
	 */
	deadlineLabel: "Decide by",
	/** DecisionCardHeader.tsx:164 — the picker's empty state, verbatim. */
	deadlinePlaceholder: "Select deadline",
	createdBy: (name: string) => `Created by ${name}`,
	/** The header meta line of a decided card, in the deadline's place. */
	decidedBy: (name: string) => `Decided by ${name}`,
	/** The ⋮ menu's rows. A row's label is also its accessible name. */
	menu: {
		archive: "Archive",
		delete: "Delete decision",
		calendar: "Add to calendar",
		open_link: "Open link",
		decide_next: "Decide the next thing",
		calendar_remove: "Mark as not added",
		calendar_add_mine: "Add to my calendar too",
	},
	/** The footer slot of a decided card (`resolveFooter`). */
	followUp: {
		addToCalendar: "Add to calendar",
		addAgain: "Add again",
		openLink: "Open link",
		decideNext: "Decide the next thing",
		calendarHint: "Opens the calendar sheet",
		openLinkHint: "Opens the link in the winning option",
		decideNextHint: "Starts a new decision",
		didItSave: "Did it save?",
		yes: "Yes",
		yesLabel: "Yes, it saved",
		notYet: "Not yet",
		notYetLabel: "Not yet, it did not save",
		partnerOpening: (name: string) => `${name} is adding this now`,
		youAdded: "You added it to the calendar",
		partnerAdded: (name: string) => `${name} added it to the calendar`,
		bothAdded: "You both added it to the calendar",
		changed: "Changed since it was added",
	},
	/** CollapsibleCard.tsx:228-277 — the poll body's heading. */
	round: (round: DecisionRound) => `Round ${round}`,
	/**
	 * The voter line. VotingStatusIndicator renders "{name}:" plus an icon;
	 * a `Character`'s pose is not in its accessible label, so the state has
	 * to be said in words too. The three words are the round-3 mock's
	 * (`voterHTML`): "voted", "waiting", "sitting out".
	 */
	voter: (name: string, mark: VoterMark) => `${name}: ${VOTER_WORD[mark]}`,
} as const;

/**
 * "selected" says the same word as "idle" on purpose: the difference is that
 * you have a pick in flight, not that you have acted, and the mock draws that
 * distinction in colour (a muted character vs. a coloured one) rather than in
 * copy. Saying "selected" out loud would also be the one place the card could
 * leak a pick, if the partner line ever grew one.
 */
const VOTER_WORD: Record<VoterMark, string> = {
	voted: "voted",
	blocked: "sitting out",
	selected: "waiting",
	idle: "waiting",
};

/* -------------------------------------------------------------------------- */
/* predicates                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * CollapsibleCard.tsx:91 — the app compares *names*, not ids, and that is
 * kept as-is. It is wrong for two people who share a first name, but it is
 * the behaviour today and Task 7 owns where the props come from.
 */
export function isCreator(p: Pick<DecisionCardState, "createdBy" | "you">): boolean {
	return p.createdBy.name === p.you.name;
}

/**
 * What the card's ⋮ menu holds (Chase, Nov 2026).
 *
 * - **Open** → `delete`, for the creator only. It is a soft delete; the
 *   confirm sheet still asks first. Anyone else gets nothing, and the card
 *   shows no ⋮ at all.
 * - **Decided** → in this order:
 *   1. every follow-up that is *available* (`FollowUp.available`) and is not
 *      what the footer slot is already offering. `calendar` is always
 *      available on a decided decision, so a date the ladder missed is one
 *      tap away here;
 *   2. the calendar's own items: `calendar_remove` ("Mark as not added") once
 *      I have added it, `calendar_add_mine` ("Add to my calendar too") when
 *      only the partner has;
 *   3. `archive`, last, for either partner: the queue is shared, a finished
 *      decision is finished for both, and History keeps it. There is no
 *      delete here — deleting is History's job.
 *
 * `followUp` left out or `null` → no follow-ups at all (rule 1 is skipped), so
 * with no calendar rows either the menu is `archive` alone.
 *
 * ## When "Add to calendar" is *not* in the menu
 *
 * - it is the footer pill (suggested, or "Add again" on a changed event);
 * - the slot is asking me "Did it save?" (`mine-opened`);
 * - the partner is mid-add (`partner-opening`): the line opens the sheet,
 *   which is where "Add anyway" lives, and a second door would land the event
 *   twice;
 * - somebody has added it: the two calendar items above take over.
 *
 * A partner's *stale* hand-off (`partner-started`) holds nothing back: the
 * card reads as if nobody had started, pill or plain `calendar` row.
 */
export type CardMenuAction =
	| "archive"
	| "delete"
	| FollowUpAction
	| "calendar_remove"
	| "calendar_add_mine";

export function menuActions(
	p: Pick<DecisionCardProps, "status" | "createdBy" | "you" | "followUp" | "calendar">,
): CardMenuAction[] {
	if (p.status !== "completed") return isCreator(p) ? ["delete"] : [];

	const calendar = p.calendar ?? NO_CALENDAR;
	// A stale hand-off holds nothing back: the same as nobody having started.
	const idle = calendar.kind === "none" || calendar.kind === "partner-started";
	const suggested = idle ? (p.followUp?.suggested ?? null) : null;
	const actions: CardMenuAction[] = [];

	for (const action of p.followUp?.available ?? []) {
		if (action === "calendar") {
			if (idle && suggested !== "calendar") actions.push("calendar");
		} else if (action !== suggested) {
			actions.push(action);
		}
	}

	if (calendar.kind === "mine-added" || calendar.kind === "both-added") {
		actions.push("calendar_remove");
	}
	// Changed: the footer pill is already "Add again", the same door.
	if (calendar.kind === "partner-added" && !calendar.changed) actions.push("calendar_add_mine");

	actions.push("archive");
	return actions;
}

/** The partner, or the "Partner" stand-in when nobody is linked. */
export function partnerOf(p: Pick<DecisionCardState, "partner">): Person {
	return p.partner ?? PARTNER_FALLBACK;
}

/**
 * Whether *you* have cast a vote that counts right now.
 *
 * Poll mode has a per-round ledger, so it is `youVotedThisRound`
 * (CollapsibleCard.tsx:95). Vote mode has none: DecisionDecideButton.tsx:63
 * reads a selected option as "you voted", because in vote mode the creator
 * cannot select and the partner's selection *is* the vote.
 */
export function hasYouVoted(
	p: Pick<DecisionCardState, "mode" | "options" | "youVotedThisRound">,
): boolean {
	return p.mode === "vote" ? p.options.some((option) => option.selected) : p.youVotedThisRound;
}

/** CollapsibleCard.tsx:101-107, unchanged. */
export function canDecide(p: DecisionCardState): boolean {
	const hasSelectedOption = p.options.some((option) => option.selected);
	const hasMinimumOptions = p.options.length >= 2;
	const votedThisRound = p.mode === "poll" && p.youVotedThisRound;

	return (
		hasSelectedOption &&
		hasMinimumOptions &&
		!votedThisRound &&
		(p.mode === "vote" ? !isCreator(p) && (p.status === "pending" || p.status === "voted") : true)
	);
}

/* -------------------------------------------------------------------------- */
/* the two colours: person state, and the poll round thread                    */
/* -------------------------------------------------------------------------- */

export type RoundTone = "a" | "b" | "together" | "neutral";

/**
 * Who has a vote in, counted the way this mode counts them.
 *
 * Poll has a per-round ledger and just reads it. Vote has none: `status:
 * "voted"` means *exactly one* of the two has voted — the second vote
 * completes the decision — and DecisionDecideButton.tsx:63 reads a selected
 * option as that vote being yours. So in vote mode "voted, and no selection
 * of mine" is the partner, which is the case that used to be painted in the
 * viewer's own hue.
 */
function voters(p: DecisionCardState): { you: boolean; partner: boolean } {
	if (p.mode === "poll") {
		return { you: p.youVotedThisRound, partner: p.partnerVotedThisRound };
	}
	if (p.status !== "voted") return { you: false, partner: p.partnerVotedThisRound };

	const you = hasYouVoted(p);
	return { you, partner: p.partnerVotedThisRound || !you };
}

/**
 * **Whose card this is** — the person state, in both modes, as the round-3
 * mock's `cardState()`: nobody yet is neutral, one of you is that person's
 * hue, both of you (or a finished decision) is `together`.
 *
 * This is what `Card` wears, what the badge wears, and what a vote-mode CTA
 * wears. It is deliberately *not* the round colour: a poll card can be in
 * round 2 (person B's round) while only you have voted (person A's state),
 * and those are two different facts about it.
 */
export function resolveCardState(p: DecisionCardState): RoundTone {
	if (p.status === "completed") return "together";

	const voted = voters(p);
	if (voted.you && voted.partner) return "together";
	if (voted.you) return p.you.person;
	if (voted.partner) return partnerOf(p).person;
	return "neutral";
}

/**
 * **Which round this is** — the thread colour, poll only (tokens.md §10).
 *
 * Each round owns one hue, alternating the two people: R1 = A, R2 = B, R3 =
 * both. It is carried by the round label, the segment indicator and the
 * lock-in end-cap, and §10 is explicit that "nothing else on the card takes
 * it". (§10 also named the selected option chip's fill; options are rows
 * now, and a picked row's mark is always the viewer's hue — option-rows.tsx.)
 *
 * A vote card has no rounds and so has no thread: it answers `neutral`, and
 * the card falls back to the person state for the segment indicator.
 */
export function resolveRoundTone(
	mode: DecisionMode,
	round: DecisionRound,
	status: DecisionStatus,
): RoundTone {
	if (mode === "vote") return "neutral";
	if (status === "completed") return "together";
	if (round === 1) return "a";
	if (round === 2) return "b";
	return "together";
}

/* -------------------------------------------------------------------------- */
/* the CTA ladder                                                              */
/* -------------------------------------------------------------------------- */

export type CtaKind =
	| "waiting-partner"
	| "vote-submitted"
	| "creator-blocked"
	| "creator-wait"
	| "active"
	| "need-options"
	| "select-option";

/** `cta` is the black pill — tokens.md §10 allows exactly one per card. */
export type CtaTone = "a" | "b" | "together" | "cta" | "muted";

export type Cta = { kind: CtaKind; label: string; disabled: boolean; tone: CtaTone };

/**
 * The fill a disabled "you already acted" CTA wears.
 *
 * A poll card follows its round — the CTA is the thread's last link. A vote
 * card has no round, so it follows the person state instead, which for these
 * cases is whoever has voted. `neutral` cannot reach here (nobody has voted
 * means none of these cases fired), but the viewer's own hue is the right
 * answer if it ever did.
 */
function ctaFillTone(p: DecisionCardState): CtaTone {
	if (p.mode === "vote") {
		const state = resolveCardState(p);
		return state === "neutral" ? p.you.person : state;
	}
	if (p.currentRound === 1) return "a";
	if (p.currentRound === 2) return "b";
	return "together";
}

/**
 * DecisionDecideButton.tsx's state machine, in its order (the inventory's
 * seven rows; row 7 splits into two kinds because its two labels have
 * different causes).
 *
 * Row 1 used to be a dead "Decided by {name}" pill. Who decided is the header
 * meta line's now (`resolveMeta`) and the slot is `resolveFooter`'s, so a
 * completed decision answers `null`: no decide button.
 *
 * "Submitting…" is row 6's label rather than a row of its own — the button is
 * the *active* one, mid-flight — which is why it also carries `disabled`, the
 * way `disabled={loading}` did at DecisionDecideButton.tsx:139.
 */
export function resolveCta(p: DecisionCardState): Cta | null {
	// 1 — already decided: there is no decide button any more. What the card
	// offers next, if anything, is `resolveFooter`'s.
	if (p.status === "completed") return null;

	// 2 — you voted, the round is still open.
	if (p.status === "voted" && hasYouVoted(p)) {
		return {
			kind: "waiting-partner",
			label: "Waiting for partner",
			disabled: true,
			tone: ctaFillTone(p),
		};
	}

	// 3 — poll only: your vote for this round is in.
	if (p.mode === "poll" && p.youVotedThisRound) {
		return {
			kind: "vote-submitted",
			label: "Vote Submitted",
			disabled: true,
			tone: ctaFillTone(p),
		};
	}

	// 4 — poll round 3 is the partner's call alone, so the creator sits out.
	if (p.mode === "poll" && p.currentRound === 3 && isCreator(p)) {
		return { kind: "creator-blocked", label: "Creator Blocked", disabled: true, tone: "together" };
	}

	// 5 — vote mode: the creator never votes on their own decision.
	if (p.mode === "vote" && isCreator(p)) {
		return {
			kind: "creator-wait",
			label: "Wait for partner to vote",
			disabled: true,
			tone: "muted",
		};
	}

	// 6 — the live button.
	if (canDecide(p)) {
		const label = p.submitting ? "Submitting…" : p.mode === "poll" ? "Submit Vote" : "Decide";
		return { kind: "active", label, disabled: p.submitting, tone: "cta" };
	}

	// 7 — not ready: say which of the two things is missing.
	return p.options.length < 2
		? { kind: "need-options", label: "Need 2+ options", disabled: true, tone: "muted" }
		: { kind: "select-option", label: "Select option", disabled: true, tone: "muted" };
}

/* -------------------------------------------------------------------------- */
/* the status badge                                                            */
/* -------------------------------------------------------------------------- */

export type BadgeTone = "a" | "b" | "together" | "neutral";

export type Badge = { label: string; tone: BadgeTone };

/**
 * DecisionStatusBadge.tsx:26-68 — six labels.
 *
 * The badge does *not* take the round colour: tokens.md §10 lists the round
 * thread as "round label → segment indicator → selected option-chip fill →
 * lock-in button end-cap. Nothing else on the card takes it." It wears the
 * **person state** instead — the same colour the card itself is in, so the
 * badge and the card never disagree about whose decision this currently is.
 *
 * The labels are still the inventory's six, and they are a different question
 * from the colour: "Round 3" is the label whether nobody has voted or only
 * the partner has, but the card is neutral in the first case and the
 * partner's hue in the second.
 */
export function resolveBadge(p: DecisionCardState): Badge {
	const tone = resolveCardState(p);

	if (p.status === "completed") return { label: "Decided", tone };

	if (p.mode === "poll") {
		if (p.youVotedThisRound && p.partnerVotedThisRound) {
			return { label: `Round ${p.currentRound} Complete`, tone };
		}
		if (p.youVotedThisRound) return { label: "Waiting", tone };
		return { label: `Round ${p.currentRound}`, tone };
	}

	if (p.status === "voted") return { label: "Vote", tone };
	return { label: "Pending", tone };
}

/* -------------------------------------------------------------------------- */
/* options and voters                                                          */
/* -------------------------------------------------------------------------- */

/**
 * CollapsibleCard.tsx:268-272 and :301 — when the option rows go dead.
 *
 * Vote mode: the creator physically cannot pick, and a completed decision is
 * frozen. Poll mode: once your vote for this round is in it cannot be
 * changed, round 3 is the partner's alone, and completed is frozen.
 */
export function optionsDisabled(p: DecisionCardState): boolean {
	if (p.status === "completed") return true;
	if (p.mode === "vote") return isCreator(p);
	return p.youVotedThisRound || (p.currentRound === 3 && isCreator(p));
}

export type VoterMark = "blocked" | "voted" | "selected" | "idle";

/**
 * VotingStatusIndicator.tsx:31-55 — what to draw beside each person's name.
 *
 * **Privacy** (VotingStatusIndicator's `hasSelectedOption={false}` at
 * CollapsibleCard.tsx:254): the partner can never be "selected". You see that
 * they have voted or that they have not; you never see a pick forming.
 *
 * Checked in the indicator's own order, so a blocked creator reads as blocked
 * even on a completed decision — the inventory keeps the cross there and only
 * changes its colour.
 */
export function voterMark(p: DecisionCardState, who: "you" | "partner"): VoterMark {
	// Each seat is checked against the creator by name, rather than the
	// partner being "whoever is not the creator". A decision can be shown to
	// two people neither of whom made it — an unlinked partner falls back to
	// the literal "Partner" — and `!isCreator(you)` would then wrongly mark
	// the partner as the blocked creator.
	const theyAreTheCreator = who === "you" ? isCreator(p) : partnerOf(p).name === p.createdBy.name;

	if (p.mode === "poll" && p.currentRound === 3 && theyAreTheCreator) return "blocked";

	if (who === "partner") return p.partnerVotedThisRound ? "voted" : "idle";

	if (hasYouVoted(p)) return "voted";
	return p.options.some((option) => option.selected) ? "selected" : "idle";
}

/* -------------------------------------------------------------------------- */
/* the decided card: who decided, and what it offers next                      */
/* -------------------------------------------------------------------------- */

/**
 * The header's meta line. An open card reads "Created by Sam · {deadline}"; a
 * decided one reads "Created by Sam · Decided by Chase" — the deadline has no
 * job once decided, and beside an event it would be misread as the event's
 * date. `decidedBy` is `null` until the decision is completed, and the header
 * prints the deadline then.
 *
 * A completed decision with no decider recorded falls back to "Partner", as
 * the old pill did.
 */
export function resolveMeta(p: Pick<DecisionCardState, "status" | "createdBy" | "decidedBy">): {
	createdBy: string;
	decidedBy: string | null;
} {
	return {
		createdBy: COPY.createdBy(p.createdBy.name),
		decidedBy: p.status === "completed" ? COPY.decidedBy(p.decidedBy ?? PARTNER_FALLBACK.name) : null,
	};
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

/**
 * An event's day, two ways: `short` for the eye ("Fri, Dec 12") and `long`
 * for a screen reader ("Friday, December 12"). The year is added only when it
 * is not `now`'s ("Fri, Jan 8, 2027").
 *
 * Spelled from two tables rather than `toLocaleDateString`: the label is part
 * of a sentence the tests pin, and `Intl` on Hermes answers differently by
 * build (and not at all on some). `day` is a calendar day, `YYYY-MM-DD`, so it
 * is read as a *local* date — `new Date("2026-12-12")` would be UTC midnight,
 * which is the 11th in Denver.
 *
 * `null` for anything that is not a real day ("2026-02-31", "").
 */
export function formatEventDay(
	day: string | null | undefined,
	now: Date,
): { short: string; long: string } | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day ?? "");
	if (!match) return null;

	const year = Number(match[1]);
	const month = Number(match[2]);
	const date = Number(match[3]);
	const local = new Date(year, month - 1, date);
	// A day that rolled over ("02-31" → March 3) was never a day.
	if (local.getFullYear() !== year || local.getMonth() !== month - 1 || local.getDate() !== date) {
		return null;
	}

	const weekday = WEEKDAYS[local.getDay()];
	const monthName = MONTHS[month - 1];
	const suffix = year === now.getFullYear() ? "" : `, ${year}`;

	return {
		short: `${weekday.slice(0, 3)}, ${monthName.slice(0, 3)} ${date}${suffix}`,
		long: `${weekday}, ${monthName} ${date}${suffix}`,
	};
}

/** The live pill in the footer slot. Always the `together` tone, never `cta`. */
export type FooterPill = {
	action: FollowUpAction;
	label: string;
	/** The label with the date said in full; equal to `label` when there is none. */
	accessibilityLabel: string;
	accessibilityHint: string;
};

/**
 * A mark on a status line: whose seat, and whether they have *added* it
 * (a filled tick) or only started (a ring in their colour).
 */
export type FooterMark = { seat: Person["person"]; done: boolean };

/**
 * What a decided card ends with — one thing, or nothing.
 *
 * | kind       | drawn as                                                   |
 * | ---------- | ---------------------------------------------------------- |
 * | `none`     | nothing: the card ends at its option rows                  |
 * | `action`   | one live pill                                              |
 * | `question` | "Did it save?  Yes · Not yet" — two inline buttons         |
 * | `status`   | a line with seat marks; a press opens the calendar sheet   |
 * | `changed`  | "Changed since it was added" over an "Add again" pill      |
 */
export type Footer =
	| { kind: "none" }
	| { kind: "action"; pill: FooterPill }
	| {
			kind: "question";
			marks: FooterMark[];
			label: string;
			yes: { label: string; accessibilityLabel: string };
			notYet: { label: string; accessibilityLabel: string };
	  }
	| {
			kind: "status";
			marks: FooterMark[];
			label: string;
			accessibilityLabel: string;
			accessibilityHint: string;
	  }
	| { kind: "changed"; marks: FooterMark[]; caption: string; pill: FooterPill };

const NO_FOOTER: Footer = { kind: "none" };

type Day = { short: string; long: string } | null;

/** "Label · Fri, Dec 12" for the eye, "Label, Friday, December 12" for the ear. */
function dated(label: string, day: Day): { label: string; accessibilityLabel: string } {
	return day
		? { label: `${label} · ${day.short}`, accessibilityLabel: `${label}, ${day.long}` }
		: { label, accessibilityLabel: label };
}

function pillFor(action: FollowUpAction, day: Day): FooterPill {
	if (action === "calendar") {
		return {
			action,
			...dated(COPY.followUp.addToCalendar, day),
			accessibilityHint: COPY.followUp.calendarHint,
		};
	}
	if (action === "open_link") {
		return {
			action,
			label: COPY.followUp.openLink,
			accessibilityLabel: COPY.followUp.openLink,
			accessibilityHint: COPY.followUp.openLinkHint,
		};
	}
	return {
		action,
		label: COPY.followUp.decideNext,
		accessibilityLabel: COPY.followUp.decideNext,
		accessibilityHint: COPY.followUp.decideNextHint,
	};
}

/**
 * The decided card's footer slot.
 *
 * 1. **Not completed** → `none` (the decide button is `resolveCta`'s).
 * 2. **The calendar has something to say** (`calendar.kind !== "none"`) → it
 *    takes the slot, over any suggestion: once somebody has started or
 *    finished adding the event, that is the fact about this card.
 *    - `changed` (an added row no longer matches the decision) → the caption
 *      and an "Add again" pill, whoever added it. The pill is the calendar
 *      action: `onFollowUp("calendar", "slot")`.
 *    - `mine-opened` → the question.
 *    - the rest → a status line. The partner's name falls back to "Partner"
 *      (nobody linked, or the row outlived a deleted account).
 * 3. **A suggestion** (`followUp.suggested`) → its pill.
 * 4. Otherwise `none`.
 *
 * The date on a line or a pill is the decision's date *as it stands*
 * (`followUp.when`), past or future; with none, the label simply has no date.
 *
 * The seats are read off `you` and `partner` rather than assumed, so the card
 * drawn from person B's side (the `AsPersonB` stories) still marks each
 * person in their own hue.
 */
export function resolveFooter(
	p: Pick<DecisionCardProps, "status" | "you" | "partner" | "followUp" | "calendar">,
	now: Date,
): Footer {
	if (p.status !== "completed") return NO_FOOTER;

	const calendar = p.calendar ?? NO_CALENDAR;
	const day = formatEventDay(p.followUp?.when?.date, now);

	// A partner's stale hand-off (`partner-started`) holds nothing back: after
	// `OPENED_STALE_MS` the card offers its follow-up again, as if nobody had
	// started.
	if (calendar.kind !== "none" && calendar.kind !== "partner-started") {
		const partner = partnerOf(p);
		const mine = (done: boolean): FooterMark => ({ seat: p.you.person, done });
		const theirs = (done: boolean): FooterMark => ({ seat: partner.person, done });

		const added =
			calendar.kind === "mine-added"
				? { marks: [mine(true)], text: COPY.followUp.youAdded }
				: calendar.kind === "partner-added"
					? { marks: [theirs(true)], text: COPY.followUp.partnerAdded(partner.name) }
					: calendar.kind === "both-added"
						? { marks: [mine(true), theirs(true)], text: COPY.followUp.bothAdded }
						: null;

		if (added) {
			if (calendar.changed) {
				return {
					kind: "changed",
					marks: added.marks,
					caption: COPY.followUp.changed,
					pill: {
						action: "calendar",
						...dated(COPY.followUp.addAgain, day),
						accessibilityHint: COPY.followUp.calendarHint,
					},
				};
			}
			return {
				kind: "status",
				marks: added.marks,
				...dated(added.text, day),
				accessibilityHint: COPY.followUp.calendarHint,
			};
		}

		if (calendar.kind === "mine-opened") {
			return {
				kind: "question",
				marks: [mine(false)],
				label: COPY.followUp.didItSave,
				yes: { label: COPY.followUp.yes, accessibilityLabel: COPY.followUp.yesLabel },
				notYet: { label: COPY.followUp.notYet, accessibilityLabel: COPY.followUp.notYetLabel },
			};
		}

		const text = COPY.followUp.partnerOpening(partner.name);
		return {
			kind: "status",
			marks: [theirs(false)],
			label: text,
			accessibilityLabel: text,
			accessibilityHint: COPY.followUp.calendarHint,
		};
	}

	const suggested = p.followUp?.suggested ?? null;
	return suggested ? { kind: "action", pill: pillFor(suggested, day) } : NO_FOOTER;
}
