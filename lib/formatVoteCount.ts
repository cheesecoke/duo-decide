/**
 * Formats a vote count as a human-readable string.
 * @param count - A non-negative integer representing the number of votes.
 */
export function formatVoteCount(count: number): string {
  return count === 1 ? '1 vote' : `${count} votes`;
}
