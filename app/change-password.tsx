import * as React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { AuthScreen } from "@/components/auth/auth-screen";
import { StatusCard } from "@/components/auth/status-card";
import { SubmitButton } from "@/components/auth/submit-button";
import { Form, FormField, FormInput } from "@/components/ui/reusables/form/form";
import { verifyCurrentPassword } from "@/config/verify-current-password";
import { useAuth } from "@/context/supabase-provider";
import {
	changePasswordErrorMessage,
	CHANGE_PASSWORD_SESSION_EXPIRED,
	changePasswordVerifyErrorMessage,
	CHANGE_PASSWORD_WRONG_CURRENT,
} from "@/lib/auth/error-messages";
import { passwordRules, withConfirm } from "@/lib/auth/password-schema";

/**
 * Change password — FEATURE-INVENTORY §1.6, on the v2 system.
 *
 * Reached from the settings sheet only. Two variants on `updated`.
 *
 * ## The current password is checked before anything is changed
 *
 * Through `config/verify-current-password.ts`, unchanged: a raw GoTrue
 * password-grant fetch whose tokens are thrown away. Not
 * `signInWithPassword`, which would fire `onAuthStateChange` and re-trigger
 * the provider's global routing effect mid-form.
 *
 * That gives three outcomes rather than two, and §1.6's order is kept: the
 * check *threw* (rate-limited, or the check could not be made), the check
 * returned false (wrong password), or it passed and the update's own errors
 * take over. They are different sentences because they mean different things
 * — "we could not check" is not "you were wrong".
 */

const formSchema = withConfirm(
	z.object({
		currentPassword: z.string().min(1, "Please enter your current password."),
		password: passwordRules,
	}),
);

export default function ChangePassword() {
	const { updatePassword, session } = useAuth();
	const [updated, setUpdated] = React.useState(false);
	const [updateError, setUpdateError] = React.useState<string | null>(null);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: { currentPassword: "", password: "", confirmPassword: "" },
	});

	async function onSubmit(data: z.infer<typeof formSchema>) {
		setUpdateError(null);

		try {
			const email = session?.user.email;
			if (!email) {
				setUpdateError(CHANGE_PASSWORD_SESSION_EXPIRED);
				return;
			}

			let valid: boolean;
			try {
				valid = await verifyCurrentPassword(email, data.currentPassword);
			} catch (verifyError) {
				setUpdateError(changePasswordVerifyErrorMessage(verifyError));
				return;
			}
			if (!valid) {
				setUpdateError(CHANGE_PASSWORD_WRONG_CURRENT);
				return;
			}

			await updatePassword(data.password);
			form.reset();
			setUpdated(true);
		} catch (error) {
			console.error("Change password error:", error);
			setUpdateError(changePasswordErrorMessage(error));
		}
	}

	if (updated) {
		return (
			<AuthScreen
				title="Change Password"
				footer={
					<SubmitButton
						label="Back to Decisions"
						onPress={() => router.replace("/(protected)/(tabs)")}
					/>
				}
			>
				<StatusCard tone="success" title="Password updated">
					{"Use your new password the next time you sign in."}
				</StatusCard>
			</AuthScreen>
		);
	}

	return (
		<AuthScreen
			title="Change Password"
			intro="Enter a new password for your account."
			footer={
				<SubmitButton
					label="Update Password"
					submitting={form.formState.isSubmitting}
					onPress={form.handleSubmit(onSubmit)}
				/>
			}
		>
			{updateError ? (
				<StatusCard tone="error" title="Couldn't update password">
					{updateError}
				</StatusCard>
			) : null}

			<Form {...form}>
				<View className="gap-4">
					<FormField
						control={form.control}
						name="currentPassword"
						render={({ field }) => (
							<FormInput
								label="Current password"
								placeholder="Current password"
								autoCapitalize="none"
								autoCorrect={false}
								secureTextEntry
								{...field}
							/>
						)}
					/>
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
