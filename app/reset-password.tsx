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

const Intro = styled(Muted)`
	margin-bottom: 8px;
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

const formSchema = z
	.object({
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

export default function ResetPassword() {
	const { updatePassword, session } = useAuth();
	const { colorMode } = useTheme();
	const [updateError, setUpdateError] = useState<string | null>(null);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			password: "",
			confirmPassword: "",
		},
	});

	async function onSubmit(data: z.infer<typeof formSchema>) {
		setUpdateError(null);

		try {
			await updatePassword(data.password);
			form.reset();
			// AuthProvider's checkCoupleAndRoute effect handles redirect once
			// isPasswordRecovery flips back to false.
		} catch (error: Error | any) {
			console.error("Update password error:", error);

			let errorMessage = "Failed to update password. Please try again.";

			if (error.message) {
				if (error.message.includes("session") || error.message.includes("Auth")) {
					errorMessage =
						"Your reset link has expired or is invalid. Please request a new password reset email.";
				} else if (error.message.includes("password")) {
					errorMessage = "Password does not meet requirements. Please try again.";
				} else if (error.message.includes("network") || error.message.includes("fetch")) {
					errorMessage = "Network error. Please check your connection and try again.";
				} else {
					errorMessage = error.message;
				}
			}

			setUpdateError(errorMessage);
		}
	}

	return (
		<ContentLayout>
			<ContentContainer>
				<H1>Choose New Password</H1>
				<Intro>Enter a new password for your account.</Intro>

				{!session && (
					<ErrorContainer colorMode={colorMode}>
						<ErrorText colorMode={colorMode}>No active reset session</ErrorText>
						<ErrorMuted colorMode={colorMode}>
							Open this page from the link in your password reset email, or request a new one.
						</ErrorMuted>
					</ErrorContainer>
				)}

				{updateError && (
					<ErrorContainer colorMode={colorMode}>
						<ErrorText colorMode={colorMode}>Couldn&apos;t update password</ErrorText>
						<ErrorMuted colorMode={colorMode}>{updateError}</ErrorMuted>
					</ErrorContainer>
				)}

				<Form {...form}>
					<FormContainer>
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
					</FormContainer>
				</Form>
				<ButtonContainer>
					<Button
						size="default"
						variant="default"
						onPress={form.handleSubmit(onSubmit)}
						disabled={form.formState.isSubmitting || !session}
					>
						{form.formState.isSubmitting ? <ActivityIndicator size="small" /> : "Update Password"}
					</Button>
				</ButtonContainer>
			</ContentContainer>
		</ContentLayout>
	);
}
