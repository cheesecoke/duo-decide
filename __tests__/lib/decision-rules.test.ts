import { countFilled, minOptionsFor, optionShortfall } from "@/lib/decision-rules";

describe("decision rules", () => {
	it("polls need 3 options in round 1, votes 2", () => {
		expect(minOptionsFor("poll")).toBe(3);
		expect(minOptionsFor("vote")).toBe(2);
	});

	it("a poll past round 1 is down to its two picked options", () => {
		expect(minOptionsFor("poll", 2)).toBe(2);
		expect(minOptionsFor("poll", 3)).toBe(2);
	});

	it("counts only rows with text", () => {
		expect(countFilled(["Tacos", " ", "", "Ramen "])).toBe(2);
	});

	it.each([
		["poll", 2, 1, "Polls need at least 3 options"],
		["poll", 3, 1, null],
		["vote", 1, 1, "Add at least 2 options"],
		["vote", 2, 1, null],
		["poll", 2, 2, null],
	] as const)("%s with %i option(s) in round %i", (kind, filled, round, message) => {
		expect(optionShortfall(kind, filled, round)).toBe(message);
	});
});
