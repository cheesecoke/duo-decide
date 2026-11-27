/**
 * lib/action-events.ts: counting must never cost the person anything. One
 * request per (decision, action, event), and no error ever reaches the UI.
 */

type Answer = { error: { message: string } | null };

const mockUpsert = jest.fn<Promise<Answer>, [unknown, unknown]>();
const mockFrom = jest.fn((_table: string) => ({ upsert: mockUpsert }));

jest.mock("@/config/supabase", () => ({
	supabase: { from: (table: string) => mockFrom(table) },
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const { logActionEvent, resetActionEventsForTests } = require("@/lib/action-events");
/* eslint-enable @typescript-eslint/no-require-imports */

const SHOWN = {
	decisionId: "d1",
	action: "calendar",
	event: "shown",
	signal: "parsed_date",
} as const;

/** Let the fire-and-forget promise settle. */
const settle = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
	jest.clearAllMocks();
	resetActionEventsForTests();
	mockUpsert.mockResolvedValue({ error: null });
});

describe("logActionEvent", () => {
	it("sends the decision and the three enums, and nothing else", async () => {
		expect(logActionEvent(SHOWN)).toBeUndefined();
		await settle();

		expect(mockFrom).toHaveBeenCalledWith("action_events");
		expect(mockUpsert).toHaveBeenCalledWith(
			{ decision_id: "d1", action: "calendar", event: "shown", signal: "parsed_date" },
			{ onConflict: "decision_id,user_id,action,event", ignoreDuplicates: true },
		);
	});

	it("stops asking once the table turns out not to exist (app ahead of migration 028)", async () => {
		mockUpsert.mockResolvedValueOnce({
			error: { code: "PGRST205", message: "not in the schema cache" } as { message: string },
		});
		logActionEvent(SHOWN);
		await settle();

		logActionEvent(SHOWN);
		logActionEvent({ ...SHOWN, decisionId: "d2" });
		await settle();

		expect(mockUpsert).toHaveBeenCalledTimes(1);
	});

	it("counts 'shown' once however many times the card renders", async () => {
		logActionEvent(SHOWN);
		logActionEvent(SHOWN);
		logActionEvent({ ...SHOWN, signal: "event_date" });
		await settle();

		expect(mockUpsert).toHaveBeenCalledTimes(1);
	});

	it("counts a different event, action or decision separately", async () => {
		logActionEvent(SHOWN);
		logActionEvent({ ...SHOWN, event: "tapped" });
		logActionEvent({ ...SHOWN, action: "open_link" });
		logActionEvent({ ...SHOWN, decisionId: "d2" });
		await settle();

		expect(mockUpsert).toHaveBeenCalledTimes(4);
	});

	it("swallows an error from the database, and lets a later call try again", async () => {
		mockUpsert.mockResolvedValueOnce({ error: { message: "relation does not exist" } });

		expect(() => logActionEvent(SHOWN)).not.toThrow();
		await settle();
		logActionEvent(SHOWN);
		await settle();

		expect(mockUpsert).toHaveBeenCalledTimes(2);
	});

	it("swallows a rejected request", async () => {
		mockUpsert.mockRejectedValueOnce(new Error("Network request failed"));

		expect(() => logActionEvent(SHOWN)).not.toThrow();
		await settle();
		logActionEvent(SHOWN);
		await settle();

		expect(mockUpsert).toHaveBeenCalledTimes(2);
	});

	it("swallows a client that throws outright", () => {
		mockFrom.mockImplementationOnce(() => {
			throw new Error("supabase is not configured");
		});

		expect(() => logActionEvent(SHOWN)).not.toThrow();
	});

	it("sends nothing without a decision", async () => {
		logActionEvent({ ...SHOWN, decisionId: "" });
		await settle();

		expect(mockUpsert).not.toHaveBeenCalled();
	});
});
