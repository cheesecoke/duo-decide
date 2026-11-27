import {
	OPENED_STALE_MS,
	calendarAddView,
	type CalendarAddRow,
	type CalendarAddView,
} from "@/lib/calendar-add-view";

const NOW = new Date("2026-11-18T20:00:00Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
const MINUTE = 60 * 1000;

const row = (
	state: CalendarAddRow["state"],
	over: Partial<CalendarAddRow> = {},
): CalendarAddRow => ({
	state,
	method: "google_link",
	confirmed: state === "added",
	snapshot: "v1:aaaaaaaa",
	updated_at: ago(MINUTE),
	...over,
});

type State = CalendarAddRow["state"] | null;
const of = (state: State) => (state ? row(state) : null);

describe("calendarAddView", () => {
	it("is ten minutes", () => {
		expect(OPENED_STALE_MS).toBe(600_000);
	});

	describe("every pair of states (the partner's hand-off a minute old)", () => {
		it.each<[State, State, CalendarAddView["kind"]]>([
			[null, null, "none"],
			[null, "opened", "partner-opening"],
			[null, "added", "partner-added"],
			[null, "removed", "none"],
			["opened", null, "mine-opened"],
			["opened", "opened", "mine-opened"],
			["opened", "added", "partner-added"],
			["opened", "removed", "mine-opened"],
			["added", null, "mine-added"],
			["added", "opened", "mine-added"],
			["added", "added", "both-added"],
			["added", "removed", "mine-added"],
			["removed", null, "none"],
			["removed", "opened", "partner-opening"],
			["removed", "added", "partner-added"],
			["removed", "removed", "none"],
		])("mine %s, partner %s → %s", (mine, partner, kind) => {
			expect(calendarAddView(of(mine), of(partner), NOW).kind).toBe(kind);
		});

		it("takes undefined for a missing row", () => {
			expect(calendarAddView(undefined, undefined, NOW)).toEqual({ kind: "none", changed: false });
		});
	});

	describe("a partner's unfinished hand-off", () => {
		it.each<[string, string, CalendarAddView["kind"]]>([
			["just now", ago(0), "partner-opening"],
			["nine minutes 59 ago", ago(OPENED_STALE_MS - 1000), "partner-opening"],
			["ten minutes ago exactly", ago(OPENED_STALE_MS), "partner-started"],
			["an hour ago", ago(60 * MINUTE), "partner-started"],
			// The server's clock is ahead of this phone's.
			["from the future", ago(-2 * MINUTE), "partner-opening"],
			["a stamp that cannot be read", "not a date", "partner-started"],
		])("%s → %s", (_name, updated_at, kind) => {
			expect(calendarAddView(null, row("opened", { updated_at }), NOW).kind).toBe(kind);
		});

		it("says when it stops holding the button back", () => {
			const opened = ago(4 * MINUTE);
			expect(calendarAddView(null, row("opened", { updated_at: opened, method: "ics" }), NOW)).toEqual(
				{
					kind: "partner-opening",
					openedAt: opened,
					staleAt: Date.parse(opened) + OPENED_STALE_MS,
					method: "ics",
					changed: false,
				},
			);
		});

		it("never makes my own hand-off stale", () => {
			const opened = ago(3 * 24 * 60 * MINUTE);
			expect(calendarAddView(row("opened", { updated_at: opened }), null, NOW)).toEqual({
				kind: "mine-opened",
				openedAt: opened,
				method: "google_link",
				changed: false,
			});
		});
	});

	describe("what an added view carries", () => {
		it("mine", () => {
			expect(
				calendarAddView(row("added", { updated_at: ago(5 * MINUTE), confirmed: true }), null, NOW),
			).toEqual({
				kind: "mine-added",
				addedAt: ago(5 * MINUTE),
				method: "google_link",
				confirmed: true,
				changed: false,
			});
		});

		it("the partner's, unconfirmed", () => {
			expect(
				calendarAddView(
					null,
					row("added", { updated_at: ago(5 * MINUTE), confirmed: false, method: "system" }),
					NOW,
				),
			).toEqual({
				kind: "partner-added",
				addedAt: ago(5 * MINUTE),
				method: "system",
				confirmed: false,
				changed: false,
			});
		});

		it("both", () => {
			expect(
				calendarAddView(
					row("added", { updated_at: ago(2 * MINUTE) }),
					row("added", { updated_at: ago(9 * MINUTE), method: "ics" }),
					NOW,
				),
			).toEqual({
				kind: "both-added",
				addedAt: ago(2 * MINUTE),
				partnerAddedAt: ago(9 * MINUTE),
				method: "google_link",
				partnerMethod: "ics",
				confirmed: true,
				changed: false,
			});
		});
	});

	describe("changed since it was added", () => {
		const OLD = "v1:aaaaaaaa";
		const NEW = "v1:bbbbbbbb";
		const added = (snapshot: string) => row("added", { snapshot });

		it.each<
			[string, CalendarAddRow | null, CalendarAddRow | null, string | null | undefined, boolean]
		>([
			["mine, same details", added(OLD), null, OLD, false],
			["mine, edited since", added(OLD), null, NEW, true],
			// Never: two phones can resolve "tomorrow" to different days.
			["the partner's, edited since", null, added(OLD), NEW, false],
			["the partner's, same", null, added(OLD), OLD, false],
			["both: judged on mine", added(OLD), added(NEW), NEW, true],
			["both: mine is current, theirs is not", added(NEW), added(OLD), NEW, false],
			["no snapshot to compare with", added(OLD), null, undefined, false],
			["null to compare with", added(OLD), null, null, false],
			["empty to compare with", added(OLD), null, "", false],
			["an opened row is never changed", row("opened", { snapshot: OLD }), null, NEW, false],
			["nor a partner's opened one", null, row("opened", { snapshot: OLD }), NEW, false],
			["nor a removed one", row("removed", { snapshot: OLD }), null, NEW, false],
		])("%s", (_name, mine, partner, current, changed) => {
			expect(calendarAddView(mine, partner, NOW, current).changed).toBe(changed);
		});
	});
});
