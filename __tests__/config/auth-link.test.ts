import {
	emailLinkErrorMessage,
	isEmailLinkType,
	parseAuthFragment,
	parseAuthUrl,
	recoveryLinkErrorMessage,
	stripAuthParams,
} from "@/config/auth-link";

const RECOVERY_HASH =
	"access_token=at.123&expires_at=1999999999&expires_in=3600&refresh_token=rt456&token_type=bearer&type=recovery";

const EXPIRED_HASH =
	"error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired";

describe("parseAuthFragment", () => {
	it("reads a valid recovery hash", () => {
		expect(parseAuthFragment(`#${RECOVERY_HASH}`)).toEqual({
			kind: "session",
			accessToken: "at.123",
			refreshToken: "rt456",
			type: "recovery",
		});
	});

	it("reads the same hash without its #", () => {
		expect(parseAuthFragment(RECOVERY_HASH)).toMatchObject({ kind: "session", type: "recovery" });
	});

	it("reads an error hash", () => {
		expect(parseAuthFragment(`#${EXPIRED_HASH}`)).toEqual({
			kind: "error",
			error: "access_denied",
			code: "otp_expired",
			description: "Email link is invalid or has expired",
		});
	});

	it.each([[""], ["#"], [null], [undefined]])("returns none for an empty hash (%p)", (hash) => {
		expect(parseAuthFragment(hash)).toEqual({ kind: "none" });
	});

	it("returns none without both tokens", () => {
		expect(parseAuthFragment("#access_token=at&type=recovery")).toEqual({ kind: "none" });
		expect(parseAuthFragment("#refresh_token=rt&type=recovery")).toEqual({ kind: "none" });
	});

	it("leaves type null when the link has none", () => {
		expect(parseAuthFragment("#access_token=a&refresh_token=r")).toMatchObject({ type: null });
	});

	it("prefers an error over tokens", () => {
		expect(parseAuthFragment(`#${RECOVERY_HASH}&error=server_error`).kind).toBe("error");
	});
});

describe("parseAuthUrl", () => {
	it("reads the web reset page's recovery link", () => {
		expect(parseAuthUrl(`https://duo-decide.com/reset-password#${RECOVERY_HASH}`)).toMatchObject({
			kind: "session",
			accessToken: "at.123",
		});
	});

	it("reads the native deep link", () => {
		expect(parseAuthUrl(`duo-decide://reset-password#${RECOVERY_HASH}`)).toMatchObject({
			kind: "session",
			type: "recovery",
		});
	});

	it("reads an error from the query string", () => {
		expect(
			parseAuthUrl("https://duo-decide.com/reset-password?error=access_denied&error_code=otp_expired"),
		).toMatchObject({ kind: "error", code: "otp_expired" });
	});

	it("does not take tokens from the query string", () => {
		expect(
			parseAuthUrl("https://duo-decide.com/reset-password?access_token=a&refresh_token=r"),
		).toEqual({ kind: "none" });
	});

	it.each([
		["https://duo-decide.com/reset-password"],
		["https://duo-decide.com/reset-password#"],
		["https://duo-decide.com/reset-password?code=abc"],
		[""],
		[undefined],
	])("returns none for %p", (url) => {
		expect(parseAuthUrl(url)).toEqual({ kind: "none" });
	});
});

describe("stripAuthParams", () => {
	it("drops the token fragment", () => {
		expect(stripAuthParams(`https://duo-decide.com/reset-password#${RECOVERY_HASH}`)).toBe(
			"/reset-password",
		);
	});

	it("drops error params and keeps the rest of the query", () => {
		expect(
			stripAuthParams(
				"https://duo-decide.com/reset-password?ref=mail&error=access_denied&error_code=otp_expired&error_description=x",
			),
		).toBe("/reset-password?ref=mail");
	});
});

describe("recoveryLinkErrorMessage", () => {
	it("says an expired link has expired", () => {
		const link = parseAuthFragment(EXPIRED_HASH);
		if (link.kind !== "error") throw new Error("expected an error link");
		expect(recoveryLinkErrorMessage(link)).toBe("This reset link has expired. Request a new one.");
	});

	it("says anything else is invalid", () => {
		expect(
			recoveryLinkErrorMessage({
				kind: "error",
				error: "server_error",
				code: null,
				description: "Something broke",
			}),
		).toBe("This reset link is invalid or has already been used. Request a new one.");
	});
});

describe("email links (sign-up confirmations and friends)", () => {
	it("reads a sign-up confirmation hash", () => {
		expect(
			parseAuthFragment("#access_token=a.1&refresh_token=r1&expires_in=3600&type=signup"),
		).toEqual({ kind: "session", accessToken: "a.1", refreshToken: "r1", type: "signup" });
	});

	it("reads a magic link hash", () => {
		expect(parseAuthFragment("access_token=a.2&refresh_token=r2&type=magiclink")).toEqual({
			kind: "session",
			accessToken: "a.2",
			refreshToken: "r2",
			type: "magiclink",
		});
	});

	it.each(["signup", "magiclink", "invite", "email_change"])("takes %s", (type) => {
		expect(isEmailLinkType(type)).toBe(true);
	});

	it.each(["recovery", "", null, undefined, "SIGNUP"])("leaves %p alone", (type) => {
		expect(isEmailLinkType(type)).toBe(false);
	});

	it("says an expired link has expired, and how to get a new one", () => {
		const link = parseAuthFragment(EXPIRED_HASH);
		if (link.kind !== "error") throw new Error("expected an error link");
		expect(emailLinkErrorMessage(link)).toBe(
			"This link has expired. If you were confirming a new account, sign up again with the same email to get a new link.",
		);
	});

	it("says anything else is invalid or used, and that a confirmed account can sign in", () => {
		expect(
			emailLinkErrorMessage({ kind: "error", error: "server_error", code: null, description: null }),
		).toBe(
			"This link is invalid or has already been used. If you already confirmed your email, you can sign in.",
		);
	});
});
