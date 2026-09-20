import { View } from "react-native";
import { Redirect, Stack } from "expo-router";

import { StatusCard } from "@/components/auth/status-card";
import { ContentLayout } from "@/components/layout";
import { Caption } from "@/components/ui/reusables/headline/headline";
import { useAuth } from "@/context/supabase-provider";
import { UserContextProvider } from "@/context/user-context-provider";
import { RealtimeStatusProvider, useRealtimeStatus } from "@/context/realtime-status-context";
import { OptionListsProvider } from "@/context/option-lists-provider";
import { PersistedPersonPair } from "@/theme/PersistedPersonPair";

/**
 * The protected shell — FEATURE-INVENTORY §1.8, on the v2 system.
 *
 * The three gates are untouched: not initialised → nothing, password recovery
 * → `/reset-password`, no session → `/welcome`. They run before any of this
 * renders, which is why none of them has a design.
 *
 * ## The three limbo states
 *
 * Everything below `UserContextProvider` is a state you can be stuck in, and
 * all three of them were unstyled `Text`. Two are failures — `getUserContext()`
 * threw, or it came back `null` (which is what happens to a user with no couple
 * row at all, `lib/database.ts:1164-1167`) — and a failure that offers no way
 * out is the one place the system has a component for: `StatusCard
 * tone="error"`, which also carries the `role="alert"` these never had. The
 * third is just waiting, so it stays a `Caption`: a card would announce a
 * problem that has not happened.
 *
 * ## The corner illustrations are gone
 *
 * `CornerIllustrations` painted a decorative fish and goose into the bottom
 * corners on web ≥768 px. tokens.md §9 resolves what they are — Fish is
 * person A and Goose is person B, they appear on Welcome, the empty queue,
 * the result reveal and beside each vote, and "Nowhere else". A pair of the
 * same two marks sitting in the corners of every protected screen, meaning
 * nothing, is the thing that sentence rules out: it teaches you they are
 * wallpaper, and then the app asks you to read them as people. The component
 * and its two SVGs are deleted (nothing else imported them); `reusables/
 * character` is where the pair lives now. The `z-2` this wrapper carried went
 * with them — stacking the content above the illustrations was its only job.
 *
 * ## The person pair
 *
 * `PersistedPersonPair` goes here and nowhere else: it is the first point in
 * the tree that knows *who* is signed in, and the root `PersonPairProvider`
 * it writes to is above the navigator so a pick re-themes the header and the
 * drawer too. It holds the shell behind the same "Loading…" until the saved
 * row has been read — the alternative is painting every screen in sage +
 * blush and repainting it a tick later, on every cold start.
 *
 * ## `reconnecting`
 *
 * §0.6's banner (`role="status"`, so it is announced without interrupting)
 * sits above the tab content rather than over it: the realtime connection
 * dropping does not stop you reading or writing, so it must not cover
 * anything.
 */

/** The advice under both failure cards — there is one thing to try. */
const SIGN_OUT_ADVICE = "Please try signing out and back in.";

function ReconnectingBanner() {
	const { reconnecting } = useRealtimeStatus();
	if (!reconnecting) return null;

	return (
		<View role="status" className="items-center bg-surface-2 px-4 py-2">
			<Caption className="text-ink-2">Reconnecting…</Caption>
		</View>
	);
}

/** A limbo state: one block, vertically centred in the content column. */
function Limbo({ children }: { children: React.ReactNode }) {
	return (
		<ContentLayout scrollable={false}>
			<View className="flex-1 justify-center">{children}</View>
		</ContentLayout>
	);
}

/**
 * Waiting, in the one shape this screen has for it. Hoisted to a constant
 * because two things now wait behind it: the user context, and the saved
 * person pair (`PersistedPersonPair`, which holds the shell rather than let
 * the app paint itself in the default hues and repaint a tick later).
 */
const LOADING = (
	<Limbo>
		<Caption className="text-center">Loading…</Caption>
	</Limbo>
);

export const unstable_settings = {
	initialRouteName: "(tabs)",
};

export default function ProtectedLayout() {
	const { initialized, session, isPasswordRecovery } = useAuth();

	if (!initialized) {
		return null;
	}

	if (isPasswordRecovery) {
		return <Redirect href="/reset-password" />;
	}

	if (!session) {
		return <Redirect href="/welcome" />;
	}

	return (
		<UserContextProvider>
			{({ userContext, loading, error }) => {
				// Show loading state while fetching user context
				if (loading) {
					return LOADING;
				}

				// Show error state if user context failed to load
				if (error) {
					return (
						<Limbo>
							<StatusCard tone="error" title={error}>
								{SIGN_OUT_ADVICE}
							</StatusCard>
						</Limbo>
					);
				}

				// If no user context after loading, something is wrong
				if (!userContext) {
					return (
						<Limbo>
							<StatusCard tone="error" title="Unable to load user data.">
								{SIGN_OUT_ADVICE}
							</StatusCard>
						</Limbo>
					);
				}

				return (
					// The signed-in user's saved hues, pushed into the root
					// provider. It holds the shell behind the same "Loading…"
					// until the row is read, so a saved pair never flashes the
					// defaults on launch.
					<PersistedPersonPair userId={userContext.userId} fallback={LOADING}>
						<View className="flex-1 bg-bg">
							<View className="w-full max-w-[786px] flex-1 self-center">
								<RealtimeStatusProvider>
									<ReconnectingBanner />
									<OptionListsProvider coupleId={userContext.coupleId}>
										<Stack
											screenOptions={{
												headerShown: false,
												contentStyle: { backgroundColor: "transparent" },
											}}
										>
											<Stack.Screen name="(tabs)" />
										</Stack>
									</OptionListsProvider>
								</RealtimeStatusProvider>
							</View>
						</View>
					</PersistedPersonPair>
				);
			}}
		</UserContextProvider>
	);
}
