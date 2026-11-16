jest.mock("@/config/supabase", () => ({ supabase: {} }));

/* eslint-disable @typescript-eslint/no-require-imports */
const {
	dayKey,
	daysAgoKey,
	describeDay,
	isMissingCardsTable,
} = require("@/lib/responsibility-cards");
/* eslint-enable @typescript-eslint/no-require-imports */

/** The day helpers behind "done today" and the seven-day count. */

describe("dayKey", () => {
	it("is the phone's own calendar day, not UTC's", () => {
		// 11:30pm local is still the 14th here, whatever UTC says.
		expect(dayKey(new Date(2026, 10, 14, 23, 30))).toBe("2026-11-14");
		expect(dayKey(new Date(2026, 0, 5, 0, 5))).toBe("2026-01-05");
	});
});

describe("daysAgoKey", () => {
	it("steps back across months and years", () => {
		expect(daysAgoKey(0, new Date(2026, 10, 15, 9))).toBe("2026-11-15");
		expect(daysAgoKey(6, new Date(2026, 10, 3, 9))).toBe("2026-10-28");
		expect(daysAgoKey(1, new Date(2026, 0, 1, 9))).toBe("2025-12-31");
	});
});

describe("describeDay", () => {
	const today = new Date(2026, 10, 15, 9);

	it("says Today and Yesterday, and dates anything older", () => {
		expect(describeDay("2026-11-15", today)).toBe("Today");
		expect(describeDay("2026-11-14", today)).toBe("Yesterday");
		const older = describeDay("2026-11-12", today);
		expect(older).not.toBe("Today");
		expect(older).toMatch(/12/);
	});
});

describe("isMissingCardsTable", () => {
	it("knows both tables' not-there errors", () => {
		expect(isMissingCardsTable({ code: "42P01" })).toBe(true);
		expect(
			isMissingCardsTable({
				message:
					"Could not find the table 'public.responsibility_card_completions' in the schema cache",
			}),
		).toBe(true);
		expect(isMissingCardsTable({ message: "permission denied" })).toBe(false);
	});
});
