/**
 * What deleting your account does, in the user's terms — the copy on the
 * Delete Account screen. Mirrors `delete_my_account()` (migration 023) and
 * the privacy policy's deletion section (`lib/legal.ts`); change all three
 * together.
 */

export type Consequences = { linked: boolean; partnerName: string | null };

export function consequencesFor({ linked, partnerName }: Consequences): string[] {
	if (!linked) {
		return [
			"Your login and profile are deleted.",
			"All of your decisions, votes and option lists are deleted.",
			"Any pending partner invitation is cancelled.",
		];
	}
	const partner = partnerName ?? "Your partner";
	return [
		"Your login, profile and votes are deleted.",
		`Decisions you've completed together stay in ${partner}'s history, shown as "Former partner".`,
		"Decisions that are still open are deleted.",
		`Shared option lists stay with ${partner}.`,
		`${partner} can invite someone new.`,
	];
}
