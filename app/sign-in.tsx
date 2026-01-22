import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ActivityIndicator } from "react-native";
import * as z from "zod";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Form, FormField, FormInput } from "@/components/ui/Form";
import { H1, Muted } from "@/components/ui/typography";
import { useAuth } from "@/context/supabase-provider";
import { styled } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import ContentLayout from "@/components/layout/ContentLayout";
import { Text } from "@/components/ui/Text";

const ContentContainer = styled.View`
	flex: 1;
	gap: 16px;
`;

const FormContainer = styled.View`
	gap: 16px;
`;

const ButtonContainer = styled.View`
	margin-top: auto;
	padding-top: 16px;
`;

const ErrorContainer = styled.View<{ colorMode: "light" | "dark" }>`
	background-color: ${({ colorMode }) => (colorMode === "light" ? "#fef2f2" : "#7f1d1d")};
	border: 1px solid ${({ colorMode }) => (colorMode === "light" ? "#fca5a5" : "#dc2626")};
	border-radius: 8px;
	padding: 16px;
	gap: 8px;
	margin-bottom: 16px;
`;

const ErrorText = styled(Text)`
	font-weight: 600;
	color: ${({ theme }) => (theme.colorMode === "light" ? "#991b1b" : "#fca5a5")};
`;

const ErrorMuted = styled(Muted)`
	color: ${({ theme }) => (theme.colorMode === "light" ? "#b91c1c" : "#f87171")};
`;

const formSchema = z.object({
	email: z.string().email("Please enter a valid email address."),
	password: z
		.string()
		.min(8, "Please enter at least 8 characters.")
		.max(64, "Please enter fewer than 64 characters."),
});

export default function SignIn() {
	const { signIn } = useAuth();
	const { colorMode } = useTheme();
	const [signinError, setSigninError] = useState<string | null>(null);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	});

	async function onSubmit(data: z.infer<typeof formSchema>) {
		// Clear any previous errors
		setSigninError(null);

		try {
			await signIn(data.email, data.password);

			form.reset();
		} catch (error: Error | any) {
			console.error("Sign in error:", error);

			// Extract user-friendly error message
			let errorMessage = "Failed to sign in. Please try again.";

			if (error.message) {
				// Common Supabase errors
				if (
					error.message.includes("Invalid login credentials") ||
					error.message.includes("invalid_credentials")
				) {
					errorMessage = "Incorrect email or password. Please try again.";
				} else if (error.message.includes("Email not confirmed")) {
					errorMessage =
						"Please confirm your email address before signing in. Check your inbox for the confirmation link.";
				} else if (error.message.includes("Invalid email")) {
					errorMessage = "Please enter a valid email address.";
				} else if (error.message.includes("network") || error.message.includes("fetch")) {
					errorMessage = "Network error. Please check your connection and try again.";
				} else {
					// Show the actual error if it's user-friendly
					errorMessage = error.message;
				}
			}

			setSigninError(errorMessage);
		}
	}

	return (
		<ContentLayout>
			<ContentContainer>
				<H1>Sign In</H1>

				{signinError && (
					<ErrorContainer colorMode={colorMode}>
						<ErrorText>Sign in failed</ErrorText>
						<ErrorMuted>{signinError}</ErrorMuted>
					</ErrorContainer>
				)}

				<Form {...form}>
					<FormContainer>
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
					</FormContainer>
				</Form>
				<ButtonContainer>
					<Button
						size="default"
						variant="default"
						onPress={form.handleSubmit(onSubmit)}
						disabled={form.formState.isSubmitting}
					>
						{form.formState.isSubmitting ? <ActivityIndicator size="small" /> : "Sign In"}
					</Button>
				</ButtonContainer>
			</ContentContainer>
		</ContentLayout>
	);
}
