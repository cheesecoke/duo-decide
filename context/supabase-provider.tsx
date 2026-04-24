import {
	createContext,
	PropsWithChildren,
	useContext,
	useEffect,
	useState,
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
};

export const AuthContext = createContext<AuthState>({
	initialized: false,
	session: null,
	signUp: async () => {},
	signIn: async () => {},
	signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: PropsWithChildren) {
	const [initialized, setInitialized] = useState(false);
	const [session, setSession] = useState<Session | null>(null);
	const router = useRouter();

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
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setSession(session);
		});

		return () => subscription.unsubscribe();
	}, []);

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

	return (
		<AuthContext.Provider
			value={{
				initialized,
				session,
				signUp,
				signIn,
				signOut,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}
