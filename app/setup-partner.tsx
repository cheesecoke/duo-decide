import * as React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { AuthScreen } from "@/components/auth/auth-screen";
import { StatusCard } from "@/components/auth/status-card";
import { SubmitButton } from "@/components/auth/submit-button";
import { Body } from "@/components/ui/reusables/headline/headline";
import { Form, FormField, FormInput } from "@/components/ui/reusables/form/form";
import { Text } from "@/components/ui/reusables/text/text";
import { supabase } from "@/config/supabase";
import { emailRule } from "@/lib/auth/password-schema";
import { invitePartner } from "@/lib/database";

/**
 * Setup partner — FEATURE-INVENTORY §1.7, on the v2 system.
 *
 * The first screen a signed-in user with no couple row ever sees, so it is an
 * auth screen in everything but name: same `AuthScreen` shell, same
 * `StatusCard` pair, same one black `SubmitButton` at the bottom. It is the
 * one screen outside the six that shares the kit, and it shares it because it
 * is the last step of signing up, not the first step of the app.
 *
 * ## What the write does — unchanged
 *
 * `onSubmit` is the old sequence line for line: upsert `profiles` (so the
 * `couples` foreign key resolves) → find the user's couple or create one, in
 * both cases carrying the lower-cased `pending_partner_email` → write
 * `couple_id` back onto the profile → `invitePartner()`. Nothing about the
 * data path is a design decision, and a re-skin that quietly reordered it
 * would strand a user half-linked.
 *
 * ## What changed
 *
 * The three hand-rolled panels are gone. The yellow `InfoBox` (`#fef3c7` on a
 * `#fbbf24` border) and the green success card (`#f0fdf4` / `#86efac` /
 * `#166534`) were pinned to light-mode literals, so they did not follow the
 * old theme even before it was replaced; neither palette is in
 * tokens.md, and §3 says cards do not use borders. The info box is a plain
 * `surface-2` block, and the success card is `StatusCard tone="success"` —
 * `Card state="together"`, which is what "both of you" is spelled as here.
 *
 * The error row gains a title. It used to be an `IconClose` glyph beside the
 * raw Supabase message, which reads as a dismiss control rather than a fault,
 * and left the message with nothing to say what failed. `StatusCard` gives it
 * "Something went wrong" and `role="alert"` (see status-card.tsx).
 *
 * ## The numbers are real
 *
 * tokens.md has no numbered-list component and the design-system rule is that
 * lists do not get counters — but these four steps are a *sequence*: you send
 * the link, they sign up, you get linked, you start. Stripping the numerals
 * would turn an order into a set. They are `role="list"` / `role="listitem"`
 * so the order is announced as well as drawn.
 */

const formSchema = z.object({
	partnerEmail: emailRule,
	displayName: z.string().min(1, "Please enter your name."),
});

/** §1.7, verbatim. */
const INFO_COPY =
	"Enter your name and your partner's email. They'll sign up separately, then we'll link you together.";

/** §1.7's four steps. `0` takes the partner's address, which is only known at render. */
function nextSteps(partnerEmail: string): string[] {
	return [
		`Send the app URL to ${partnerEmail}`,
		"Have them sign up with that email",
		"You'll be automatically linked as partners",
		"Start making decisions together!",
	];
}

