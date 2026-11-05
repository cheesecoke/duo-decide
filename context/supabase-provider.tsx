import { createContext, PropsWithChildren, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { SplashScreen, usePathname, useRouter } from "expo-router";

import { Session } from "@supabase/supabase-js";

import { supabase, getEmailRedirectTo } from "@/config/supabase";
import { getPasswordResetRedirectTo } from "@/config/password-reset-redirect";
import { isWebPasswordRecoveryEntry } from "@/config/password-recovery-detection";
import {
	type AuthLink,
	parseAuthUrl,
	RECOVERY_SESSION_FAILED_MESSAGE,
	recoveryLinkErrorMessage,
	stripAuthParams,
} from "@/config/auth-link";
import { getGoogleOAuthRedirectTo } from "@/config/oauth-redirect";

/** Routes the auth router never redirects away from. */
export const PUBLIC_ROUTES = ["/privacy", "/support"];

const RESET_PASSWORD_ROUTE = "/reset-password";

/** Where `finishPasswordRecovery` may send a signed-out user. */
type RecoveryExit = "/forgot-password";

/**
 * On web, the auth result a reset email left in the address bar, read once
 * on the first render. Only the reset page's link is handled here; anything
 * else is left to auth-js.
 */
function readWebRecoveryLink(): AuthLink {
	if (!isWebPasswordRecoveryEntry()) return { kind: "none" };
	const href = (globalThis as { location?: { href?: string } }).location?.href;
	return parseAuthUrl(href);
}

/** Drops the tokens (or the error) from the address bar and history. */
function clearWebAuthParams() {
	const { location, history } = globalThis as {
		location?: { href?: string };
		history?: {
			state: unknown;
			replaceState?: (state: unknown, unused: string, url: string) => void;
		};
	};
	if (!location?.href || typeof history?.replaceState !== "function") return;
	try {
		history.replaceState(history.state, "", stripAuthParams(location.href));
	} catch (error) {
		console.warn("Could not clear auth params from the URL:", error);
	}
}

SplashScreen.preventAutoHideAsync();

type AuthState = {
	initialized: boolean;
	session: Session | null;
	isPasswordRecovery: boolean;
	/** Why the reset link could not be used (expired, already used…), or null. */
	recoveryLinkError: string | null;
	signUp: (email: string, password: string) => Promise<void>;
	signIn: (email: string, password: string) => Promise<void>;
	signInWithGoogle: () => Promise<void>;
	signOut: () => Promise<void>;
	/** Deletes the account (`delete_my_account`), then clears the local session. Throws on failure. */
	deleteAccount: () => Promise<void>;
	resetPassword: (email: string) => Promise<void>;
	updatePassword: (password: string) => Promise<void>;
	/**
	 * Leaves the reset flow: clears recovery mode so the router takes over.
	 * With a session that is the app; without one it is Welcome, or `next`.
	 */
	finishPasswordRecovery: (next?: RecoveryExit) => void;
};

export const AuthContext = createContext<AuthState>({
	initialized: false,
	session: null,
	isPasswordRecovery: false,
	recoveryLinkError: null,
	signUp: async () => {},
	signIn: async () => {},
	signInWithGoogle: async () => {},
	signOut: async () => {},
	deleteAccount: async () => {},
	resetPassword: async () => {},
	updatePassword: async () => {},
	finishPasswordRecovery: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: PropsWithChildren) {
	const [initialized, setInitialized] = useState(false);
	const [session, setSession] = useState<Session | null>(null);
	const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => isWebPasswordRecoveryEntry());
	const [recoveryLinkError, setRecoveryLinkError] = useState<string | null>(null);
	// Read before anything can touch the URL.
	const [webRecoveryLink] = useState(() => (Platform.OS === "web" ? readWebRecoveryLink() : null));
	// Where a signed-out user goes when they leave the reset flow.
	const recoveryExitRef = useRef<RecoveryExit | null>(null);
	const router = useRouter();
	// Read inside the routing effect without re-running it on every navigation.
	const pathnameRef = useRef<string>("");
	pathnameRef.current = usePathname();

	const signUp = async (email: string, password: string) => {
		const emailRedirectTo = getEmailRedirectTo();
		const { data, error } = await supabase.auth.signUp({
			email,
			password,
			...(emailRedirectTo && { options: { emailRedirectTo } }),
		});

		if (error) {
			console.error("Error signing up:", error);
			throw error; // Throw error so UI can handle it
		}

		if (data.session) {
			setSession(data.session);
		}
	};

	const signIn = async (email: string, password: string) => {
		const { data, error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		if (error) {
			console.error("Error signing in:", error);
			throw error; // Propagate so sign-in page can show user-friendly message
		}

		if (data.session) {
			setSession(data.session);
		}
	};

	const signInWithGoogle = async () => {
		const redirectTo = getGoogleOAuthRedirectTo();
		if (!redirectTo) {
			throw new Error("Google sign-in is only supported on web in this version.");
		}

		const { error } = await supabase.auth.signInWithOAuth({
			provider: "google",
			options: { redirectTo },
		});

		if (error) {
			console.error("Error starting Google sign-in:", error);
			throw error;
		}
		// On web, supabase-js triggers a full-page redirect. No session is set here;
		// the session lands on return via detectSessionInUrl + PKCE, then flows
		// through the existing onAuthStateChange + routing effect.
	};

	const signOut = async () => {
		const { error } = await supabase.auth.signOut();

		if (error) {
			console.error("Error signing out:", error);
			return;
		} else {
			setSession(null);
			setIsPasswordRecovery(false);
		}
	};

	const deleteAccount = async () => {
		const { error } = await supabase.rpc("delete_my_account");
		if (error) throw error;

		// The auth user is gone, so the server-side sign-out would 403; only
		// the local session needs clearing. The routing effect then lands on
		// Welcome.
		await supabase.auth.signOut({ scope: "local" });
		setSession(null);
		setIsPasswordRecovery(false);
	};

	const resetPassword = async (email: string) => {
		const { error } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: getPasswordResetRedirectTo(),
		});

		if (error) {
			console.error("Error sending password reset:", error);
			throw error;
		}
	};

	const updatePassword = async (password: string) => {
		const { error } = await supabase.auth.updateUser({ password });

		if (error) {
			console.error("Error updating password:", error);
			throw error;
		}

		// Recovery mode stays on: the reset page shows its confirmation, and
		// its "Continue" button calls finishPasswordRecovery to move on.
	};

	const finishPasswordRecovery = (next?: RecoveryExit) => {
		recoveryExitRef.current = next ?? null;
		setRecoveryLinkError(null);
		setIsPasswordRecovery(false);
	};

	/**
	 * Restores the session a recovery link carries. Shared by the native
	 * deep-link handler and the web reset page.
	 */
	const restoreRecoverySession = async (link: Extract<AuthLink, { kind: "session" }>) => {
		const isRecovery = link.type === "recovery";
		// Flip the flag before restoring the session so the routing effect
		// sees recovery mode the moment the session lands.
		if (isRecovery) {
			setRecoveryLinkError(null);
			setIsPasswordRecovery(true);
		}

		const { error } = await supabase.auth.setSession({
			access_token: link.accessToken,
			refresh_token: link.refreshToken,
		});

		if (error) {
			console.error("Error restoring session from reset link:", error);
			if (isRecovery) setRecoveryLinkError(RECOVERY_SESSION_FAILED_MESSAGE);
		}
	};

	useEffect(() => {
		const initializeAuth = async () => {
			try {
				const {
					data: { session: currentSession },
					error: sessionError,
				} = await supabase.auth.getSession();

				if (sessionError) {
					console.warn("Error getting initial session:", sessionError);
				} else if (currentSession) {
					setSession(currentSession);
				}

				setInitialized(true);
			} catch (error) {
				console.error("Error during auth initialization:", error);
				setInitialized(true); // Still mark as initialized to prevent infinite loading
			}
		};

		initializeAuth();

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event, session) => {
			if (event === "PASSWORD_RECOVERY") {
				setIsPasswordRecovery(true);
			}
			setSession(session);
		});

		return () => subscription.unsubscribe();
	}, []);

	// Web reset page. Reset emails requested from the native app redirect to
	// https://duo-decide.com/reset-password#access_token=…&type=recovery — an
	// implicit-flow URL. The web client is PKCE, so auth-js's detectSessionInUrl
	// rejects it ("Not a valid PKCE flow url."), removes any stored session and
	// sets nothing. That all happens inside its initialize(), and setSession()
	// awaits initialize(), so the session set here always lands after that
	// sign-out rather than racing it. Errors in the link (an expired one) are
	// turned into a message for the page.
	useEffect(() => {
		if (!webRecoveryLink || webRecoveryLink.kind === "none") return;

		clearWebAuthParams();

		if (webRecoveryLink.kind === "error") {
			setRecoveryLinkError(recoveryLinkErrorMessage(webRecoveryLink));
			return;
		}

		if (webRecoveryLink.type === "recovery") {
			restoreRecoverySession(webRecoveryLink);
		}
	}, [webRecoveryLink]);

	// Native deep-link handler: duo-decide://reset-password#access_token=…&type=recovery.
	// Reset emails now redirect to the web page instead (see
	// config/password-reset-redirect.ts); this stays for universal links.
	useEffect(() => {
		if (Platform.OS === "web") return;

		const handleUrl = async (url: string) => {
			const link = parseAuthUrl(url);
			if (link.kind !== "session") return;
			await restoreRecoverySession(link);
		};

		const subscription = Linking.addEventListener("url", ({ url }) => {
			handleUrl(url);
		});

		Linking.getInitialURL().then((url) => {
			if (url) handleUrl(url);
		});

		return () => subscription.remove();
	}, []);

	useEffect(() => {
		const checkCoupleAndRoute = async () => {
			if (initialized) {
				await SplashScreen.hideAsync();

				if (isPasswordRecovery) {
					// Already there: replacing would remount the page and lose
					// its state (the "Password updated" confirmation).
					if (pathnameRef.current !== RESET_PASSWORD_ROUTE) {
						router.replace(RESET_PASSWORD_ROUTE);
					}
					return;
				}

				const recoveryExit = recoveryExitRef.current;
				recoveryExitRef.current = null;

				// Privacy and support are public and linked from the App Store:
				// signed in or out, whoever opens one stays on it.
				if (PUBLIC_ROUTES.includes(pathnameRef.current)) return;

				if (session) {
					// Check if user has a couple
					const { data: profile } = await supabase
						.from("profiles")
						.select("couple_id")
						.eq("id", session.user.id)
						.maybeSingle();

					if (!profile?.couple_id) {
						// Check if there's a pending partner invitation for this email
						const email = session.user.email?.toLowerCase();
						const { data: pendingCouple } = email
							? await supabase.from("couples").select("*").eq("pending_partner_email", email).maybeSingle()
							: { data: null };

						if (pendingCouple) {
							// Link user as partner (user2_id) and clear pending email
							await supabase
								.from("couples")
								.update({
									user2_id: session.user.id,
									pending_partner_email: null,
								})
								.eq("id", pendingCouple.id);

							// Update user's profile with couple_id
							await supabase.from("profiles").upsert({
								id: session.user.id,
								email: session.user.email!,
								couple_id: pendingCouple.id,
							});

							router.replace("/(protected)/(tabs)");
						} else {
							router.replace("/setup-partner");
						}
					} else {
						router.replace("/(protected)/(tabs)");
					}
				} else {
					router.replace(recoveryExit ?? "/welcome");
				}
			}
		};

		checkCoupleAndRoute();
		// eslint-disable-next-line
	}, [initialized, session, isPasswordRecovery]);

	return (
		<AuthContext.Provider
			value={{
				initialized,
				session,
				isPasswordRecovery,
				recoveryLinkError,
				signUp,
				signIn,
				signInWithGoogle,
				signOut,
				deleteAccount,
				resetPassword,
				updatePassword,
				finishPasswordRecovery,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}
