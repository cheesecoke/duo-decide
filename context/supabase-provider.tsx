import {
	createContext,
	PropsWithChildren,
	useContext,
	useEffect,
	useState,
	useCallback,
} from "react";
import { SplashScreen, useRouter } from "expo-router";

import { Session } from "@supabase/supabase-js";

import { supabase, getEmailRedirectTo } from "@/config/supabase";

SplashScreen.preventAutoHideAsync();

type AuthState = {
	initialized: boolean;
	session: Session | null;
	signUp: (email: string, password: string) => Promise<void>;
	signIn: (email: string, password: string) => Promise<void>;
	signOut: () => Promise<void>;
	// TEMPORARY: Development helper functions
	// TODO: Remove these in production
	refreshSession: () => Promise<void>;
	checkAuthState: () => Promise<void>;
};

export const AuthContext = createContext<AuthState>({
	initialized: false,
	session: null,
	signUp: async () => {},
	signIn: async () => {},
	signOut: async () => {},
	refreshSession: async () => {},
	checkAuthState: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: PropsWithChildren) {
	const [initialized, setInitialized] = useState(false);
	const [session, setSession] = useState<Session | null>(null);
	const router = useRouter();

	// TEMPORARY: Enhanced session recovery for development
	// TODO: Implement proper production session management
	const refreshSession = useCallback(async () => {
		try {
			const { data, error } = await supabase.auth.refreshSession();

			if (error) {
				console.warn("Session refresh failed:", error);
				// If refresh fails, try to get the current session
				const { data: sessionData } = await supabase.auth.getSession();
				if (sessionData.session) {
					setSession(sessionData.session);
				}
			} else if (data.session) {
				setSession(data.session);
			}
		} catch (error) {
			console.error("Error during session refresh:", error);
		}
	}, []);

	const checkAuthState = useCallback(async () => {
		try {
			const {
				data: { session: currentSession },
				error,
			} = await supabase.auth.getSession();

			if (error) {
				console.warn("Error getting session:", error);
				return;
			}

			if (currentSession) {
				setSession(currentSession);
			}
		} catch (error) {
			console.error("Error checking auth state:", error);
		}
	}, []);

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

	const signOut = async () => {
		const { error } = await supabase.auth.signOut();

		if (error) {
			console.error("Error signing out:", error);
			return;
		} else {
			setSession(null);
		}
	};

	useEffect(() => {
		// TEMPORARY: Enhanced session initialization for development
		// TODO: Implement proper production session initialization
		const initializeAuth = async () => {
			try {
				// First, try to get the current session
				const {
					data: { session: currentSession },
					error: sessionError,
				} = await supabase.auth.getSession();

				if (sessionError) {
					console.warn("Error getting initial session:", sessionError);
				} else if (currentSession) {
					setSession(currentSession);
				}

				// TEMPORARY: In development, try to recover from storage if no session
				// TODO: Remove this in production
				if (__DEV__ && !currentSession) {
					await checkAuthState();
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
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setSession(session);
		});

		return () => subscription.unsubscribe();
	}, [checkAuthState]);

	useEffect(() => {
		const checkCoupleAndRoute = async () => {
			if (initialized) {
				await SplashScreen.hideAsync();

				if (session) {
					// Check if user has a couple
					const { data: profile } = await supabase
						.from("profiles")
						.select("couple_id")
						.eq("id", session.user.id)
						.maybeSingle();

					if (!profile?.couple_id) {
						// Check if there's a pending partner invitation for this email
						const { data: pendingCouple } = await supabase
							.from("couples")
							.select("*")
							.eq("pending_partner_email", session.user.email?.toLowerCase())
							.maybeSingle();

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
					router.replace("/welcome");
				}
			}
		};

		checkCoupleAndRoute();
		// eslint-disable-next-line
	}, [initialized, session]);

	// TEMPORARY: Development helper effect for session monitoring
	// TODO: Remove this in production
	useEffect(() => {
		if (__DEV__ && initialized) {
			// Dev-only session monitor hook.
		}
	}, [session, initialized]);

	return (
		<AuthContext.Provider
			value={{
				initialized,
				session,
				signUp,
				signIn,
				signOut,
				refreshSession,
				checkAuthState,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}
