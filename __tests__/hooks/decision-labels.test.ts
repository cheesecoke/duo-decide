import {
	creatorLabel,
	deciderLabel,
	FORMER_PARTNER,
} from "@/hooks/decision-queue/useDecisionsData";

const CTX = { userId: "me", userName: "Chase", partnerName: "Sam" };

describe("creatorLabel", () => {
	it.each([
		["me", "Chase"],
		["them", "Sam"],
		[null, FORMER_PARTNER],
	])("%s → %s", (id, label) => {
		expect(creatorLabel(id, CTX)).toBe(label);
	});

	it("falls back to Partner while the partner's name is unknown", () => {
		expect(creatorLabel("them", { ...CTX, partnerName: null })).toBe("Partner");
	});
});

describe("deciderLabel", () => {
	it("names whoever decided", () => {
		expect(deciderLabel({ decided_by: "me", status: "completed" }, CTX)).toBe("Chase");
		expect(deciderLabel({ decided_by: "them", status: "completed" }, CTX)).toBe("Sam");
	});

	it("says Former partner for a completed decision whose decider left", () => {
		expect(deciderLabel({ decided_by: null, status: "completed" }, CTX)).toBe(FORMER_PARTNER);
	});

	it("is undefined until the decision is decided", () => {
		expect(deciderLabel({ decided_by: null, status: "pending" }, CTX)).toBeUndefined();
	});
});
