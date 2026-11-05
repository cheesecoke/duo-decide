import * as React from "react";
import { router } from "expo-router";

import { ChangePasswordScreen } from "@/components/auth/change-password-screen";
import { useAuth } from "@/context/supabase-provider";

/**
 * Change password, or set one — reached from the settings sheet. The screen
 * and its two variants are in `components/auth/change-password-screen.tsx`.
 */
export default function ChangePassword() {
	const { updatePassword, session } = useAuth();

	return (
		<ChangePasswordScreen
			session={session}
			updatePassword={updatePassword}
			onDone={() => router.replace("/(protected)/(tabs)")}
		/>
	);
}
