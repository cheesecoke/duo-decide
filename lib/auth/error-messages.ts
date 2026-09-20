/**
 * Supabase errors → the sentence each auth screen shows.
 *
 * Every one of these was an `if (error.message.includes(…))` ladder inline in
 * a screen's `catch`, which is why the same failure said four different things
 * depending on which form you were standing in front of. They are pure
 * functions now, and `__tests__/lib/auth/error-messages.test.ts` has one row
 * per branch per screen.
 *
 * ## Why the ladders are still per-screen
 *
 * They are not the same ladder. "session" means "your reset link expired" on
 * reset-password and "sign in again" on change-password; "password" means
 * "does not meet requirements" everywhere except sign-in, where it is not a
 * branch at all. Collapsing them into one mapper would mean picking one of
 * those sentences and being wrong on the other screens.
 *
 * ## The order matters
 *
 * `includes` on a raw GoTrue string is a substring match against a message we
 * do not control, and several of the needles overlap — "Invalid email" and
 * "invalid_credentials", "password" and "Password does not meet…". Each ladder
 * is in the order the screen had it, so the same error still resolves to the
 * same sentence.
 *
 * ## The fallthrough
 *
 * Every ladder ends by showing the raw message rather than the generic default.
 * That was the old behaviour and it is kept deliberately: a Supabase error we
 * have not mapped is usually more useful than "Please try again", and it is
 * how an unmapped case becomes visible instead of silently generic. The
 * generic default is only reached when there is no message at all.
 */

const NETWORK = "Network error. Please check your connection and try again.";
const INVALID_EMAIL = "Please enter a valid email address.";
const PASSWORD_REQUIREMENTS = "Password does not meet requirements. Please try again.";

/** Shown when `verifyCurrentPassword` returns false — a wrong current password. */
const CHANGE_PASSWORD_WRONG_CURRENT = "Your current password is incorrect.";

/** Shown when the session has no email to verify against, and on "session"/"Auth". */
const CHANGE_PASSWORD_SESSION_EXPIRED = "Your session has expired. Please sign in again.";

/**
 * The raw message, or "" when the error carries none.
 *
 * The old code guarded with `if (error.message)` and then called `.includes`
 * on it — which throws if it is not a string. Anything that is not a string is
 * treated as absent here, so a non-Error throw lands on the generic default
 * instead of taking the screen down.
 */
function messageOf(error: unknown): string {
	const message = (error as { message?: unknown } | null | undefined)?.message;
	return typeof message === "string" ? message : "";
}

/** True when the failure is the connection rather than the credentials. */
function isNetwork(message: string): boolean {
	return message.includes("network") || message.includes("fetch");
}

/** `app/sign-in.tsx` — "Sign in failed". */
function signInErrorMessage(error: unknown): string {
	const message = messageOf(error);
	if (!message) return "Failed to sign in. Please try again.";

	if (message.includes("Invalid login credentials") || message.includes("invalid_credentials")) {
		return "Incorrect email or password. Please try again.";
	}
	if (message.includes("Email not confirmed")) {
		return "Please confirm your email address before signing in. Check your inbox for the confirmation link.";
	}
	if (message.includes("Invalid email")) return INVALID_EMAIL;
	if (isNetwork(message)) return NETWORK;
	return message;
}

/** `app/sign-up.tsx` — "Sign up failed". */
function signUpErrorMessage(error: unknown): string {
	const message = messageOf(error);
	if (!message) return "Failed to create account. Please try again.";

	if (message.includes("already registered") || message.includes("already exists")) {
		return "This email is already registered. Try signing in instead.";
	}
	if (message.includes("Invalid email")) return INVALID_EMAIL;
	if (message.includes("password")) return PASSWORD_REQUIREMENTS;
	if (isNetwork(message)) return NETWORK;
	return message;
}

/** `app/forgot-password.tsx` — "Couldn't send reset email". */
function forgotPasswordErrorMessage(error: unknown): string {
	const message = messageOf(error);
	if (!message) return "Failed to send reset email. Please try again.";

	if (message.includes("Invalid email")) return INVALID_EMAIL;
	if (isNetwork(message)) return NETWORK;
	return message;
}

/** `app/reset-password.tsx` — "Couldn't update password", recovery flow. */
function resetPasswordErrorMessage(error: unknown): string {
	const message = messageOf(error);
	if (!message) return "Failed to update password. Please try again.";

	if (message.includes("session") || message.includes("Auth")) {
		return "Your reset link has expired or is invalid. Please request a new password reset email.";
	}
	if (message.includes("password")) return PASSWORD_REQUIREMENTS;
	if (isNetwork(message)) return NETWORK;
	return message;
}

/**
 * `app/change-password.tsx` — the *update* leg, after the current password has
 * already been verified.
 *
 * Reauthentication is checked before "session" because GoTrue's
 * reauthentication error says both words, and the sentence that helps is the
 * one about signing out and back in.
 */
function changePasswordErrorMessage(error: unknown): string {
	const message = messageOf(error);
	if (!message) return "Failed to update password. Please try again.";

	if (message.includes("reauthentication") || message.includes("Reauthentication")) {
		return "For security, please sign out and sign back in before changing your password.";
	}
	if (message.includes("session") || message.includes("Auth")) {
		return CHANGE_PASSWORD_SESSION_EXPIRED;
	}
	if (message.includes("password")) return PASSWORD_REQUIREMENTS;
	if (isNetwork(message)) return NETWORK;
	return message;
}

/**
 * `app/change-password.tsx` — the *verify* leg.
 *
 * Change-password is the one screen with two error sites, because it checks
 * the current password through `config/verify-current-password.ts` before it
 * changes anything. That call throws only when the check could not be made
 * (`verifyCurrentPassword` returns `false` for a wrong password), so this
 * mapper never says "incorrect" — that is `CHANGE_PASSWORD_WRONG_CURRENT`,
 * on the `false` path.
 */
function changePasswordVerifyErrorMessage(error: unknown): string {
	// The rate-limit status arrives inside the thrown message
	// ("Password verification failed (429)"), not as a field.
	return messageOf(error).includes("429")
		? "Too many attempts. Please wait a minute and try again."
		: "Couldn't verify your current password. Please try again.";
}

export {
	changePasswordErrorMessage,
	CHANGE_PASSWORD_SESSION_EXPIRED,
	changePasswordVerifyErrorMessage,
	CHANGE_PASSWORD_WRONG_CURRENT,
	forgotPasswordErrorMessage,
	resetPasswordErrorMessage,
	signInErrorMessage,
	signUpErrorMessage,
};
