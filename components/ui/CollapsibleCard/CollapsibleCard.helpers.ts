import { getColor } from "@/lib/styled";

/**
 * Gets the appropriate color for poll mode based on round and status
 */
export function getPollColor(
	colorMode: "light" | "dark",
	currentRound: number,
	status?: "pending" | "voted" | "completed",
): string {
	if (status === "completed") {
		return getColor("success", colorMode);
	}

	switch (currentRound) {
		case 1:
			return getColor("round1", colorMode);
		case 2:
			return getColor("round2", colorMode);
		case 3:
			return getColor("round3", colorMode);
		default:
			return getColor("success", colorMode);
	}
}

/**
 * Gets the appropriate border color based on mode, round, and status
 */
export function getBorderColor(
	colorMode: "light" | "dark",
	mode: "vote" | "poll",
	currentRound: number,
	status: "pending" | "voted" | "completed",
): string {
	if (mode === "poll") {
		return getPollColor(colorMode, currentRound, status);
	}
	// For vote mode, use green when decided, yellow when pending
	return status === "completed" ? getColor("green", colorMode) : getColor("yellow", colorMode);
}
