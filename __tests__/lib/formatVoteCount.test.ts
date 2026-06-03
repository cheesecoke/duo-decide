import { formatVoteCount } from "../../lib/formatVoteCount";

describe("formatVoteCount", () => {
	it('returns "0 votes" for 0', () => {
		expect(formatVoteCount(0)).toBe("0 votes");
	});

	it('returns "1 vote" for 1', () => {
		expect(formatVoteCount(1)).toBe("1 vote");
	});

	it('returns "2 votes" for 2', () => {
		expect(formatVoteCount(2)).toBe("2 votes");
	});
});
