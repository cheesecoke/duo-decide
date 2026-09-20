import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "expo-router";

import { AppBar, BackGlyph, MenuGlyph } from "@/components/layout/app-bar";
import { SettingsSheet, validatePartnerEmail } from "@/components/layout/settings-sheet";
import { CircleButton } from "@/components/ui/reusables/circle-button/circle-button";
import { useAuth } from "@/context/supabase-provider";
import { useDrawer } from "@/context/drawer-provider";
import { cancelPartnerInvitation, getUserContext, invitePartner } from "@/lib/database";
import { usePersonPair } from "@/theme/PersonPairProvider";
import { DEFAULT_PAIR, type HuePair, isHuePresetId } from "@/theme/pair-choice";
import type { UserContext } from "@/types/database";

/**
 * The global header (FEATURE-INVENTORY §0.2).
 *
 * Two jobs, and only two: choose the right slot from the route, and own the
 * settings sheet's state. The bar itself is `AppBar` and the sheet's body is
 * `SettingsSheet` — both pure, both with stories. What is left here is the
 * wiring neither of them should know about: expo-router, the drawer, auth and
 * the partner-invite calls.
 *
 * The drawer stays a content slot: `showDrawer` seeds it and the effect below
 * pushes a freshly rendered sheet through `updateContent` on every state
 * change, exactly as it did before. The person pair rides that same channel:
 * it is not the header's own state — it lives in the root provider — but it
 * is state the sheet renders from, so a pick re-renders the open sheet in the
 * colours it just chose, and the header itself recolours with everything
 * else.
 */

