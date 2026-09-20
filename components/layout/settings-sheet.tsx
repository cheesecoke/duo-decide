import * as React from "react";
import { Pressable, View } from "react-native";

import { Button } from "@/components/ui/reusables/button/button";
import { FieldLabel, Input } from "@/components/ui/reusables/field/field";
import { Caption, Eyebrow } from "@/components/ui/reusables/headline/headline";
import { HuePicker } from "@/components/ui/reusables/hue-picker/hue-picker";
import { Text } from "@/components/ui/reusables/text/text";
import { cn } from "@/lib/utils";
import type { HuePair } from "@/theme/pair-choice";
import type { UserContext } from "@/types/database";

/**
 * SettingsSheet — the body of the "Settings" sheet
 * (FEATURE-INVENTORY §0.2; the mock's `settingsSheet()`,
 * design-refs/mocks/decision-queue-round-3.html:860).
 *
 * It is **pure**. `Header` owns every piece of state the sheet shows — the
 * typed email, the in-flight flag, the error — and re-renders this into the
 * drawer through `updateContent` on each change, which is what keeps the
 * drawer a content slot rather than a screen of its own (§0.2). Splitting it
 * out this way is also what gives the three partner variants stories and
 * tests without a Supabase client anywhere near them.
 *
 * The partner block is the mock's `.listpick`: `surface-2` slabs at
 * `radius.field`, a phrase on the left and its status on the right. Exactly
 * three variants, the same three the app has today — linked, invite pending,
 * no partner.
 *
 * Colours is the one section that is not in §0.2, because it is not in the
 * app yet (tokens.md §1: "user-selectable"). It sits between the partner
 * block and the account actions for the same reason it is in this sheet at
 * all: it is about the two of you, not about your login. It stays pure like
 * everything else here — `Header` reads the pair off `usePersonPair()` and
 * pushes the result back through the same `updateContent`, so a pick
 * re-renders the open sheet in the colours it just chose.
 */

/**
 * §0.2: the email is checked here before it is sent. Same expression the app
 * has always used; it lives beside the field it guards so the sheet's tests
 * and the header's call site cannot drift apart.
 */
const PARTNER_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** `null` when the address is sendable, otherwise the message to show. */
function validatePartnerEmail(email: string): string | null {
	return PARTNER_EMAIL_PATTERN.test(email) ? null : "Please enter a valid email address";
}

const ROW_CLASS =
	"flex-row items-center justify-between gap-2 rounded-field bg-surface-2 px-3.5 py-3";
const ROW_TEXT_CLASS = "text-[15px] font-medium leading-[20px] text-ink";

/** A read-only `.listpick` slab: a phrase, and its status on the right. */
function StatusRow({ label, status }: { label: string; status?: string }) {
	return (
		<View className={ROW_CLASS}>
			<Text className={cn(ROW_TEXT_CLASS, "shrink")}>{label}</Text>
			{status ? (
				<Text className={cn(ROW_TEXT_CLASS, "shrink text-right text-ink-2")}>{status}</Text>
			) : null}
		</View>
	);
}

/** The same slab, as a button — the two Account rows. */
function ActionRow({ label, onPress }: { label: string; onPress: () => void }) {
	return (
		<Pressable role="button" accessibilityLabel={label} onPress={onPress} className={ROW_CLASS}>
			<Text className={ROW_TEXT_CLASS}>{label}</Text>
		</Pressable>
	);
}

/** Inline error copy — the one place `destructive` appears in the sheet. */
function InlineError({ message }: { message: string }) {
	return <Caption className="text-destructive">{message}</Caption>;
}

type SettingsSheetProps = {
	/** `null` while the context is still loading; the partner block waits. */
	userContext: UserContext | null;
	/** Variant C's field, owned by the header. */
	partnerEmail: string;
	onPartnerEmailChange: (email: string) => void;
	/** True while an invite / resend / cancel is in flight. */
	inviting: boolean;
	/** Validation or server error, shown under whichever variant is up. */
	error: string | null;
	/** The active person pair, straight off `usePersonPair()` in the header. */
	pair: HuePair;
	onPairChange: (next: HuePair) => void;
	onInvite: () => void;
	onResendInvitation: () => void;
	onCancelInvitation: () => void;
	onChangePassword: () => void;
	onSignOut: () => void;
	onClose: () => void;
};

