/**
 * The privacy policy and support page, as data.
 *
 * Both are public routes (`/privacy`, `/support`) so App Store Connect can
 * link to them on the web deploy, and both are reachable in the app from the
 * settings sheet. Apple requires the privacy policy URL, the support URL and
 * an in-app account deletion path (guideline 5.1.1); the deletion section
 * below has to describe what `delete_my_account` actually does, so change
 * them together.
 *
 * Plain strings rather than markup: `LegalPage` renders each section as a
 * heading, paragraphs and an optional bullet list.
 */

export const SUPPORT_EMAIL = "hello@duo-decide.com";
export const SITE_ORIGIN = "https://duo-decide.com";
export const PRIVACY_URL = `${SITE_ORIGIN}/privacy`;
export const SUPPORT_URL = `${SITE_ORIGIN}/support`;

export type LegalSection = {
	heading: string;
	paragraphs?: string[];
	bullets?: string[];
};

export type LegalDocument = {
	title: string;
	/** Shown under the title. */
	updated: string;
	intro: string;
	sections: LegalSection[];
};

export const PRIVACY_POLICY: LegalDocument = {
	title: "Privacy Policy",
	updated: "Last updated October 5, 2026",
	intro:
		"Duo Decide helps two partners make decisions together. This policy explains what we collect to do that, who can see it, and how to delete it. We don't sell your data, we don't show ads, and we don't use tracking or analytics tools.",
	sections: [
		{
			heading: "What we collect",
			bullets: [
				"Account details: your email address, display name, and a password (stored only as a secure hash by our authentication provider). If you sign in with Google on the web, we receive your name and email from Google.",
				"Your partner's email address, if you invite them, so we can send the invitation.",
				"What you create together: decisions, their descriptions and deadlines, options, option lists, and your votes.",
				"Sign-in session data needed to keep you logged in. On iPhone this is encrypted on your device.",
				"Your colour choices, which are stored only on your device.",
			],
		},
		{
			heading: "How we use it",
			paragraphs: [
				"Only to run Duo Decide: to sign you in, link you with your partner, sync your shared decisions between your two devices, and send the emails you ask for (partner invitations, password resets and sign-up confirmation). We don't use your data for advertising and we don't build profiles about you.",
			],
		},
		{
			heading: "Who can see it",
			paragraphs: [
				"Your shared decisions, options and option lists are visible to you and your linked partner. While a poll round is open, your votes stay hidden from your partner until you've both voted.",
				"We use a small number of service providers to run the app, and they process data only on our behalf:",
			],
			bullets: [
				"Supabase: database, authentication and real-time sync.",
				"Vercel: hosting for the web version.",
				"Resend: sending invitation emails.",
				"Google: optional sign-in on the web.",
			],
		},
		{
			heading: "Deleting your account",
			paragraphs: [
				"You can delete your account at any time in the app: open Settings, then Delete account. This permanently deletes your login, your profile and your votes.",
				"If you're linked with a partner, decisions you've already completed together stay in your partner's history, without your name, and so do your shared option lists. Decisions that were still open are deleted, because they can't be finished without both of you. If you have no partner linked, everything in your account is deleted.",
				`You can also email ${SUPPORT_EMAIL} and we'll delete your account for you.`,
			],
		},
		{
			heading: "How long we keep data",
			paragraphs: [
				"We keep your data while your account exists. When you delete your account, it is removed from our database straight away. Backups held by our database provider are overwritten on their normal schedule.",
			],
		},
		{
			heading: "Security",
			paragraphs: [
				"Data is encrypted in transit, and access to your couple's data is restricted by row-level security rules in our database, so only the two of you can read it.",
			],
		},
		{
			heading: "Children",
			paragraphs: [
				"Duo Decide is not intended for children under 13, and we don't knowingly collect their data.",
			],
		},
		{
			heading: "Changes",
			paragraphs: [
				"If we change this policy, we'll update the date at the top. If a change is significant, we'll tell you in the app.",
			],
		},
		{
			heading: "Contact",
			paragraphs: [`Questions or requests about your data: ${SUPPORT_EMAIL}`],
		},
	],
};

export const SUPPORT_PAGE: LegalDocument = {
	title: "Support",
	updated: "We usually reply within two business days.",
	intro: `Need help with Duo Decide? Email us at ${SUPPORT_EMAIL}. Tell us what you were doing and what happened, and include a screenshot if you can.`,
	sections: [
		{
			heading: "Common questions",
			bullets: [
				"I invited my partner but they didn't get the email: check their spam folder, then use Resend invitation in Settings. They need to sign up with the same email address you invited.",
				"I forgot my password: on the Sign In screen, tap Forgot password? and we'll email you a reset link.",
				"Votes aren't showing in a poll: in a poll, votes stay hidden until both of you have voted in that round.",
				"I can't vote in round 3: by design, only the partner who didn't create the poll votes in the final round.",
			],
		},
		{
			heading: "Your account",
			paragraphs: [
				"You can change your password or delete your account in Settings. For what happens to your data, see the Privacy Policy.",
			],
		},
	],
};