const Header = ({
	showBackButton = false,
	navButton,
	userContext: userContextProp,
	onRefreshUserContext,
}: {
	showBackButton?: boolean;
	navButton?: React.ReactNode;
	userContext?: UserContext | null;
	onRefreshUserContext?: () => Promise<void>;
}) => {
	const router = useRouter();
	const pathname = usePathname();
	const {
		showDrawer,
		hideDrawer,
		updateContent,
		isVisible: isDrawerVisible,
		drawerType,
	} = useDrawer();
	const { signOut } = useAuth();
	const { a, b, setPair } = usePersonPair();
	const [userContext, setUserContext] = useState<UserContext | null>(userContextProp || null);
	const [partnerEmail, setPartnerEmail] = useState("");
	const [inviting, setInviting] = useState(false);
	const [inviteError, setInviteError] = useState<string | null>(null);

	/**
	 * The provider's ids are deliberately wider than the five presets, so they
	 * are narrowed once here rather than in the picker: `HuePicker` works in
	 * known ids only, and a row that somehow held an unknown one should show
	 * the default rather than no selection at all.
	 */
	const pair = useMemo<HuePair>(
		() => ({
			a: isHuePresetId(a) ? a : DEFAULT_PAIR.a,
			b: isHuePresetId(b) ? b : DEFAULT_PAIR.b,
		}),
		[a, b],
	);

	// Sync with prop changes
	useEffect(() => {
		if (userContextProp !== undefined) {
			setUserContext(userContextProp);
		}
	}, [userContextProp]);

	// Load context if not provided via props (fallback for Stack header rendering)
	useEffect(() => {
		if (userContextProp === undefined) {
			const loadUserContext = async () => {
				const context = await getUserContext();
				setUserContext(context);
			};
			loadUserContext();
		}
	}, [userContextProp]);

	const isIndexPage = pathname === "/" || pathname === "/(protected)/(tabs)/";
	const shouldShowMenu = isIndexPage && !navButton;
	const shouldShowBack = showBackButton && !isIndexPage && !navButton;

	const handleSignOut = useCallback(async () => {
		try {
			await signOut();
			hideDrawer();
			router.replace("/welcome");
		} catch (error) {
			console.error("Sign out error:", error);
		}
	}, [signOut, hideDrawer, router]);

	const handleChangePassword = useCallback(() => {
		hideDrawer();
		router.push("/change-password");
	}, [hideDrawer, router]);

	const refreshContext = useCallback(async () => {
		if (onRefreshUserContext) {
			await onRefreshUserContext();
		} else {
			const context = await getUserContext();
			setUserContext(context);
		}
	}, [onRefreshUserContext]);

	const handleInvitePartner = useCallback(async () => {
		if (!partnerEmail.trim() || !userContext) return;

		const invalid = validatePartnerEmail(partnerEmail);
		if (invalid) {
			setInviteError(invalid);
			return;
		}

		setInviting(true);
		setInviteError(null);

		try {
			// Call database function to set pending_partner_email
			const result = await invitePartner(userContext.userId, partnerEmail);

			if (result.error) {
				setInviteError(result.error);
				return;
			}

			// Success! Clear the input and reload context
			setPartnerEmail("");
			await refreshContext();
		} catch (error) {
			console.error("Error inviting partner:", error);
			setInviteError("Failed to send invitation. Please try again.");
		} finally {
			setInviting(false);
		}
	}, [partnerEmail, userContext, refreshContext]);

	const handleResendInvitation = useCallback(async () => {
		if (!userContext?.pendingPartnerEmail) return;

		setInviting(true);
		setInviteError(null);

		try {
			// Resend to the same email
			const result = await invitePartner(userContext.userId, userContext.pendingPartnerEmail);

			if (result.error) {
				setInviteError(result.error);
				return;
			}

			await refreshContext();
		} catch (error) {
			console.error("Error resending invitation:", error);
			setInviteError("Failed to resend invitation. Please try again.");
		} finally {
			setInviting(false);
		}
	}, [userContext, refreshContext]);

	const handleCancelInvitation = useCallback(async () => {
		if (!userContext) return;

		setInviting(true);
		setInviteError(null);

		try {
			const result = await cancelPartnerInvitation(userContext.userId);

			if (result.error) {
				setInviteError(result.error);
				return;
			}

			await refreshContext();
		} catch (error) {
			console.error("Error canceling invitation:", error);
			setInviteError("Failed to cancel invitation. Please try again.");
		} finally {
			setInviting(false);
		}
	}, [userContext, refreshContext]);

	const renderSettingsContent = useCallback(
		() => (
			<SettingsSheet
				userContext={userContext}
				partnerEmail={partnerEmail}
				onPartnerEmailChange={setPartnerEmail}
				inviting={inviting}
				error={inviteError}
				pair={pair}
				onPairChange={setPair}
				onInvite={handleInvitePartner}
				onResendInvitation={handleResendInvitation}
				onCancelInvitation={handleCancelInvitation}
				onChangePassword={handleChangePassword}
				onSignOut={handleSignOut}
				onClose={hideDrawer}
			/>
		),
		[
			userContext,
			partnerEmail,
			inviting,
			inviteError,
			pair,
			setPair,
			handleInvitePartner,
			handleCancelInvitation,
			handleResendInvitation,
			handleChangePassword,
			handleSignOut,
			hideDrawer,
		],
	);

	const handleShowSettings = () => {
		showDrawer("Settings", renderSettingsContent(), { type: "settings" });
	};

	// Update drawer content when state changes (only when this screen opened the drawer)
	useEffect(() => {
		if (isDrawerVisible && drawerType === "settings") {
			updateContent(renderSettingsContent());
		}
	}, [
		partnerEmail,
		inviting,
		inviteError,
		userContext,
		pair,
		renderSettingsContent,
		updateContent,
		isDrawerVisible,
		drawerType,
	]);

	/**
	 * FEATURE-INVENTORY §0.2, unchanged: the three are mutually exclusive and
	 * they are tried in this order — a screen's own `navButton` wins, then the
	 * settings circle (index route only), then back.
	 */
	const right = navButton ? (
		navButton
	) : shouldShowMenu ? (
		<CircleButton label="Settings" testID="header-settings" onPress={handleShowSettings}>
			<MenuGlyph />
		</CircleButton>
	) : shouldShowBack ? (
		<CircleButton label="Back" testID="header-back" onPress={() => router.back()}>
			<BackGlyph />
		</CircleButton>
	) : null;

	return <AppBar right={right} />;
};

export default Header;
