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
import { verifyCurrentPassword } from "@/config/verify-current-password";
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

const formSchema = z
	.object({
		currentPassword: z.string().min(1, "Please enter your current password."),
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

export default function ChangePassword() {
	const { updatePassword, session } = useAuth();
	const { colorMode } = useTheme();
	const router = useRouter();
	const [updated, setUpdated] = useState(false);
	const [updateError, setUpdateError] = useState<string | null>(null);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			currentPassword: "",
			password: "",
			confirmPassword: "",
		},
	});

	async function onSubmit(data: z.infer<typeof formSchema>) {
		setUpdateError(null);

		try {
			const email = session?.user.email;
			if (!email) {
				setUpdateError("Your session has expired. Please sign in again.");
				return;
			}

			let valid: boolean;
			try {
				valid = await verifyCurrentPassword(email, data.currentPassword);
			} catch (verifyErr: any) {
				const msg = String(verifyErr?.message ?? "");
				setUpdateError(
					msg.includes("429")
						? "Too many attempts. Please wait a minute and try again."
						: "Couldn't verify your current password. Please try again.",
				);
				return;
			}
			if (!valid) {
				setUpdateError("Your current password is incorrect.");
				return;
			}

			await updatePassword(data.password);
			form.reset();
			setUpdated(true);
		} catch (error: Error | any) {
			console.error("Change password error:", error);

			let errorMessage = "Failed to update password. Please try again.";

			if (error.message) {
				if (error.message.includes("reauthentication") || error.message.includes("Reauthentication")) {
					errorMessage = "For security, please sign out and sign back in before changing your password.";
				} else if (error.message.includes("session") || error.message.includes("Auth")) {
					errorMessage = "Your session has expired. Please sign in again.";
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
				<H1>Change Password</H1>

				{updated ? (
					<>
						<SuccessContainer colorMode={colorMode}>
							<SuccessText colorMode={colorMode}>Password updated</SuccessText>
							<SuccessMuted colorMode={colorMode}>
								Use your new password the next time you sign in.
							</SuccessMuted>
						</SuccessContainer>
						<ButtonContainer>
							<Button
								size="default"
								variant="default"
								onPress={() => router.replace("/(protected)/(tabs)")}
							>
								<Text>Back to Decisions</Text>
							</Button>
						</ButtonContainer>
					</>
				) : (
					<>
						<Intro>Enter a new password for your account.</Intro>

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
							</FormContainer>
						</Form>
						<ButtonContainer>
							<Button
								size="default"
								variant="default"
								onPress={form.handleSubmit(onSubmit)}
								disabled={form.formState.isSubmitting}
							>
								{form.formState.isSubmitting ? <ActivityIndicator size="small" /> : "Update Password"}
							</Button>
						</ButtonContainer>
					</>
				)}
			</ContentContainer>
		</ContentLayout>
	);
}
