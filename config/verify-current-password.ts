/**
 * Verifies a user's current password WITHOUT creating or mutating a session.
 * Hits the GoTrue password-grant endpoint with fetch directly so no
 * onAuthStateChange fires (signInWithPassword would, re-triggering the global
 * routing effect). Returned tokens are intentionally discarded.
 *
 * @returns true if valid, false if credentials are wrong (HTTP 400).
 * @throws on rate-limit (429), unexpected status, or network failure — so the
 *         caller can distinguish "wrong password" from "couldn't check".
 */
export async function verifyCurrentPassword(email: string, password: string): Promise<boolean> {
	const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
	const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;
	const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
		method: "POST",
		headers: { "Content-Type": "application/json", apikey: supabaseAnonKey },
		body: JSON.stringify({ email, password }),
	});
	if (res.ok) return true;
	if (res.status === 400) return false;
	throw new Error(`Password verification failed (${res.status})`);
}
