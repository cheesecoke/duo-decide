import type { User } from "@supabase/supabase-js";

/**
 * Does this user sign in with an email and password, or only through
 * another provider (Google, on the web)?
 *
 * Change Password asks for the current password, which a Google-only user
 * never had, so they get a "Set a password" form instead.
 *
 * ## Which field is read
 *
 * `app_metadata.providers` first. GoTrue keeps it on the user row and puts it
 * in every token and `/user` response, so it is on the session as soon as one
 * exists, and it lists every linked identity (`["email", "google"]` for an
 * email account that later signed in with Google). `user.identities` says the
 * same thing but is not always filled in on a session restored from storage
 * or set from a link, so it is the fallback.
 *
 * Neither list changes when a Google-only user sets a password with
 * `updateUser`: GoTrue stores the password but adds no `email` identity. Such
 * a user keeps seeing "Set a password", and submitting it again just replaces
 * the password. There is no field on the client that says a password exists.
 *
 * When nothing can be read at all, the answer is `true`: asking for a current
 * password is the safer default, since the form then checks it.
 */
export function hasEmailPasswordIdentity(user: User | null | undefined): boolean {
	if (!user) return true;

	const providers = user.app_metadata?.providers;
	if (Array.isArray(providers) && providers.length > 0) {
		return providers.includes("email");
	}

	const identities = user.identities;
	if (Array.isArray(identities) && identities.length > 0) {
		return identities.some((identity) => identity.provider === "email");
	}

	const provider = user.app_metadata?.provider;
	if (typeof provider === "string" && provider) return provider === "email";

	return true;
}

/** The settings row and the screen's title: "Change password" or "Set password". */
export function passwordActionLabel(
	user: User | null | undefined,
): "Change password" | "Set password" {
	return hasEmailPasswordIdentity(user) ? "Change password" : "Set password";
}
