import { whoLine } from "@/components/decision-queue/who-line";

/**
 * The counting rule, in a table. Copy is the round-3 mock's (`renderList`,
 * decision-queue-round-3.html:785-789).
 */

type Status = "pending" | "voted" | "completed";

const queue = (...statuses: Status[]) => statuses.map((status) => ({ status }));

describe("whoLine", () => {
	const cases: [string, ReturnType<typeof queue>, string | null, string][] = [
		[
			"a linked pair with work outstanding",
			queue("pending", "voted", "completed"),
			"Sam",
			"You & Sam · 2 open, 1 settled",
		],
		["everything settled", queue("completed", "completed"), "Sam", "You & Sam · 0 open, 2 settled"],
		["nothing settled", queue("pending"), "Sam", "You & Sam · 1 open, 0 settled"],
		// A sentence rather than "0 open, 0 settled", and deliberately not the
		// tile's "Nothing in the queue yet" — the same sentence twice on one
		// screen reads as a rendering fault (PLAN-3 final review M2).
		["an empty queue", queue(), "Sam", "You & Sam · Nothing waiting on either of you"],
		// Nobody linked: "You" alone — naming a partner who does not exist is worse
		// than a shorter line, and the screen drops the goose to match.
		["no partner, with decisions", queue("pending", "completed"), null, "You · 1 open, 1 settled"],
		["no partner, empty queue", queue(), null, "You · Nothing waiting on either of you"],
	];

	it.each(cases)("%s", (_label, decisions, partner, expected) => {
		expect(whoLine(decisions, partner)).toBe(expected);
	});

	// `status: "voted"` is one partner in and the round still open — it counts
	// as open, the way the card's badge still says "Vote".
	it("counts a half-voted decision as open", () => {
		expect(whoLine(queue("voted"), "Sam")).toBe("You & Sam · 1 open, 0 settled");
	});
});
