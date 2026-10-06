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
import { useAuth } from "@/context/supabase-provider";
import { forgotPasswordErrorMessage } from "@/lib/auth/error-messages";
import { emailRule } from "@/lib/auth/password-schema";

/**
 * Request a password reset — FEATURE-INVENTORY §1.4, on the v2 system.
 *
 * Two variants on `emailSent`, as before. The title is "Reset Password",
 * which is what §1.4's screen says even though the route is
 * `forgot-password` — the route name is the developer's word for it and the
 * headline is the user's.
 *
 * The success variant deliberately does not say whether the address exists.
 * `resetPassword` resolves either way (that is Supabase's behaviour, not a
 * choice made here), and the copy is written so the card is true in both
 * cases: it says what was sent, not that an account was found.
 */

const formSchema = z.object({ email: emailRule });

export default function ForgotPassword() {
	const { resetPassword } = useAuth();
	const [sentToEmail, setSentToEmail] = React.useState<string | null>(null);
	const [resetError, setResetError] = React.useState<string | null>(null);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: { email: "" },
	});

	async function onSubmit(data: z.infer<typeof formSchema>) {
		setResetError(null);

		try {
			await resetPassword(data.email);
			setSentToEmail(data.email);
			form.reset();
		} catch (error) {
			console.error("Password reset error:", error);
			setResetError(forgotPasswordErrorMessage(error));
		}
	}

	if (sentToEmail) {
		return (
			<AuthScreen
				title="Reset Password"
				footer={<SubmitButton label="Back to Sign In" onPress={() => router.push("/sign-in")} />}
			>
				<StatusCard tone="success" title="Check your email!">
					{`We sent a password reset link to ${sentToEmail}. Click the link in the email to choose a new password.`}
					{"Didn't receive it? Check your spam folder, or wait a minute and try again."}
				</StatusCard>
			</AuthScreen>
		);
	}

	return (
		<AuthScreen
			title="Reset Password"
			intro="Enter the email address you signed up with and we'll send you a link to reset your password."
			footer={
				<SubmitButton
					label="Send Reset Link"
					submitting={form.formState.isSubmitting}
					onPress={form.handleSubmit(onSubmit)}
				/>
			}
		>
			{resetError ? (
				<StatusCard tone="error" title="Couldn't send reset email">
					{resetError}
				</StatusCard>
			) : null}

			<Form {...form}>
				<View className="gap-4">
					<FormField
						control={form.control}
						name="email"
						render={({ field }) => (
							<FormInput
								label="Email"
								placeholder="Email"
								autoCapitalize="none"
								autoComplete="email"
								autoCorrect={false}
								keyboardType="email-address"
								{...field}
							/>
						)}
					/>
				</View>
			</Form>
		</AuthScreen>
	);
}
