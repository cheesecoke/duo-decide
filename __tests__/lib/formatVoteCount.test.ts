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

	it('returns "999 votes" for 999', () => {
		expect(formatVoteCount(999)).toBe("999 votes");
	});

	it('returns "1k votes" for 1000', () => {
		expect(formatVoteCount(1000)).toBe("1k votes");
	});

	it('returns "1.5k votes" for 1500', () => {
		expect(formatVoteCount(1500)).toBe("1.5k votes");
	});

	it('returns "2k votes" for 2000', () => {
		expect(formatVoteCount(2000)).toBe("2k votes");
	});

	it('returns "12.3k votes" for 12300', () => {
		expect(formatVoteCount(12300)).toBe("12.3k votes");
	});

	it('returns "1000k votes" for 1000000', () => {
		expect(formatVoteCount(1000000)).toBe("1000k votes"); // intentional: no million suffix per spec
	});
});
