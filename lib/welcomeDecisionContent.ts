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
	title: "Welcome, here's how decisions work!",
	description:
		"Your partner may have already added some decisions. You can vote on them together. Quick guide:",
	options: WELCOME_DECISION.options,
} as const;

/** Copy for the Options tab when the couple has no option lists yet. */
export const WELCOME_OPTIONS = {
	title: "Lists of options — your first one.",
	description:
		"Option lists are reusable sets of choices you can attach to decisions. Create lists here, then pick one when you create a decision so you're not typing the same options every time.",
	options: [
		{
			title:
				"Create a list for things you decide often (e.g. dinner ideas, date nights, weekend plans).",
		},
		{ title: "Add as many options as you want; you can edit or remove them anytime." },
		{
			title:
				"When creating a decision, choose a list to prefill options, or add custom options on the spot.",
		},
		{ title: "You and your partner share the same lists for your couple." },
	] as WelcomeOption[],
} as const;
