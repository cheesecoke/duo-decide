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
import { TextLink } from "@/components/auth/text-link";
import { Form, FormField, FormInput } from "@/components/ui/reusables/form/form";
import { useAuth } from "@/context/supabase-provider";
import { signInErrorMessage } from "@/lib/auth/error-messages";
import { emailRule, signInPasswordRules } from "@/lib/auth/password-schema";

/**
 * Sign in — FEATURE-INVENTORY §1.2, on the v2 system.
 *
 * The auth call, the field props and the error strings are §1.2's; the rules
 * and the ladder moved to `lib/auth/` (table-tested) and the chrome to
 * `components/auth/`. What is left here is the screen: which blocks, in which
 * order, and what happens on submit.
 *
 * `form.reset()` on success is kept. Nothing navigates from here — the
 * `AuthProvider` routing effect decides between `/setup-partner` and the
 * protected tabs — so the form is briefly still on screen, and leaving a
 * password in it while the redirect resolves is the one thing worth clearing.
 *
 * The divider is guarded by the same `Platform.OS === "web"` check that
 * `GoogleAuthButton` guards itself with. That is not redundant: the button
 * knows it should not render, but only the screen knows the divider would
 * then be dividing the button stack from nothing.
 *
 * Header chrome (modal presentation, back button, swipe-back) is
 * `app/_layout.tsx`'s and unchanged.
 */

const formSchema = z.object({
	email: emailRule,
	password: signInPasswordRules,
});

export default function SignIn() {
	const { signIn } = useAuth();
	const [signinError, setSigninError] = React.useState<string | null>(null);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: { email: "", password: "" },
	});

	async function onSubmit(data: z.infer<typeof formSchema>) {
		setSigninError(null);

		try {
			await signIn(data.email, data.password);
			form.reset();
		} catch (error) {
			console.error("Sign in error:", error);
			setSigninError(signInErrorMessage(error));
		}
	}

	return (
		<AuthScreen
			title="Sign In"
			footer={
				<>
					<SubmitButton
						label="Sign In"
						submitting={form.formState.isSubmitting}
						onPress={form.handleSubmit(onSubmit)}
					/>
					{Platform.OS === "web" ? (
						<>
							<AuthDivider />
							<GoogleAuthButton />
						</>
					) : null}
					<TextLink label="Forgot password?" onPress={() => router.push("/forgot-password")} />
				</>
			}
		>
			{signinError ? (
				<StatusCard tone="error" title="Sign in failed">
					{signinError}
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
				</View>
			</Form>
		</AuthScreen>
	);
}
