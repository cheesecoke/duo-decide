import * as React from "react";
import { View } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { AuthScreen } from "@/components/auth/auth-screen";
import { StatusCard } from "@/components/auth/status-card";
import { SubmitButton } from "@/components/auth/submit-button";
import { Form, FormField, FormInput } from "@/components/ui/reusables/form/form";
import { verifyCurrentPassword } from "@/config/verify-current-password";
import {
	changePasswordErrorMessage,
	CHANGE_PASSWORD_SESSION_EXPIRED,
	changePasswordVerifyErrorMessage,
	CHANGE_PASSWORD_WRONG_CURRENT,
	setPasswordErrorMessage,
} from "@/lib/auth/error-messages";
import { hasEmailPasswordIdentity } from "@/lib/auth/password-identity";
import { passwordRules, withConfirm } from "@/lib/auth/password-schema";

/**
 * Change password — FEATURE-INVENTORY §1.6, on the v2 system.
 *
 * Reached from the settings sheet only.
 *
 * ## Two forms: change, or set
 *
 * Someone who signed up with Google on the web has no password, and the
 * iPhone app has no Google sign-in — so they need one to use it. Asking them
 * for a "current password" was a dead end. `hasEmailPasswordIdentity` reads
 * the session's providers: with an `email` identity the form asks for the
 * current password ("Change Password"); without one it is "Set a Password",
 * with only the new password and its confirmation, and goes straight to
 * `updateUser`. GoTrue already lets a signed-in session set its password
 * without the old one; the current-password check is this screen's own,
 * for accounts that have a password to check.
 *
 * If the project turns on "Secure password change", GoTrue answers an update
 * on a session older than a day with `reauthentication_needed`; both forms
 * say to sign out and back in (with Google, for the set form), which gives a
 * fresh session that does not need the nonce.
 *
 * Each form then swaps to its confirmation on `updated`.
 *
 * ## The current password is checked before anything is changed
 *
 * Through `config/verify-current-password.ts`, unchanged: a raw GoTrue
 * password-grant fetch whose tokens are thrown away. Not
 * `signInWithPassword`, which would fire `onAuthStateChange` and re-trigger
 * the provider's global routing effect mid-form.
 *
 * That gives three outcomes rather than two, and §1.6's order is kept: the
 * check *threw* (rate-limited, or the check could not be made), the check
 * returned false (wrong password), or it passed and the update's own errors
 * take over. They are different sentences because they mean different things
 * — "we could not check" is not "you were wrong".
 */

const changeSchema = withConfirm(
	z.object({
		currentPassword: z.string().min(1, "Please enter your current password."),
		password: passwordRules,
	}),
);

/** The set form has no current-password field; it stays in the shape, empty. */
const setSchema = withConfirm(
	z.object({
		currentPassword: z.string(),
		password: passwordRules,
	}),
);

type FormValues = z.infer<typeof changeSchema>;

/** The words each form uses. */
const COPY = {
	change: {
		title: "Change Password",
		intro: "Enter a new password for your account.",
		submit: "Update Password",
		errorTitle: "Couldn't update password",
		doneTitle: "Password updated",
		doneLine: "Use your new password the next time you sign in.",
	},
	set: {
		title: "Set a Password",
		intro: "You signed in with Google. Set a password to sign in on the Duo iPhone app.",
		submit: "Set Password",
		errorTitle: "Couldn't set password",
		doneTitle: "Password set",
		doneLine: "You can now sign in on the Duo iPhone app with your email and this password.",
	},
} as const;

type ChangePasswordScreenProps = {
	session: Session | null;
	updatePassword: (password: string) => Promise<void>;
	/** "Back to Decisions", after the password is changed or set. */
	onDone: () => void;
};

/**
 * The whole screen, with auth passed in, so Storybook can render each
 * variant without the Supabase client. `app/change-password.tsx` wires it to
 * `useAuth` and the router.
 */
function ChangePasswordScreen({ session, updatePassword, onDone }: ChangePasswordScreenProps) {
	// Derived on every render: on a web reload the session can arrive after
	// the first one, and the form has to follow it.
	const hasPassword = hasEmailPasswordIdentity(session?.user);
	const copy = hasPassword ? COPY.change : COPY.set;
	const [updated, setUpdated] = React.useState(false);
	const [updateError, setUpdateError] = React.useState<string | null>(null);

	const form = useForm<FormValues>({
		resolver: zodResolver(hasPassword ? changeSchema : setSchema),
		defaultValues: { currentPassword: "", password: "", confirmPassword: "" },
	});

	async function onSubmit(data: FormValues) {
		setUpdateError(null);

		if (!hasPassword) {
			try {
				await updatePassword(data.password);
				form.reset();
				setUpdated(true);
			} catch (error) {
				console.error("Set password error:", error);
				setUpdateError(setPasswordErrorMessage(error));
			}
			return;
		}

		try {
			const email = session?.user.email;
			if (!email) {
				setUpdateError(CHANGE_PASSWORD_SESSION_EXPIRED);
				return;
			}

			let valid: boolean;
			try {
				valid = await verifyCurrentPassword(email, data.currentPassword);
			} catch (verifyError) {
				setUpdateError(changePasswordVerifyErrorMessage(verifyError));
				return;
			}
			if (!valid) {
				setUpdateError(CHANGE_PASSWORD_WRONG_CURRENT);
				return;
			}

			await updatePassword(data.password);
			form.reset();
			setUpdated(true);
		} catch (error) {
			console.error("Change password error:", error);
			setUpdateError(changePasswordErrorMessage(error));
		}
	}

	if (updated) {
		return (
			<AuthScreen
				title={copy.title}
				footer={<SubmitButton label="Back to Decisions" onPress={onDone} />}
			>
				<StatusCard tone="success" title={copy.doneTitle}>
					{copy.doneLine}
				</StatusCard>
			</AuthScreen>
		);
	}

	return (
		<AuthScreen
			title={copy.title}
			intro={copy.intro}
			footer={
				<SubmitButton
					label={copy.submit}
					submitting={form.formState.isSubmitting}
					onPress={form.handleSubmit(onSubmit)}
				/>
			}
		>
			{updateError ? (
				<StatusCard tone="error" title={copy.errorTitle}>
					{updateError}
				</StatusCard>
			) : null}

			<Form {...form}>
				<View className="gap-4">
					{hasPassword ? (
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
					) : null}
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
				</View>
			</Form>
		</AuthScreen>
	);
}

export { ChangePasswordScreen };
export type { ChangePasswordScreenProps };
