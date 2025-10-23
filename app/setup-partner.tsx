import { useState } from "react";
import { ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/Button";
import { Form, FormField, FormInput } from "@/components/ui/Form";
import { H1, Muted } from "@/components/ui/typography";
import { styled } from "@/lib/styled";
import ContentLayout from "@/components/layout/ContentLayout";
import { Text } from "@/components/ui/Text";
import { supabase } from "@/config/supabase";

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

const InfoBox = styled.View<{ colorMode: "light" | "dark" }>`
	background-color: ${({ colorMode }) => (colorMode === "light" ? "#fef3c7" : "#713f12")};
	border: 1px solid ${({ colorMode }) => (colorMode === "light" ? "#fbbf24" : "#f59e0b")};
	border-radius: 8px;
	padding: 16px;
	gap: 8px;
`;

const SuccessContainer = styled.View<{ colorMode: "light" | "dark" }>`
	background-color: ${({ colorMode }) => (colorMode === "light" ? "#f0fdf4" : "#14532d")};
	border: 1px solid ${({ colorMode }) => (colorMode === "light" ? "#86efac" : "#22c55e")};
	border-radius: 8px;
	padding: 20px;
	gap: 12px;
`;

const SuccessTitle = styled(Text)`
	font-weight: 700;
	font-size: 20px;
	color: ${({ theme }) => (theme.colorMode === "light" ? "#166534" : "#86efac")};
`;

const SuccessText = styled(Text)`
	color: ${({ theme }) => (theme.colorMode === "light" ? "#15803d" : "#4ade80")};
	line-height: 22px;
`;

const StepContainer = styled.View`
	gap: 8px;
	margin-top: 8px;
`;

const StepItem = styled.View`
	flex-direction: row;
	align-items: flex-start;
	gap: 8px;
`;

const StepNumber = styled(Text)`
	font-weight: 600;
	color: ${({ theme }) => (theme.colorMode === "light" ? "#166534" : "#86efac")};
	min-width: 24px;
`;

const StepText = styled(Text)`
	flex: 1;
	color: ${({ theme }) => (theme.colorMode === "light" ? "#15803d" : "#4ade80")};
	line-height: 20px;
`;

const formSchema = z.object({
	partnerEmail: z.string().email("Please enter a valid email address."),
	displayName: z.string().min(1, "Please enter your name."),
});

export default function SetupPartner() {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);
	const [setupComplete, setSetupComplete] = useState(false);
	const [partnerEmail, setPartnerEmail] = useState("");

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			partnerEmail: "",
			displayName: "",
		},
	});

	async function onSubmit(data: z.infer<typeof formSchema>) {
		setIsLoading(true);
		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) throw new Error("Not authenticated");

			// Create the couple with current user as user1 and pending partner email
			const { data: couple, error: coupleError } = await supabase
				.from("couples")
				.insert({
					user1_id: user.id,
					pending_partner_email: data.partnerEmail.toLowerCase(),
				})
				.select()
				.single();

			if (coupleError) throw coupleError;

			// Update user's profile with display name and couple_id
			const { error: profileError } = await supabase.from("profiles").upsert({
				id: user.id,
				email: user.email!,
				display_name: data.displayName,
				couple_id: couple.id,
			});

			if (profileError) throw profileError;

			// Show success message
			setPartnerEmail(data.partnerEmail);
			setSetupComplete(true);
		} catch (error) {
			console.error("Error setting up partner:", error);
			// TODO: Show error state
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<ContentLayout>
			<ContentContainer>
				<H1>Welcome to Duo!</H1>

				{setupComplete ? (
					<>
						<SuccessContainer colorMode="light">
							<SuccessTitle>🎉 You&apos;re all set!</SuccessTitle>
							<SuccessText>
								Your account is ready! Share the app link with{" "}
								<Text style={{ fontWeight: "600" }}>{partnerEmail}</Text> to get started.
							</SuccessText>

							<StepContainer>
								<SuccessText style={{ fontWeight: "600", marginBottom: 4 }}>Next steps:</SuccessText>
								<StepItem>
									<StepNumber>1.</StepNumber>
									<StepText>Send the app URL to {partnerEmail}</StepText>
								</StepItem>
								<StepItem>
									<StepNumber>2.</StepNumber>
									<StepText>Have them sign up with that email</StepText>
								</StepItem>
								<StepItem>
									<StepNumber>3.</StepNumber>
									<StepText>You&apos;ll be automatically linked as partners</StepText>
								</StepItem>
								<StepItem>
									<StepNumber>4.</StepNumber>
									<StepText>Start making decisions together!</StepText>
								</StepItem>
							</StepContainer>
						</SuccessContainer>

						<ButtonContainer>
							<Button
								size="default"
								variant="default"
								onPress={() => router.replace("/(protected)/(tabs)")}
							>
								<Text>Go to Dashboard</Text>
							</Button>
						</ButtonContainer>
					</>
				) : (
					<>
						<InfoBox colorMode="light">
							<Muted>
								Enter your name and your partner&apos;s email. They&apos;ll sign up separately, then
								we&apos;ll link you together.
							</Muted>
						</InfoBox>

						<Form {...form}>
							<FormContainer>
								<FormField
									control={form.control}
									name="displayName"
									render={({ field }) => (
										<FormInput
											label="Your Name"
											placeholder="e.g., Chase Cole"
											autoCapitalize="words"
											autoComplete="name"
											autoCorrect={false}
											{...field}
										/>
									)}
								/>
								<FormField
									control={form.control}
									name="partnerEmail"
									render={({ field }) => (
										<FormInput
											label="Partner's Email"
											placeholder="partner@example.com"
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
								disabled={isLoading}
							>
								{isLoading ? <ActivityIndicator size="small" /> : <Text>Continue</Text>}
							</Button>
						</ButtonContainer>
					</>
				)}
			</ContentContainer>
		</ContentLayout>
	);
}
