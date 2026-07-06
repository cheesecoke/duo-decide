/**
 * Formats a vote count as a human-readable string.
 * @param count - A non-negative integer representing the number of votes.
 */
export function formatVoteCount(count: number): string {
	if (count >= 1000) {
		const k = Math.round(count / 100) / 10;
		return `${k}k votes`;
	}
	return count === 1 ? "1 vote" : `${count} votes`;
}
