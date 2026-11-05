import * as React from "react";

import { AuthScreen } from "@/components/auth/auth-screen";
import { StatusCard } from "@/components/auth/status-card";
import { SubmitButton } from "@/components/auth/submit-button";
import { Caption } from "@/components/ui/reusables/headline/headline";
import type { EmailLinkState, EmailLinkType } from "@/config/auth-link";

/**
 * Where a web visitor lands from a sign-up confirmation (or another email
 * link) requested in the app. Most of them signed up on the iPhone and opened
 * the email there, so the page says the account is ready in the app as well,
 * and never leaves them on a dead end.
 *
 * Pure: `app/email-confirmed.tsx` passes the provider's `emailLink` state in,
 * and Storybook renders each state without a provider.
 */

/** The card's title for a link that worked. */
const CONFIRMED_TITLES: Record<EmailLinkType, string> = {
	signup: "Email confirmed",
	magiclink: "You're signed in",
	invite: "Invitation accepted",
	email_change: "Email address updated",
};

export const EMAIL_CONFIRMED_LINE = "You can sign in on the Duo app, or continue here.";

type EmailLinkScreenProps = {
	state: EmailLinkState;
	/** Into the app on the web: the session is set, so the router takes over. */
	onContinue: () => void;
	/** To Sign In, for a link that did not work. */
	onSignIn: () => void;
};

function EmailLinkScreen({ state, onContinue, onSignIn }: EmailLinkScreenProps) {
	if (state.status === "error") {
		return (
			<AuthScreen
				title="Link Problem"
				footer={<SubmitButton label="Go to Sign In" onPress={onSignIn} />}
			>
				<StatusCard tone="error" title="This link can't be used">
					{state.message}
				</StatusCard>
			</AuthScreen>
		);
	}

	if (state.status === "verifying") {
		return (
			<AuthScreen title="Confirming Email" footer={null}>
				<Caption testID="email-link-verifying" className="text-ink-3">
					Confirming your email…
				</Caption>
			</AuthScreen>
		);
	}

	return (
		<AuthScreen
			title="Welcome to Duo"
			footer={<SubmitButton label="Continue Here" onPress={onContinue} />}
		>
			<StatusCard tone="success" title={CONFIRMED_TITLES[state.type]}>
				{EMAIL_CONFIRMED_LINE}
			</StatusCard>
		</AuthScreen>
	);
}

export { EmailLinkScreen };
export type { EmailLinkScreenProps };
