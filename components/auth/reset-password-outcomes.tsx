import * as React from "react";
import { Platform } from "react-native";

import { AuthScreen } from "@/components/auth/auth-screen";
import { StatusCard } from "@/components/auth/status-card";
import { SubmitButton } from "@/components/auth/submit-button";
import { Button } from "@/components/ui/reusables/button/button";
import { Text } from "@/components/ui/reusables/text/text";

/**
 * The two ends of the reset flow that are not the form: the link did not
 * work, or the password is changed. Both are whole screens, so the reset
 * page can swap to them and Storybook can show them without a provider.
 *
 * Most people reach the reset page in a phone's browser, from an email they
 * asked for in the app — so neither screen may be a dead end, and the
 * success one says plainly that the app is where the new password goes.
 */

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
	return (
		<Button
			variant="secondary"
			className="h-14 w-full rounded-button"
			accessibilityLabel={label}
			onPress={onPress}
		>
			<Text className="text-[16px] font-semibold leading-[22px]">{label}</Text>
		</Button>
	);
}

type ResetLinkErrorScreenProps = {
	message: string;
	onRequestNewLink: () => void;
	onBackToSignIn: () => void;
};

/** An expired, used or broken link: say so, and offer a new one. */
function ResetLinkErrorScreen({
	message,
	onRequestNewLink,
	onBackToSignIn,
}: ResetLinkErrorScreenProps) {
	return (
		<AuthScreen
			title="Reset Link Problem"
			footer={
				<>
					<SubmitButton label="Request a New Link" onPress={onRequestNewLink} />
					<SecondaryButton label="Back to Sign In" onPress={onBackToSignIn} />
				</>
			}
		>
			<StatusCard tone="error" title="This link can't be used">
				{message}
			</StatusCard>
		</AuthScreen>
	);
}

/**
 * The line under "Password updated" — where to use the new password. On web
 * that is the app the reset was most likely asked for from.
 */
function passwordUpdatedLine(): string {
	return Platform.OS === "web"
		? "You can now sign in with it in the Duo app."
		: "Use it the next time you sign in.";
}

/** The password is changed; the user decides when to move on. */
function PasswordUpdatedScreen({ onContinue }: { onContinue: () => void }) {
	return (
		<AuthScreen
			title="Password Updated"
			footer={<SubmitButton label="Continue to Duo" onPress={onContinue} />}
		>
			<StatusCard tone="success" title="Password updated">
				{passwordUpdatedLine()}
			</StatusCard>
		</AuthScreen>
	);
}

export { PasswordUpdatedScreen, ResetLinkErrorScreen };
export type { ResetLinkErrorScreenProps };
