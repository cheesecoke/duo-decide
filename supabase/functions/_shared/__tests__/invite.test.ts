import { cleanName, escapeHtml, resolveAppUrl, statusForClaimError } from "../invite";

describe("escapeHtml", () => {
	it("escapes markup and quotes", () => {
		expect(escapeHtml(`<a href="x">Tom & 'Jerry'</a>`)).toBe(
			"&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;",
		);
	});
});

describe("cleanName", () => {
	it("strips control characters and newlines (subject injection)", () => {
		expect(cleanName("Chase\r\nBcc: x@y.com")).toBe("Chase Bcc: x@y.com");
	});
	it("caps length at 60", () => {
		expect(cleanName("a".repeat(200))).toHaveLength(60);
	});
	it("falls back when empty", () => {
		expect(cleanName("   ")).toBe("Your partner");
	});
});

describe("resolveAppUrl", () => {
	it("keeps the production web app", () => {
		expect(resolveAppUrl("https://duo-decide.com")).toBe("https://duo-decide.com");
		expect(resolveAppUrl("https://duo-decide.com/")).toBe("https://duo-decide.com");
		expect(resolveAppUrl("https://www.duo-decide.com/join")).toBe("https://www.duo-decide.com/join");
	});
	it("replaces any other origin with the production web app", () => {
		expect(resolveAppUrl("https://evil.example/phish")).toBe("https://duo-decide.com");
		expect(resolveAppUrl("javascript:alert(1)")).toBe("https://duo-decide.com");
		expect(resolveAppUrl("not a url")).toBe("https://duo-decide.com");
		expect(resolveAppUrl(undefined)).toBe("https://duo-decide.com");
		expect(resolveAppUrl("https://duo-decide.com.evil.example")).toBe("https://duo-decide.com");
	});
	it("allows extra origins from the function secret", () => {
		expect(
			resolveAppUrl("http://localhost:8081", "http://localhost:8081/, https://x.vercel.app"),
		).toBe("http://localhost:8081");
	});
});

describe("statusForClaimError", () => {
	it("maps database error codes to HTTP statuses", () => {
		expect(statusForClaimError("42501")).toBe(401);
		expect(statusForClaimError("22023")).toBe(400);
		expect(statusForClaimError("DD409")).toBe(409);
		expect(statusForClaimError("P0002")).toBe(409);
		expect(statusForClaimError("DD429")).toBe(429);
		expect(statusForClaimError(undefined)).toBe(500);
	});
});
