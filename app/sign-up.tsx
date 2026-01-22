import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ActivityIndicator } from "react-native";
import * as z from "zod";
import { useState } from "react";
import { useRouter } from "expo-router";

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

const StyledH1 = styled(H1)`
	align-self: flex-start;
`;

const ButtonContainer = styled.View`
	margin-top: auto;
	padding-top: 16px;
`;

const SuccessContainer = styled.View<{ colorMode: "light" | "dark" }>`
	background-color: ${({ colorMode }) => (colorMode === "light" ? "#f0fdf4" : "#14532d")};
	border: 1px solid ${({ colorMode }) => (colorMode === "light" ? "#86efac" : "#22c55e")};
	border-radius: 8px;
	padding: 16px;
	gap: 8px;
`;

const SuccessText = styled(Text)`
	font-weight: 600;
	color: ${({ theme }) => (theme.colorMode === "light" ? "#166534" : "#86efac")};
`;

const SuccessMuted = styled(Muted)`
	color: ${({ theme }) => (theme.colorMode === "light" ? "#15803d" : "#4ade80")};
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

const formSchema = z
	.object({
		email: z.string().email("Please enter a valid email address."),
		password: z
			.string()
			.min(8, "Please enter at least 8 characters.")
			.max(64, "Please enter fewer than 64 characters.")
			.regex(/^(?=.*[a-z])/, "Your password must have at least one lowercase letter.")
			.regex(/^(?=.*[A-Z])/, "Your password must have at least one uppercase letter.")
			.regex(/^(?=.*[0-9])/, "Your password must have at least one number.")
			.regex(/^(?=.*[!@#$%^&*])/, "Your password must have at least one special character."),
		confirmPassword: z.string().min(8, "Please enter at least 8 characters."),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Your passwords do not match.",
		path: ["confirmPassword"],
	});

export default function SignUp() {
	const { signUp } = useAuth();
	const { colorMode } = useTheme();
	const router = useRouter();
	const [emailSent, setEmailSent] = useState(false);
	const [userEmail, setUserEmail] = useState("");
	const [signupError, setSignupError] = useState<string | null>(null);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
			password: "",
			confirmPassword: "",
		},
	});

	async function onSubmit(data: z.infer<typeof formSchema>) {
		// Clear any previous errors
		setSignupError(null);

		try {
			await signUp(data.email, data.password);

			// If we get here without error, show success message
			setUserEmail(data.email);
			setEmailSent(true);
			form.reset();
		} catch (error: Error | any) {
			console.error("Signup error:", error);

			// Extract user-friendly error message
			let errorMessage = "Failed to create account. Please try again.";

			if (error.message) {
				// Common Supabase errors
				if (error.message.includes("already registered") || error.message.includes("already exists")) {
					errorMessage = "This email is already registered. Try signing in instead.";
				} else if (error.message.includes("Invalid email")) {
					errorMessage = "Please enter a valid email address.";
				} else if (error.message.includes("password")) {
					errorMessage = "Password does not meet requirements. Please try again.";
				} else if (error.message.includes("network") || error.message.includes("fetch")) {
					errorMessage = "Network error. Please check your connection and try again.";
				} else {
					// Show the actual error if it's user-friendly
					errorMessage = error.message;
				}
			}

			setSignupError(errorMessage);
		}
	}

	return (
		<ContentLayout>
			<ContentContainer>
				<StyledH1>Sign Up</StyledH1>

				{emailSent ? (
					<>
						<SuccessContainer colorMode={colorMode}>
							<SuccessText>Check your email!</SuccessText>
							<SuccessMuted>
								We sent a confirmation link to {userEmail}. Click the link in the email to activate your
								account.
							</SuccessMuted>
							<SuccessMuted>
								Didn&apos;t receive it? Check your spam folder or try signing up again.
							</SuccessMuted>
						</SuccessContainer>
						<ButtonContainer>
							<Button size="default" variant="default" onPress={() => router.push("/sign-in")}>
								<Text>Go to Sign In</Text>
							</Button>
						</ButtonContainer>
					</>
				) : (
					<>
						{signupError && (
							<ErrorContainer colorMode={colorMode}>
								<ErrorText>Sign up failed</ErrorText>
								<ErrorMuted>{signupError}</ErrorMuted>
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
							</FormContainer>
						</Form>
						<ButtonContainer>
							<Button
								size="default"
								variant="default"
								onPress={form.handleSubmit(onSubmit)}
								disabled={form.formState.isSubmitting}
							>
								{form.formState.isSubmitting ? <ActivityIndicator size="small" /> : "Sign Up"}
							</Button>
						</ButtonContainer>
					</>
				)}
			</ContentContainer>
		</ContentLayout>
	);
}
