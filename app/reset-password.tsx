import * as React from "react";
import { View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { AuthScreen } from "@/components/auth/auth-screen";
import {
	PasswordUpdatedScreen,
	ResetLinkErrorScreen,
} from "@/components/auth/reset-password-outcomes";
import { StatusCard } from "@/components/auth/status-card";
import { SubmitButton } from "@/components/auth/submit-button";
import { Button } from "@/components/ui/reusables/button/button";
import { Form, FormField, FormInput } from "@/components/ui/reusables/form/form";
import { Caption } from "@/components/ui/reusables/headline/headline";
import { Text } from "@/components/ui/reusables/text/text";
import { useAuth } from "@/context/supabase-provider";
import { resetPasswordErrorMessage } from "@/lib/auth/error-messages";
import { passwordRules, withConfirm } from "@/lib/auth/password-schema";

/**
 * Choose a new password — FEATURE-INVENTORY §1.5, on the v2 system.
 *
 * This is the one auth screen you cannot back out of: `app/_layout.tsx`
 * gives it a header with no back button and disables the swipe gesture, so
 * the only way out is the button at the bottom, which signs you out. That
 * layout config is unchanged.
 *
 * ## Three status blocks, and why they cannot collide
 *
 * §1.5 lists them as mutually exclusive, and the conditions make them so
 * rather than an `else if` chain enforcing it:
 *
 * | `isPasswordRecovery` | `session` | what shows |
 * | -------------------- | --------- | ---------- |
 * | true                 | null      | "Verifying your reset link…" |
 * | true                 | set       | nothing — the link worked |
 * | false                | null      | "No active reset session" |
 * | false                | set       | nothing — you are just signed in |
 *
 * The submit failure is a fourth, independent block: it needs a session to
 * have happened at all, so it can only ever appear in one of the two rows
 * where the other two are silent.
 *
 * ## The button is disabled without a session
 *
 * Not because submitting would fail — it would, loudly — but because the
 * *reason* it would fail is the thing the card above it already explains.
 * A button that can be pressed into an error you have already been told
 * about is a button that wastes a person's time.
 *
 * ## Two screens that replace the form
 *
 * - **The link did not work** (`recoveryLinkError`): it came back expired or
 *   used, or Supabase refused its tokens. The form could never succeed, so it
 *   is not shown; the screen offers a new link instead.
 * - **The password is updated.** The provider keeps recovery mode on after
 *   the update, so this confirmation stays up — most people get here in a
 *   phone browser from an email they asked for in the app, and need to be
 *   told the new password works there — until "Continue to Duo" calls
 *   `finishPasswordRecovery` and the router takes over.
 */

const formSchema = withConfirm(z.object({ password: passwordRules }));

export default function ResetPassword() {
	const {
		updatePassword,
		session,
		isPasswordRecovery,
		recoveryLinkError,
		finishPasswordRecovery,
		signOut,
	} = useAuth();
	const [updateError, setUpdateError] = React.useState<string | null>(null);
	const [updated, setUpdated] = React.useState(false);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: { password: "", confirmPassword: "" },
	});

	async function onSubmit(data: z.infer<typeof formSchema>) {
		setUpdateError(null);

		try {
			await updatePassword(data.password);
			form.reset();
			setUpdated(true);
		} catch (error) {
			console.error("Update password error:", error);
			setUpdateError(resetPasswordErrorMessage(error));
		}
	}

	if (recoveryLinkError) {
		return (
			<ResetLinkErrorScreen
				message={recoveryLinkError}
				onRequestNewLink={() => finishPasswordRecovery("/forgot-password")}
				onBackToSignIn={async () => {
					await signOut();
				}}
			/>
		);
	}

	if (updated) {
		// AuthProvider's routing effect takes it from here once recovery mode
		// is off: into the app with the session, or to Welcome without one.
		return <PasswordUpdatedScreen onContinue={() => finishPasswordRecovery()} />;
	}

	const verifying = isPasswordRecovery && !session;
	const noSession = !isPasswordRecovery && !session;

	return (
		<AuthScreen
			title="Choose New Password"
			intro="Enter a new password for your account."
			footer={
				<>
					<SubmitButton
						label="Update Password"
						submitting={form.formState.isSubmitting}
						disabled={!session}
						onPress={form.handleSubmit(onSubmit)}
					/>
					<Button
						variant="secondary"
						className="h-14 w-full rounded-button"
						accessibilityLabel="Back to Sign In"
						onPress={async () => {
							await signOut();
						}}
					>
						<Text className="text-[16px] font-semibold leading-[22px]">Back to Sign In</Text>
					</Button>
				</>
			}
		>
			{verifying ? (
				<Caption testID="reset-verifying" className="text-ink-3">
					Verifying your reset link…
				</Caption>
			) : null}

			{noSession ? (
				<StatusCard tone="error" title="No active reset session">
					{"Open this page from the link in your password reset email, or request a new one."}
				</StatusCard>
			) : null}

			{updateError ? (
				<StatusCard tone="error" title="Couldn't update password">
					{updateError}
				</StatusCard>
			) : null}

			<Form {...form}>
				<View className="gap-4">
					<FormField
						control={form.control}
						name="password"
						render={({ field }) => (
							<FormInput
								label="New password"
								placeholder="New password"
								autoCapitalize="none"
								autoCorrect={false}
								secureTextEntry
								{...field}
							/>
						)}
					/>
					<FormField
						control={form.control}
						name="confirmPassword"
						render={({ field }) => (
							<FormInput
								label="Confirm new password"
								placeholder="Confirm new password"
								autoCapitalize="none"
								autoCorrect={false}
								secureTextEntry
								{...field}
							/>
						)}
					/>
				</View>
			</Form>
		</AuthScreen>
	);
}
