import * as React from "react";

import { EmailLinkScreen } from "@/components/auth/email-link-outcomes";
import { useAuth } from "@/context/supabase-provider";

/**
 * The landing screen for an email link opened on the web — most often a
 * sign-up confirmation requested from the iPhone app, which Supabase sends to
 * https://duo-decide.com with the session in the fragment.
 *
 * The provider reads the link, sets the session, and holds the router here
 * while `emailLink` is set. Leaving clears it: "Continue Here" goes on into
 * the app (or partner setup), "Go to Sign In" to the sign-in form. Opened
 * directly, with nothing to show, the router sends the visitor on as usual.
 */
export default function EmailConfirmed() {
	const { emailLink, dismissEmailLink } = useAuth();

	if (!emailLink) return null;

	return (
		<EmailLinkScreen
			state={emailLink}
			onContinue={() => dismissEmailLink()}
			onSignIn={() => dismissEmailLink("/sign-in")}
		/>
	);
}
