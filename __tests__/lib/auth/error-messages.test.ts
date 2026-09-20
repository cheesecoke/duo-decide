import {
	changePasswordErrorMessage,
	CHANGE_PASSWORD_SESSION_EXPIRED,
	changePasswordVerifyErrorMessage,
	CHANGE_PASSWORD_WRONG_CURRENT,
	forgotPasswordErrorMessage,
	resetPasswordErrorMessage,
	signInErrorMessage,
	signUpErrorMessage,
} from "@/lib/auth/error-messages";

/**
 * One row per branch per screen, with the sentences copied from the screens
 * these ladders were lifted out of (FEATURE-INVENTORY §1.2–§1.6).
 *
 * The raw GoTrue strings are the ones Supabase actually sends, so a row here
 * doubles as the record of which substring each branch is keyed on.
 */

const NETWORK = "Network error. Please check your connection and try again.";
const INVALID_EMAIL = "Please enter a valid email address.";
const REQUIREMENTS = "Password does not meet requirements. Please try again.";

describe("signInErrorMessage", () => {
	it.each([
		["Invalid login credentials", "Incorrect email or password. Please try again."],
		["invalid_credentials", "Incorrect email or password. Please try again."],
		[
			"Email not confirmed",
			"Please confirm your email address before signing in. Check your inbox for the confirmation link.",
		],
		["Invalid email", INVALID_EMAIL],
		["network request failed", NETWORK],
		["Failed to fetch", NETWORK],
		["Something we have never seen", "Something we have never seen"],
	])("%s → %s", (raw, expected) => {
		expect(signInErrorMessage(new Error(raw))).toBe(expected);
	});

	it("falls back when the error carries no message", () => {
		expect(signInErrorMessage({})).toBe("Failed to sign in. Please try again.");
		expect(signInErrorMessage(null)).toBe("Failed to sign in. Please try again.");
		expect(signInErrorMessage("a bare string")).toBe("Failed to sign in. Please try again.");
	});
});

describe("signUpErrorMessage", () => {
	it.each([
		["User already registered", "This email is already registered. Try signing in instead."],
		[
			"A user with this email already exists",
			"This email is already registered. Try signing in instead.",
		],
		["Invalid email", INVALID_EMAIL],
		["password is too weak", REQUIREMENTS],
		["network request failed", NETWORK],
		["Failed to fetch", NETWORK],
		["Something we have never seen", "Something we have never seen"],
	])("%s → %s", (raw, expected) => {
		expect(signUpErrorMessage(new Error(raw))).toBe(expected);
	});

	it("falls back when the error carries no message", () => {
		expect(signUpErrorMessage({})).toBe("Failed to create account. Please try again.");
	});
});

describe("forgotPasswordErrorMessage", () => {
	it.each([
		["Invalid email", INVALID_EMAIL],
		["network request failed", NETWORK],
		["Failed to fetch", NETWORK],
		["Something we have never seen", "Something we have never seen"],
	])("%s → %s", (raw, expected) => {
		expect(forgotPasswordErrorMessage(new Error(raw))).toBe(expected);
	});

	it("falls back when the error carries no message", () => {
		expect(forgotPasswordErrorMessage({})).toBe("Failed to send reset email. Please try again.");
	});
});

describe("resetPasswordErrorMessage", () => {
	const EXPIRED =
		"Your reset link has expired or is invalid. Please request a new password reset email.";

	it.each([
		["Auth session missing!", EXPIRED],
		["session_not_found", EXPIRED],
		["password is too weak", REQUIREMENTS],
		["network request failed", NETWORK],
		["Failed to fetch", NETWORK],
		["Something we have never seen", "Something we have never seen"],
	])("%s → %s", (raw, expected) => {
		expect(resetPasswordErrorMessage(new Error(raw))).toBe(expected);
	});

	it("falls back when the error carries no message", () => {
		expect(resetPasswordErrorMessage({})).toBe("Failed to update password. Please try again.");
	});
});

describe("changePasswordErrorMessage", () => {
	const REAUTH = "For security, please sign out and sign back in before changing your password.";

	it.each([
		["Reauthentication is required", REAUTH],
		["reauthentication needed", REAUTH],
		["Auth session missing!", CHANGE_PASSWORD_SESSION_EXPIRED],
		["session_not_found", CHANGE_PASSWORD_SESSION_EXPIRED],
		["password is too weak", REQUIREMENTS],
		["network request failed", NETWORK],
		["Failed to fetch", NETWORK],
		["Something we have never seen", "Something we have never seen"],
	])("%s → %s", (raw, expected) => {
		expect(changePasswordErrorMessage(new Error(raw))).toBe(expected);
	});

	/**
	 * The ordering that matters: GoTrue's reauthentication error says "session"
	 * too, and the sentence that helps is the reauthentication one.
	 */
	it("prefers reauthentication over the session branch when both words appear", () => {
		expect(changePasswordErrorMessage(new Error("Reauthentication required for this session"))).toBe(
			REAUTH,
		);
	});

	it("falls back when the error carries no message", () => {
		expect(changePasswordErrorMessage({})).toBe("Failed to update password. Please try again.");
	});
});

describe("changePasswordVerifyErrorMessage", () => {
	it("says so when the check was rate-limited", () => {
		expect(changePasswordVerifyErrorMessage(new Error("Password verification failed (429)"))).toBe(
			"Too many attempts. Please wait a minute and try again.",
		);
	});

	it.each([
		new Error("Password verification failed (500)"),
		new Error("Network request failed"),
		{},
		null,
	])("says the check could not be made otherwise: %p", (error) => {
		expect(changePasswordVerifyErrorMessage(error)).toBe(
			"Couldn't verify your current password. Please try again.",
		);
	});

	/** A wrong password is not a thrown error — it is `false`, and its own string. */
	it("is not the sentence for a wrong current password", () => {
		expect(CHANGE_PASSWORD_WRONG_CURRENT).toBe("Your current password is incorrect.");
		expect(changePasswordVerifyErrorMessage(new Error("400"))).not.toBe(
			CHANGE_PASSWORD_WRONG_CURRENT,
		);
	});
});
