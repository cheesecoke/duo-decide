import * as React from "react";
import { ActivityIndicator, Platform, View } from "react-native";

import { StatusCard } from "@/components/auth/status-card";
import { Button } from "@/components/ui/reusables/button/button";
import { Text } from "@/components/ui/reusables/text/text";
import { useAuth } from "@/context/supabase-provider";
import { NEUTRAL } from "@/theme/neutrals";

/**
 * "Continue with Google" — web only, and it owns its own failure.
 *
 * `Platform.OS !== "web"` renders nothing (FEATURE-INVENTORY §1.2). Google
 * SSO on native needs a native client id and a redirect scheme neither app
 * target has, so the honest thing is to not offer it rather than offer it and
 * fail. The screens still guard the divider with the same check, because the
 * divider is about the *layout* and this component cannot know it is the only
 * thing under it.
 *
 * The error stays here rather than lifting into the screen's own error card.
 * A failed Google handshake is not a failed sign-in: the form above is still
 * usable, still filled in, and the screen's card says "Sign in failed", which
 * would be a lie about what just happened.
 *
 * On success there is nothing to do — supabase-js redirects the whole page
 * away, so `loading` is deliberately never cleared on the happy path.
 */
function GoogleAuthButton() {
	const { signInWithGoogle } = useAuth();
	const [loading, setLoading] = React.useState(false);
	const [failed, setFailed] = React.useState(false);

	async function onPress() {
		setFailed(false);
		setLoading(true);
		try {
			await signInWithGoogle();
		} catch (error) {
			setLoading(false);
			setFailed(true);
			console.error("GoogleAuthButton press error:", error);
		}
	}

	if (Platform.OS !== "web") return null;

	return (
		<View className="gap-2">
			<Button
				variant="secondary"
				className="h-14 w-full rounded-button"
				accessibilityLabel="Continue with Google"
				accessibilityState={{ busy: loading, disabled: loading }}
				disabled={loading}
				onPress={onPress}
			>
				{loading ? (
					<ActivityIndicator size="small" color={NEUTRAL.ink} />
				) : (
					<Text className="text-[16px] font-semibold leading-[22px]">Continue with Google</Text>
				)}
			</Button>
			{failed ? (
				<StatusCard tone="error" title="Couldn't start Google sign-in">
					{"Please try again."}
				</StatusCard>
			) : null}
		</View>
	);
}

export { GoogleAuthButton };