export default function SetupPartner() {
	const [isLoading, setIsLoading] = React.useState(false);
	const [setupComplete, setSetupComplete] = React.useState(false);
	const [partnerEmail, setPartnerEmail] = React.useState("");
	const [error, setError] = React.useState<string | null>(null);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			partnerEmail: "",
			displayName: "",
		},
	});

	async function onSubmit(data: z.infer<typeof formSchema>) {
		setIsLoading(true);
		setError(null);

		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				throw new Error("Not authenticated");
			}

			// Ensure profile exists first (required for foreign key constraint)
			const { error: profileCheckError } = await supabase.from("profiles").upsert(
				{
					id: user.id,
					email: user.email!,
					display_name: data.displayName,
				},
				{ onConflict: "id" },
			);

			if (profileCheckError) {
				throw profileCheckError;
			}

			// Check if couple already exists (query couples directly to avoid RLS issues)
			const { data: existingCouples, error: coupleCheckError } = await supabase
				.from("couples")
				.select("*")
				.or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
				.limit(1);

			let couple;

			if (coupleCheckError) {
				throw coupleCheckError;
			}

			if (existingCouples && existingCouples.length > 0) {
				// Update existing couple with new partner email
				const { data: updatedCouple, error: updateError } = await supabase
					.from("couples")
					.update({
						pending_partner_email: data.partnerEmail.toLowerCase(),
					})
					.eq("id", existingCouples[0].id)
					.select()
					.single();

				if (updateError) {
					throw updateError;
				}

				couple = updatedCouple;
			} else {
				// Create new couple with current user as user1 and pending partner email
				const { data: newCouple, error: coupleError } = await supabase
					.from("couples")
					.insert({
						user1_id: user.id,
						pending_partner_email: data.partnerEmail.toLowerCase(),
					})
					.select()
					.single();

				if (coupleError) {
					throw coupleError;
				}

				couple = newCouple;
			}

			// Update user's profile with couple_id (display_name already set above)
			const { error: profileError } = await supabase
				.from("profiles")
				.update({
					couple_id: couple.id,
				})
				.eq("id", user.id);

			if (profileError) {
				throw profileError;
			}

			// Send invitation email
			const inviteResult = await invitePartner(user.id, data.partnerEmail);

			if (inviteResult.error) {
				throw new Error(inviteResult.error);
			}

			// Show success message
			setPartnerEmail(data.partnerEmail);
			setSetupComplete(true);
		} catch (error) {
			console.error("Error setting up partner:", error);

			// Extract error message properly
			let errorMessage = "An unexpected error occurred. Please try again.";
			if (error instanceof Error) {
				errorMessage = error.message;
			} else if (error && typeof error === "object" && "message" in error) {
				errorMessage = String((error as any).message);
			} else if (typeof error === "string") {
				errorMessage = error;
			}

			setError(errorMessage);
		} finally {
			setIsLoading(false);
		}
	}

	if (setupComplete) {
		return (
			<AuthScreen
				title="Welcome to Duo!"
				footer={
					<SubmitButton label="Go to Dashboard" onPress={() => router.replace("/(protected)/(tabs)")} />
				}
			>
				<StatusCard tone="success" title="🎉 You're all set!">
					<Body className="text-ink-2">
						{"Your account is ready! Share the app link with "}
						<Text className="font-semibold">{partnerEmail}</Text>
						{" to get started."}
					</Body>

					<View className="gap-2" role="list">
						<Body className="font-semibold text-ink-2">Next steps:</Body>
						{nextSteps(partnerEmail).map((step, index) => (
							<View key={step} className="flex-row gap-2" role="listitem">
								{/* Fixed column so the four sentences share a left edge. */}
								<Body className="w-5 font-semibold text-ink-2">{`${index + 1}.`}</Body>
								<Body className="flex-1 text-ink-2">{step}</Body>
							</View>
						))}
					</View>
				</StatusCard>
			</AuthScreen>
		);
	}

	return (
		<AuthScreen
			title="Welcome to Duo!"
			footer={
				<SubmitButton label="Continue" submitting={isLoading} onPress={form.handleSubmit(onSubmit)} />
			}
		>
			<View className="rounded-card bg-surface-2 p-4">
				<Body className="text-ink-2">{INFO_COPY}</Body>
			</View>

			{error ? (
				<StatusCard tone="error" title="Something went wrong">
					{error}
				</StatusCard>
			) : null}

			<Form {...form}>
				<View className="gap-4">
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
				</View>
			</Form>
		</AuthScreen>
	);
}
