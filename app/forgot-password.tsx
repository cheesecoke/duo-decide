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

const ButtonContainer = styled.View`
	margin-top: auto;
	padding-top: 16px;
	gap: 12px;
`;

const Intro = styled(Muted)`
	margin-bottom: 8px;
`;

const SuccessContainer = styled.View<{ colorMode: "light" | "dark" }>`
	background-color: ${({ colorMode }) => (colorMode === "light" ? "#f0fdf4" : "#14532d")};
	border: 1px solid ${({ colorMode }) => (colorMode === "light" ? "#86efac" : "#22c55e")};
	border-radius: 8px;
	padding: 16px;
	gap: 8px;
`;

const SuccessText = styled(Text)<{ colorMode: "light" | "dark" }>`
	font-weight: 600;
	color: ${({ colorMode }) => (colorMode === "light" ? "#166534" : "#86efac")};
`;

const SuccessMuted = styled(Muted)<{ colorMode: "light" | "dark" }>`
	color: ${({ colorMode }) => (colorMode === "light" ? "#15803d" : "#4ade80")};
`;

const ErrorContainer = styled.View<{ colorMode: "light" | "dark" }>`
	background-color: ${({ colorMode }) => (colorMode === "light" ? "#fef2f2" : "#7f1d1d")};
	border: 1px solid ${({ colorMode }) => (colorMode === "light" ? "#fca5a5" : "#dc2626")};
	border-radius: 8px;
	padding: 16px;
	gap: 8px;
	margin-bottom: 16px;
`;

const ErrorText = styled(Text)<{ colorMode: "light" | "dark" }>`
	font-weight: 600;
	color: ${({ colorMode }) => (colorMode === "light" ? "#991b1b" : "#fca5a5")};
`;

const ErrorMuted = styled(Muted)<{ colorMode: "light" | "dark" }>`
	color: ${({ colorMode }) => (colorMode === "light" ? "#b91c1c" : "#f87171")};
`;

const formSchema = z.object({
	email: z.string().email("Please enter a valid email address."),
});

export default function ForgotPassword() {
	const { resetPassword } = useAuth();
	const { colorMode } = useTheme();
	const router = useRouter();
	const [emailSent, setEmailSent] = useState(false);
	const [sentToEmail, setSentToEmail] = useState("");
	const [resetError, setResetError] = useState<string | null>(null);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
		},
	});

	async function onSubmit(data: z.infer<typeof formSchema>) {
		setResetError(null);

		try {
			await resetPassword(data.email);

			setSentToEmail(data.email);
			setEmailSent(true);
			form.reset();
		} catch (error: Error | any) {
			console.error("Password reset error:", error);

			let errorMessage = "Failed to send reset email. Please try again.";

			if (error.message) {
				if (error.message.includes("Invalid email")) {
					errorMessage = "Please enter a valid email address.";
				} else if (error.message.includes("network") || error.message.includes("fetch")) {
					errorMessage = "Network error. Please check your connection and try again.";
				} else {
					errorMessage = error.message;
				}
			}

			setResetError(errorMessage);
		}
	}

	return (
		<ContentLayout>
			<ContentContainer>
				<H1>Reset Password</H1>

				{emailSent ? (
					<>
						<SuccessContainer colorMode={colorMode}>
							<SuccessText colorMode={colorMode}>Check your email!</SuccessText>
							<SuccessMuted colorMode={colorMode}>
								We sent a password reset link to {sentToEmail}. Click the link in the email to choose a
								new password.
							</SuccessMuted>
							<SuccessMuted colorMode={colorMode}>
								Didn&apos;t receive it? Check your spam folder, or wait a minute and try again.
							</SuccessMuted>
						</SuccessContainer>
						<ButtonContainer>
							<Button size="default" variant="default" onPress={() => router.push("/sign-in")}>
								<Text>Back to Sign In</Text>
							</Button>
						</ButtonContainer>
					</>
				) : (
					<>
						<Intro>
							Enter the email address you signed up with and we&apos;ll send you a link to reset your
							password.
						</Intro>

						{resetError && (
							<ErrorContainer colorMode={colorMode}>
								<ErrorText colorMode={colorMode}>Couldn&apos;t send reset email</ErrorText>
								<ErrorMuted colorMode={colorMode}>{resetError}</ErrorMuted>
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
							</FormContainer>
						</Form>
						<ButtonContainer>
							<Button
								size="default"
								variant="default"
								onPress={form.handleSubmit(onSubmit)}
								disabled={form.formState.isSubmitting}
							>
								{form.formState.isSubmitting ? (
									<ActivityIndicator size="small" />
								) : (
									"Send Reset Link"
								)}
							</Button>
						</ButtonContainer>
					</>
				)}
			</ContentContainer>
		</ContentLayout>
	);
}
