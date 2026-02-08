/**
 * Default content for the welcome / first-time intro experience.
 * Single source of truth for the Decision Queue welcome card and partner intro.
 * Options are guide copy (not votable) to explain how Duo works.
 */

export interface WelcomeOption {
	/** Display label (guide copy) */
	title: string;
}

export const WELCOME_DECISION = {
	title: "Hey, welcome to Duo! This is your first decision.",
	description:
		"You'll add real decisions and options next. Here's a quick guide to how things work so you're ready when your partner joins.",
	options: [
		{ title: "Vote = pick one option together in a single round." },
		{
			title:
				"Poll = multi-round: you both vote, top options advance, then your partner picks the final choice.",
		},
		{ title: "You'll see each other's choices only after you've both voted in each round." },
		{
			title:
				"Create a decision anytime with the button below—add options and invite your partner to decide together.",
		},
	] as WelcomeOption[],
} as const;

/** Copy for the partner intro (second user who just joined). */
export const PARTNER_INTRO = {
	title: "Welcome! Here's how decisions work.",
	description:
		"Your partner may have already added some decisions. You can vote on them together. Quick guide:",
	options: WELCOME_DECISION.options,
} as const;
