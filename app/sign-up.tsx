import * as React from "react";
import { Platform, View } from "react-native";
import { router } from "expo-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthScreen } from "@/components/auth/auth-screen";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { StatusCard } from "@/components/auth/status-card";
import { SubmitButton } from "@/components/auth/submit-button";
import { Form, FormField, FormInput } from "@/components/ui/reusables/form/form";
import { useAuth } from "@/context/supabase-provider";
import { signUpErrorMessage } from "@/lib/auth/error-messages";
import { emailRule, passwordRules, withConfirm } from "@/lib/auth/password-schema";

/**
 * Sign up — FEATURE-INVENTORY §1.3, on the v2 system.
 *
 * Two variants on whether the confirmation email went out. The form's rules
 * are `lib/auth/password-schema`'s — the same four character classes §1.3
 * enforced, now in one place with the cross-field match, so sign-up, reset
 * and change cannot drift apart again.
 *
 * Header chrome (modal presentation, back button, swipe-back) is
 * `app/_layout.tsx`'s and unchanged.
 */

const formSchema = withConfirm(
	z.object({
		email: emailRule,
		password: passwordRules,
	}),
);

export default function SignUp() {
	const { signUp } = useAuth();
	const [sentToEmail, setSentToEmail] = React.useState<string | null>(null);
	const [signupError, setSignupError] = React.useState<string | null>(null);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: { email: "", password: "", confirmPassword: "" },
	});

	async function onSubmit(data: z.infer<typeof formSchema>) {
		setSignupError(null);

		try {
			await signUp(data.email, data.password);
			setSentToEmail(data.email);
			form.reset();
		} catch (error) {
			console.error("Signup error:", error);
			setSignupError(signUpErrorMessage(error));
		}
	}

	if (sentToEmail) {
		return (
			<AuthScreen
				title="Sign Up"
				footer={<SubmitButton label="Go to Sign In" onPress={() => router.push("/sign-in")} />}
			>
				<StatusCard tone="success" title="Check your email!">
					{`We sent a confirmation link to ${sentToEmail}. Click the link in the email to activate your account.`}
					{"Didn't receive it? Check your spam folder or try signing up again."}
				</StatusCard>
			</AuthScreen>
		);
	}

	return (
		<AuthScreen
			title="Sign Up"
			footer={
				<>
					<SubmitButton
						label="Sign Up"
						submitting={form.formState.isSubmitting}
						onPress={form.handleSubmit(onSubmit)}
					/>
					{Platform.OS === "web" ? (
						<>
							<AuthDivider />
							<GoogleAuthButton />
						</>
					) : null}
				</>
			}
		>
			{signupError ? (
				<StatusCard tone="error" title="Sign up failed">
					{signupError}
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
					<FormField
						control={form.control}
						name="password"
						render={({ field }) => (
							<FormInput
								label="Password"
								placeholder="Password"
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
								label="Confirm Password"
								placeholder="Confirm password"
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