function SettingsSheet({
	userContext,
	partnerEmail,
	onPartnerEmailChange,
	inviting,
	error,
	pair,
	onPairChange,
	onInvite,
	onResendInvitation,
	onCancelInvitation,
	onChangePassword,
	onSignOut,
	onClose,
}: SettingsSheetProps) {
	const linked = Boolean(userContext?.partnerId && userContext?.partnerName);
	const pending = !linked && Boolean(userContext?.pendingPartnerEmail);
	const inviteDisabled = inviting || !partnerEmail.trim();

	return (
		<View className="gap-4 pb-1">
			{userContext ? (
				<View className="gap-1.5">
					<FieldLabel>Partner status</FieldLabel>

					<View className="gap-1.5">
						<StatusRow label="Your name" status={userContext.userName} />

						{linked ? (
							<StatusRow label={`Partner: ${userContext.partnerName}`} status="✓ Partner linked" />
						) : pending ? (
							<StatusRow
								label={`Invited: ${userContext.pendingPartnerEmail}`}
								status="⏳ Waiting for partner to sign up"
							/>
						) : (
							<StatusRow label="⚠️ No partner linked" />
						)}
					</View>

					{pending ? (
						<View className="gap-2">
							{error ? <InlineError message={error} /> : null}
							{/* Both stop while a request is in flight (§0.2), so a
							    double tap cannot cancel and resend at once. */}
							<View className="flex-row gap-2.5">
								<Button
									variant="secondary"
									size="default"
									className="h-12 flex-1 rounded-button"
									accessibilityLabel="Cancel"
									accessibilityState={{ disabled: inviting }}
									disabled={inviting}
									onPress={onCancelInvitation}
								>
									<Text className="text-[16px] font-semibold leading-[22px] text-ink-2">Cancel</Text>
								</Button>
								<Button
									size="default"
									className="h-12 flex-1 rounded-button"
									accessibilityLabel={inviting ? "Sending…" : "Resend"}
									accessibilityState={{ disabled: inviting }}
									disabled={inviting}
									onPress={onResendInvitation}
								>
									<Text className="text-[16px] font-semibold leading-[22px] text-cta-fg">
										{inviting ? "Sending…" : "Resend"}
									</Text>
								</Button>
							</View>
						</View>
					) : linked ? null : (
						<View className="gap-2">
							<Input
								nativeID="partner-email-input"
								accessibilityLabel="Partner's email"
								placeholder="Enter partner's email"
								value={partnerEmail}
								onChangeText={onPartnerEmailChange}
								keyboardType="email-address"
								autoCapitalize="none"
								autoComplete="email"
								autoCorrect={false}
							/>
							{error ? <InlineError message={error} /> : null}
							<Button
								size="default"
								className="h-12 w-full rounded-button"
								accessibilityLabel={inviting ? "Sending…" : "Invite Partner"}
								accessibilityState={{ disabled: inviteDisabled }}
								disabled={inviteDisabled}
								onPress={onInvite}
							>
								<Text className="text-[16px] font-semibold leading-[22px] text-cta-fg">
									{inviting ? "Sending…" : "Invite Partner"}
								</Text>
							</Button>
						</View>
					)}
				</View>
			) : null}

			<View className="gap-2">
				<Eyebrow>Colours</Eyebrow>
				<HuePicker
					value={pair}
					onChange={onPairChange}
					youName={userContext?.userName ?? "You"}
					partnerName={userContext?.partnerName ?? null}
				/>
			</View>

			<View className="gap-1.5">
				<FieldLabel>Account</FieldLabel>
				<View className="gap-1.5">
					<ActionRow label="Change password" onPress={onChangePassword} />
					<ActionRow label="Sign out" onPress={onSignOut} />
				</View>
			</View>

			{/* `.sheet-ft` — the hairline, then the one secondary button. The
			    drawer now has a `footer` slot; moving this into it is a
			    follow-up, so that every sheet moves at once. */}
			<View className="mt-1 flex-row border-t border-line pt-3.5">
				<Button
					variant="secondary"
					size="default"
					className="h-[50px] flex-1 rounded-button"
					accessibilityLabel="Close"
					onPress={onClose}
				>
					<Text className="text-[16px] font-semibold leading-[22px] text-ink-2">Close</Text>
				</Button>
			</View>
		</View>
	);
}

export { PARTNER_EMAIL_PATTERN, SettingsSheet, validatePartnerEmail };
export type { SettingsSheetProps };
