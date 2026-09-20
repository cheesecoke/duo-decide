import * as z from "zod";

import {
	emailRule,
	passwordRules,
	signInPasswordRules,
	withConfirm,
} from "@/lib/auth/password-schema";

/**
 * The auth forms' zod rules, one row per message and per boundary.
 *
 * These strings are what a person reads when a form refuses them, so they are
 * asserted verbatim rather than matched loosely — a reword is a product
 * change and should fail here first.
 */

/** The first message zod produced, or null if the value passed. */
function firstError(schema: z.ZodTypeAny, value: unknown): string | null {
	const result = schema.safeParse(value);
	return result.success ? null : result.error.issues[0].message;
}

/** A password that satisfies all four classes, at whatever length is asked. */
function validPassword(length: number): string {
	const head = "Aa1!";
	return head + "x".repeat(Math.max(0, length - head.length));
}

describe("emailRule", () => {
	it.each([
		["chase@example.com", null],
		["chase+duo@example.co.uk", null],
		["", "Please enter a valid email address."],
		["not-an-email", "Please enter a valid email address."],
		["chase@", "Please enter a valid email address."],
		["@example.com", "Please enter a valid email address."],
	])("%s → %s", (value, expected) => {
		expect(firstError(emailRule, value)).toBe(expected);
	});
});

describe("passwordRules — length", () => {
	it.each([
		[7, "Please enter at least 8 characters."],
		[8, null],
		[64, null],
		[65, "Please enter fewer than 64 characters."],
	])("%s characters → %s", (length, expected) => {
		expect(firstError(passwordRules, validPassword(length))).toBe(expected);
	});

	it("says nothing about character classes when the value is empty", () => {
		// Zod reports issues in declaration order, and length is declared first.
		expect(firstError(passwordRules, "")).toBe("Please enter at least 8 characters.");
	});
});

describe("passwordRules — character classes", () => {
	it.each([
		["AA1!AAAA", "Your password must have at least one lowercase letter."],
		["aa1!aaaa", "Your password must have at least one uppercase letter."],
		["Aaa!aaaa", "Your password must have at least one number."],
		["Aa1aaaaa", "Your password must have at least one special character."],
		["Aa1!aaaa", null],
	])("%s → %s", (value, expected) => {
		expect(firstError(passwordRules, value)).toBe(expected);
	});

	it.each(["!", "@", "#", "$", "%", "^", "&", "*"])("accepts %s as the special character", (ch) => {
		expect(firstError(passwordRules, `Aa1${ch}aaaa`)).toBeNull();
	});

	it("does not accept a symbol outside the allowed set", () => {
		expect(firstError(passwordRules, "Aa1(aaaa")).toBe(
			"Your password must have at least one special character.",
		);
	});
});

describe("signInPasswordRules", () => {
	it.each([
		[7, "Please enter at least 8 characters."],
		[8, null],
		[64, null],
		[65, "Please enter fewer than 64 characters."],
	])("%s characters → %s", (length, expected) => {
		expect(firstError(signInPasswordRules, validPassword(length))).toBe(expected);
	});

	/**
	 * The deliberate asymmetry (see the module docblock): signing in must not
	 * enforce rules an existing password may predate.
	 */
	it("accepts a password that would fail the sign-up classes", () => {
		expect(firstError(signInPasswordRules, "allletters")).toBeNull();
		expect(firstError(passwordRules, "allletters")).toBe(
			"Your password must have at least one uppercase letter.",
		);
	});
});

describe("withConfirm", () => {
	const schema = withConfirm(z.object({ password: passwordRules }));

	function confirmError(password: string, confirmPassword: string): string | null {
		const result = schema.safeParse({ password, confirmPassword });
		if (result.success) return null;
		const issue = result.error.issues.find((i) => i.path[0] === "confirmPassword");
		return issue ? issue.message : null;
	}

	it("passes when both fields match", () => {
		expect(schema.safeParse({ password: "Aa1!aaaa", confirmPassword: "Aa1!aaaa" }).success).toBe(
			true,
		);
	});

	it("reports a mismatch on confirmPassword", () => {
		expect(confirmError("Aa1!aaaa", "Aa1!bbbb")).toBe("Your passwords do not match.");
	});

	it("reports the length rule on confirmPassword before the mismatch", () => {
		// Seven characters: the field's own min fires, not the cross-field refine.
		expect(confirmError("Aa1!aaaa", "Aa1!aa")).toBe("Please enter at least 8 characters.");
	});

	it("leaves the password field's own messages alone", () => {
		const result = schema.safeParse({ password: "aa1!aaaa", confirmPassword: "aa1!aaaa" });
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.issues[0].message).toBe(
			"Your password must have at least one uppercase letter.",
		);
	});

	it("carries the other fields of the schema it wraps", () => {
		const withEmail = withConfirm(z.object({ email: emailRule, password: passwordRules }));
		const result = withEmail.safeParse({
			email: "nope",
			password: "Aa1!aaaa",
			confirmPassword: "Aa1!aaaa",
		});
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.issues[0].message).toBe("Please enter a valid email address.");
	});
});
