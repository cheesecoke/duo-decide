import * as z from "zod";

/**
 * The auth forms' zod rules, in one place.
 *
 * Six screens ask for an email and a password and four of them asked for the
 * *same* password twice. Before this file each screen carried its own copy of
 * the rules and its own copy of the seven messages, which is how sign-in ended
 * up enforcing 8–64 while sign-up, reset and change enforced 8–64 plus four
 * character classes — a difference nobody chose. They are the same rules now,
 * declared once and table-tested in `__tests__/lib/auth/password-schema.test.ts`.
 *
 * The messages are the strings the old screens showed, verbatim: they are
 * user-facing copy, so a reword here is a product change, not a refactor.
 *
 * Sign-in deliberately keeps the *weaker* rule (`signInPasswordRules`). A
 * sign-in form validates a password that already exists; telling someone their
 * existing password "must have at least one number" before the server has even
 * seen it is a lie about their account, and it locks out anyone who signed up
 * before a rule was added.
 */

const MESSAGE = {
	email: "Please enter a valid email address.",
	tooShort: "Please enter at least 8 characters.",
	tooLong: "Please enter fewer than 64 characters.",
	lowercase: "Your password must have at least one lowercase letter.",
	uppercase: "Your password must have at least one uppercase letter.",
	number: "Your password must have at least one number.",
	special: "Your password must have at least one special character.",
	mismatch: "Your passwords do not match.",
} as const;

/** `email` on every auth form. */
const emailRule = z.string().email(MESSAGE.email);

/**
 * The password a *new* password has to be: 8–64 and one of each class.
 *
 * Written as four lookaheads rather than one, so the message names the class
 * that is actually missing instead of restating all four.
 */
const passwordRules = z
	.string()
	.min(8, MESSAGE.tooShort)
	.max(64, MESSAGE.tooLong)
	.regex(/^(?=.*[a-z])/, MESSAGE.lowercase)
	.regex(/^(?=.*[A-Z])/, MESSAGE.uppercase)
	.regex(/^(?=.*[0-9])/, MESSAGE.number)
	.regex(/^(?=.*[!@#$%^&*])/, MESSAGE.special);

/** Sign-in's password: length only. See the docblock. */
const signInPasswordRules = z.string().min(8, MESSAGE.tooShort).max(64, MESSAGE.tooLong);

/**
 * Adds `confirmPassword` and the cross-field match to a schema that already
 * has a `password`.
 *
 * The refine lands on `confirmPassword` (`path`), not on the object: a form
 * error with no path has nowhere to render, and "do not match" belongs under
 * the field the user can fix by retyping.
 */
function withConfirm<Shape extends z.ZodRawShape>(schema: z.ZodObject<Shape>) {
	return schema.extend({ confirmPassword: z.string().min(8, MESSAGE.tooShort) }).refine(
		(data) => {
			const { password, confirmPassword } = data as {
				password: string;
				confirmPassword: string;
			};
			return password === confirmPassword;
		},
		{ message: MESSAGE.mismatch, path: ["confirmPassword"] },
	);
}

export { emailRule, MESSAGE, passwordRules, signInPasswordRules, withConfirm };
