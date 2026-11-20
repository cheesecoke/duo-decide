// Pure helpers for send-partner-invite. No Deno or npm imports, so Jest can
// test them (supabase/functions/_shared/__tests__/invite.test.ts).

export const DEFAULT_APP_URL = "https://duo-decide.com";

const DEFAULT_ALLOWED_ORIGINS = ["https://duo-decide.com", "https://www.duo-decide.com"];

/** Escape text for an HTML text node or a double-quoted attribute. */
export function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/** A name safe for a one-line email subject: no control characters, 60 chars max. */
export function cleanName(value: string): string {
	const flat = value.replace(/[\u0000-\u001f\u007f]+/g, " ").trim();
	return (flat || "Your partner").slice(0, 60);
}

/**
 * The link the email points to. The client still sends `appUrl` (old builds
 * too), but it's only used when its origin is on the allowlist; anything
 * else falls back to the production web app. `extraOrigins` comes from the
 * INVITE_ALLOWED_ORIGINS function secret (comma-separated), for localhost or
 * a preview domain.
 */
export function resolveAppUrl(requested: unknown, extraOrigins = ""): string {
	const allowed = new Set([
		...DEFAULT_ALLOWED_ORIGINS,
		...extraOrigins
			.split(",")
			.map((o) => o.trim().replace(/\/+$/, ""))
			.filter(Boolean),
	]);
	if (typeof requested !== "string") return DEFAULT_APP_URL;
	try {
		const url = new URL(requested);
		if (!allowed.has(url.origin)) return DEFAULT_APP_URL;
		return `${url.origin}${url.pathname === "/" ? "" : url.pathname}`;
	} catch {
		return DEFAULT_APP_URL;
	}
}

/** Postgres error codes raised by claim_partner_invite → HTTP status. */
export function statusForClaimError(code: string | undefined): number {
	switch (code) {
		case "42501":
			return 401;
		case "22023":
			return 400;
		case "P0002":
		case "DD409":
			return 409;
		case "DD429":
			return 429;
		default:
			return 500;
	}
}
