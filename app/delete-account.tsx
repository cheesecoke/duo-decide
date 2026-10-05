import * as React from "react";
import { View } from "react-native";
import { router } from "expo-router";

import { AuthScreen } from "@/components/auth/auth-screen";
import { StatusCard } from "@/components/auth/status-card";
import { SubmitButton } from "@/components/auth/submit-button";
import { FieldLabel, Input } from "@/components/ui/reusables/field/field";
import { Body } from "@/components/ui/reusables/headline/headline";
import { useAuth } from "@/context/supabase-provider";
import { type Consequences, consequencesFor } from "@/lib/account-deletion";
import { getUserContext } from "@/lib/database";

/**
 * Delete account — App Store guideline 5.1.1(v): an app with sign-up must
 * let people delete their account in the app.
 *
 * The rule lives in `delete_my_account()` (migration 023) and the privacy
 * policy (`lib/legal.ts`) describes it; this screen says it in the user's
 * terms before they commit, and the copy depends on whether a partner is
 * linked, because that is what decides whether shared history survives.
 *
 * Typing DELETE is the confirmation: it can't be undone, and a single tap on
 * a red button in a settings sheet is too easy to hit by accident.
 */

const CONFIRM_WORD = "DELETE";

export default function DeleteAccount() {
	const { deleteAccount } = useAuth();
	const [consequences, setConsequences] = React.useState<Consequences | null>(null);
	const [confirmText, setConfirmText] = React.useState("");
	const [deleting, setDeleting] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	React.useEffect(() => {
		let live = true;
		getUserContext()
			.then((ctx) => {
				if (!live) return;
				setConsequences({
					linked: Boolean(ctx?.partnerId),
					partnerName: ctx?.partnerName ?? null,
				});
			})
			.catch(() => live && setConsequences({ linked: false, partnerName: null }));
		return () => {
			live = false;
		};
	}, []);

	const confirmed = confirmText.trim().toUpperCase() === CONFIRM_WORD;

	async function onDelete() {
		setError(null);
		setDeleting(true);
		try {
			await deleteAccount();
			router.replace("/welcome");
		} catch (e) {
			console.error("Delete account error:", e);
			setError("Your account wasn't deleted. Check your connection and try again.");
			setDeleting(false);
		}
	}

	return (
		<AuthScreen
			title="Delete Account"
			intro="This permanently deletes your Duo Decide account. It can't be undone."
			footer={
				<>
					<SubmitButton
						destructive
						label="Delete my account"
						submitting={deleting}
						disabled={!confirmed || !consequences}
						onPress={onDelete}
					/>
					<SubmitButton label="Cancel" disabled={deleting} onPress={() => router.back()} />
				</>
			}
		>
			{error ? (
				<StatusCard tone="error" title="Couldn't delete account">
					{error}
				</StatusCard>
			) : null}

			{consequences ? (
				<View className="gap-2" testID="delete-consequences">
					{consequencesFor(consequences).map((line) => (
						<View key={line} className="flex-row gap-2">
							<Body className="text-ink-2">•</Body>
							<Body className="flex-1 text-ink-2">{line}</Body>
						</View>
					))}
				</View>
			) : null}

			<View className="gap-1.5">
				<FieldLabel nativeID="delete-confirm-label">{`Type ${CONFIRM_WORD} to confirm`}</FieldLabel>
				<Input
					accessibilityLabel={`Type ${CONFIRM_WORD} to confirm`}
					accessibilityLabelledBy="delete-confirm-label"
					value={confirmText}
					onChangeText={setConfirmText}
					autoCapitalize="characters"
					autoCorrect={false}
					placeholder={CONFIRM_WORD}
				/>
			</View>
		</AuthScreen>
	);
}
