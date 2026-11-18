import type { DecisionCardData } from "@/components/decision-queue/decision-card/from-ui-decision";
import {
	applyQueueFilter,
	bucketOf,
	countBuckets,
	matchesQuery,
	normalize,
} from "@/lib/queue-filter";

const you = { name: "Chase", person: "a" as const };
const partner = { name: "Sam", person: "b" as const };
const twoOptions = [
	{ id: "o1", title: "Tacos", selected: false },
	{ id: "o2", title: "Ramen", selected: false },
];

function card(overrides: Partial<DecisionCardData> = {}): DecisionCardData {
	return {
		id: "d1",
		title: "Dinner tonight",
		description: "",
		mode: "vote",
		status: "pending",
		currentRound: 1,
		options: twoOptions,
		deadline: null,
		createdBy: partner,
		you,
		partner,
		decidedBy: null,
		youVotedThisRound: false,
		partnerVotedThisRound: false,
		...overrides,
	};
}

describe("bucketOf", () => {
	it.each<[string, Partial<DecisionCardData>, string]>([
		["a completed decision", { status: "completed", decidedBy: "Sam" }, "decided"],
		["partner's vote, nothing picked yet", {}, "yours"],
		["vote you created (creator never votes)", { createdBy: you }, "theirs"],
		["partner's poll, round 1, nobody voted", { mode: "poll" }, "yours"],
		[
			"poll, you voted this round",
			{ mode: "poll", youVotedThisRound: true, status: "voted" },
			"theirs",
		],
		[
			"poll, partner voted, you have not",
			{ mode: "poll", partnerVotedThisRound: true, status: "voted" },
			"yours",
		],
		[
			"poll round 3, you are the creator",
			{ mode: "poll", currentRound: 3, createdBy: you },
			"theirs",
		],
		["poll round 3, partner created it", { mode: "poll", currentRound: 3 }, "yours"],
		["partner's vote with too few options", { options: [twoOptions[0]] }, "yours"],
	])("%s → %s", (_name, overrides, expected) => {
		expect(bucketOf(card(overrides))).toBe(expected);
	});
});

describe("countBuckets", () => {
	it("counts each bucket and the total", () => {
		expect(countBuckets(["yours", "yours", "theirs", "decided"])).toEqual({
			all: 4,
			yours: 2,
			theirs: 1,
			decided: 1,
		});
	});
});

describe("normalize", () => {
	it("drops case, accents and punctuation", () => {
		expect(normalize("  Café — Night!  ")).toBe("cafe night");
	});
});

describe("matchesQuery", () => {
	it.each<[string, string, boolean]>([
		["Dinner tonight", "", true],
		["Dinner tonight", "   ", true],
		["Dinner tonight", "dinner", true],
		["Dinner tonight", "TONI", true],
		["Beach trip in May", "trip beach", true],
		["Café night", "cafe", true],
		["Pick a restaurant", "rstrnt", true],
		["Dinner tonight", "dinr", true],
		["Dinner tonight", "dn", false],
		["Dinner tonight", "lunch", false],
		["Beach trip", "beach lunch", false],
		// The subsequence has to start where a title word starts.
		["Dinner tonight", "inne", true], // a plain substring anywhere still wins
		["Dinner tonight", "nnt", false],
	])("%s / %j → %s", (title, query, expected) => {
		expect(matchesQuery(title, query)).toBe(expected);
	});
});

describe("applyQueueFilter", () => {
	const items = [
		{ card: card({ id: "1", title: "Dinner tonight" }), bucket: "yours" as const },
		{ card: card({ id: "2", title: "Beach trip" }), bucket: "theirs" as const },
		{ card: card({ id: "3", title: "Dinner Friday" }), bucket: "decided" as const },
		{ card: card({ id: "4", title: "Paint the hall" }), bucket: "yours" as const },
	];
	const ids = (list: { card: { id: string } }[]) => list.map((item) => item.card.id);

	it("shows everything, in order, on All with no query", () => {
		const { visible, counts } = applyQueueFilter(items, "all", "");
		expect(ids(visible)).toEqual(["1", "2", "3", "4"]);
		expect(counts).toEqual({ all: 4, yours: 2, theirs: 1, decided: 1 });
	});

	it("narrows to one bucket", () => {
		expect(ids(applyQueueFilter(items, "yours", "").visible)).toEqual(["1", "4"]);
	});

	it("counts after the search, before the status filter", () => {
		const { visible, counts } = applyQueueFilter(items, "decided", "dinner");
		expect(ids(visible)).toEqual(["3"]);
		expect(counts).toEqual({ all: 2, yours: 1, theirs: 0, decided: 1 });
	});
});
