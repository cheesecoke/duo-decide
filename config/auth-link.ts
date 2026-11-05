/**
 * Reads what a Supabase auth email link left in the URL it redirected to.
 *
 * GoTrue's `/auth/v1/verify` redirects with the result in the fragment when
 * the request came from an implicit-flow client — which the native app is:
 *
 *   …/reset-password#access_token=…&refresh_token=…&type=recovery
 *   …/reset-password#error=access_denied&error_code=otp_expired&error_description=…
 *
 * Errors can also arrive in the query string (PKCE-flow redirects put them
 * there), so the parser looks at both, fragment first.
 *
 * Used twice: by the native deep-link handler, and by the web reset page,
 * which has to set the session itself because the web client is a PKCE
 * client and auth-js refuses an implicit-flow URL ("Not a valid PKCE flow
 * url.") instead of reading it.
 */

export type AuthLink =
	| { kind: "none" }
	| { kind: "session"; accessToken: string; refreshToken: string; type: string | null }
	| { kind: "error"; error: string | null; code: string | null; description: string | null };

const NONE: AuthLink = { kind: "none" };

function fromParams(params: URLSearchParams): AuthLink {
	const error = params.get("error");
	const code = params.get("error_code");
	const description = params.get("error_description");
	if (error || code || description) {
		return { kind: "error", error, code, description };
	}

	const accessToken = params.get("access_token");
	const refreshToken = params.get("refresh_token");
	if (accessToken && refreshToken) {
		return { kind: "session", accessToken, refreshToken, type: params.get("type") };
	}

	return NONE;
}

/** Parses a fragment (with or without its leading `#`). */
export function parseAuthFragment(fragment: string | null | undefined): AuthLink {
	if (!fragment) return NONE;
	const body = fragment.startsWith("#") ? fragment.slice(1) : fragment;
	if (!body) return NONE;
	return fromParams(new URLSearchParams(body));
}

/** Parses a whole URL: the fragment first, then the query string for errors. */
export function parseAuthUrl(url: string | null | undefined): AuthLink {
	if (!url) return NONE;

	const hashIndex = url.indexOf("#");
	const fromHash = parseAuthFragment(hashIndex === -1 ? "" : url.slice(hashIndex + 1));
	if (fromHash.kind !== "none") return fromHash;

	const beforeHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
	const queryIndex = beforeHash.indexOf("?");
	if (queryIndex === -1) return NONE;

	const fromQuery = fromParams(new URLSearchParams(beforeHash.slice(queryIndex + 1)));
	// Tokens are only ever sent in the fragment; only trust errors from the query.
	return fromQuery.kind === "error" ? fromQuery : NONE;
}

const AUTH_QUERY_KEYS = ["error", "error_code", "error_description"];

/**
 * The same URL with the auth fragment and any auth error params removed, so
 * a token is not left in the address bar or history, and a reload does not
 * replay an error. Returns a path (`/reset-password?x=1`), for
 * `history.replaceState`.
 */
export function stripAuthParams(url: string): string {
	const parsed = new URL(url);
	for (const key of AUTH_QUERY_KEYS) parsed.searchParams.delete(key);
	const search = parsed.searchParams.toString();
	return `${parsed.pathname}${search ? `?${search}` : ""}`;
}

/** The sentence the reset page shows for a link that came back with an error. */
export function recoveryLinkErrorMessage(link: Extract<AuthLink, { kind: "error" }>): string {
	const haystack = `${link.code ?? ""} ${link.error ?? ""} ${link.description ?? ""}`.toLowerCase();
	if (haystack.includes("otp_expired") || haystack.includes("expired")) {
		return "This reset link has expired. Request a new one.";
	}
	return "This reset link is invalid or has already been used. Request a new one.";
}

/** Shown when the link carried tokens but Supabase would not accept them. */
export const RECOVERY_SESSION_FAILED_MESSAGE =
	"This reset link is invalid or has already been used. Request a new one.";

/**
 * Link types, other than `recovery`, that land on the web with a session in
 * the fragment: a sign-up confirmation sent from the native app (an
 * implicit-flow client), and the other email links GoTrue sends the same way.
 */
export const EMAIL_LINK_TYPES = ["signup", "magiclink", "invite", "email_change"] as const;

export type EmailLinkType = (typeof EMAIL_LINK_TYPES)[number];

export function isEmailLinkType(type: string | null | undefined): type is EmailLinkType {
	return (EMAIL_LINK_TYPES as readonly string[]).includes(type ?? "");
}

/**
 * What an email link (sign-up confirmation, magic link, invite, email
 * change) left on the web, for the "Email confirmed" screen:
 *
 * - `verifying`: the link carried a session and it is being restored;
 * - `confirmed`: the session is set;
 * - `error`: the link came back with an error (expired, used), or Supabase
 *   refused its tokens.
 */
export type EmailLinkState =
	| { status: "verifying"; type: EmailLinkType }
	| { status: "confirmed"; type: EmailLinkType }
	| { status: "error"; message: string };

/** Shown for any other error, and when the link carried tokens Supabase would not accept. */
export const EMAIL_LINK_SESSION_FAILED_MESSAGE =
	"This link is invalid or has already been used. If you already confirmed your email, you can sign in.";

/** The sentence the "Email confirmed" screen shows for a link that came back with an error. */
export function emailLinkErrorMessage(link: Extract<AuthLink, { kind: "error" }>): string {
	const haystack = `${link.code ?? ""} ${link.error ?? ""} ${link.description ?? ""}`.toLowerCase();
	if (haystack.includes("otp_expired") || haystack.includes("expired")) {
		return "This link has expired. If you were confirming a new account, sign up again with the same email to get a new link.";
	}
	return EMAIL_LINK_SESSION_FAILED_MESSAGE;
}
