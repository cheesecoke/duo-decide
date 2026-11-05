import type { User } from "@supabase/supabase-js";

import { hasEmailPasswordIdentity, passwordActionLabel } from "@/lib/auth/password-identity";

function user(fields: { providers?: unknown; provider?: string; identities?: unknown }): User {
	return {
		id: "u1",
		app_metadata: {
			...(fields.providers !== undefined && { providers: fields.providers }),
			...(fields.provider !== undefined && { provider: fields.provider }),
		},
		...(fields.identities !== undefined && { identities: fields.identities }),
	} as unknown as User;
}

const identity = (provider: string) => ({ provider, id: `${provider}-1` });

describe("hasEmailPasswordIdentity", () => {
	it("is true for an email sign-up", () => {
		expect(hasEmailPasswordIdentity(user({ providers: ["email"] }))).toBe(true);
	});

	it("is false for a Google-only sign-up", () => {
		expect(hasEmailPasswordIdentity(user({ providers: ["google"], provider: "google" }))).toBe(false);
	});

	it("is true for an email account that later linked Google", () => {
		expect(hasEmailPasswordIdentity(user({ providers: ["email", "google"] }))).toBe(true);
	});

	it("trusts the provider list over the identities", () => {
		expect(
			hasEmailPasswordIdentity(user({ providers: ["google"], identities: [identity("email")] })),
		).toBe(false);
	});

	it("falls back to the identities when there is no provider list", () => {
		expect(hasEmailPasswordIdentity(user({ identities: [identity("google")] }))).toBe(false);
		expect(
			hasEmailPasswordIdentity(user({ identities: [identity("google"), identity("email")] })),
		).toBe(true);
	});

	it("falls back to the primary provider when there is neither list", () => {
		expect(hasEmailPasswordIdentity(user({ provider: "google", identities: [] }))).toBe(false);
		expect(hasEmailPasswordIdentity(user({ provider: "email" }))).toBe(true);
	});

	it("asks for the current password when it cannot tell", () => {
		expect(hasEmailPasswordIdentity(user({}))).toBe(true);
		expect(hasEmailPasswordIdentity(user({ providers: [], identities: [] }))).toBe(true);
		expect(hasEmailPasswordIdentity(null)).toBe(true);
		expect(hasEmailPasswordIdentity(undefined)).toBe(true);
	});
});

describe("passwordActionLabel", () => {
	it("says Change for an email account and Set for a Google-only one", () => {
		expect(passwordActionLabel(user({ providers: ["email"] }))).toBe("Change password");
		expect(passwordActionLabel(user({ providers: ["google"] }))).toBe("Set password");
		expect(passwordActionLabel(null)).toBe("Change password");
	});
});
