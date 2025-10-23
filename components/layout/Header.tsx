import { View } from "react-native";
import { getColor, styled } from "@/lib/styled";
import { CircleButton, Button } from "@/components/ui/Button";
import { IconHeart } from "@/assets/icons/IconHeart";
import { IconArrowBack } from "@/assets/icons/IconArrowBack";
import { IconList } from "@/assets/icons/IconList";
import { useRouter, usePathname } from "expo-router";
import { useDrawer } from "@/context/drawer-provider";
import { useTheme } from "@/context/theme-provider";
import { useAuth } from "@/context/supabase-provider";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import { useState, useEffect, useCallback } from "react";
import { getUserContext, invitePartner, cancelPartnerInvitation } from "@/lib/database";
import type { UserContext } from "@/types/database";

const HeaderContainer = styled.View<{
	colorMode: "light" | "dark";
}>`
	background-color: ${({ colorMode }) => getColor("background", colorMode)};
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	padding: 8px 16px;
	width: 100%;
	max-width: 786px;
	align-self: center;
`;

const HeaderText = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 18px;
	font-weight: bold;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
`;

const IconWrapper = styled.View`
	margin-right: 12px;
`;

const FormFieldContainer = styled.View`
	margin-bottom: 16px;
`;

const FieldLabel = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 16px;
	font-weight: 500;
	margin-bottom: 8px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
`;

const PartnerStatusContainer = styled.View<{
	colorMode: "light" | "dark";
}>`
	background-color: ${({ colorMode }) => getColor("card", colorMode)};
	border: 1px solid ${({ colorMode }) => getColor("border", colorMode)};
	border-radius: 8px;
	padding: 12px;
	gap: 8px;
`;

const PartnerRow = styled.View`
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
`;

const PartnerLabel = styled(Text)<{
	colorMode: "light" | "dark";
}>`
	font-size: 14px;
	color: ${({ colorMode }) => getColor("mutedForeground", colorMode)};
`;

const PartnerValue = styled(Text)<{
	colorMode: "light" | "dark";
}>`
	font-size: 14px;
	font-weight: 600;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
`;

const PendingText = styled(Text)<{
	colorMode: "light" | "dark";
}>`
	font-size: 14px;
	font-style: italic;
	color: ${({ colorMode }) => getColor("mutedForeground", colorMode)};
`;

const Header = ({
	colorMode,
	showBackButton = false,
	navButton,
}: {
	colorMode: "light" | "dark";
	showBackButton?: boolean;
	navButton?: React.ReactNode;
}) => {
	const router = useRouter();
	const pathname = usePathname();
	const { showDrawer, hideDrawer, updateContent } = useDrawer();
	const { colorMode: themeColorMode } = useTheme();
	const { signOut } = useAuth();
	const [userContext, setUserContext] = useState<UserContext | null>(null);
	const [partnerEmail, setPartnerEmail] = useState("");
	const [inviting, setInviting] = useState(false);
	const [inviteError, setInviteError] = useState<string | null>(null);

	useEffect(() => {
		const loadUserContext = async () => {
			const context = await getUserContext();
			setUserContext(context);
		};
		loadUserContext();
	}, []);

	const isIndexPage = pathname === "/" || pathname === "/(protected)/(tabs)/";
	const shouldShowMenu = isIndexPage && !navButton;
	const shouldShowBack = showBackButton && !isIndexPage && !navButton;

	const handleShowSettings = () => {
		showDrawer("Settings", renderSettingsContent());
	};

	// Update drawer content when state changes
	useEffect(() => {
		updateContent(renderSettingsContent());
	}, [partnerEmail, inviting, inviteError, userContext, renderSettingsContent, updateContent]);

	const handleSignOut = useCallback(async () => {
		try {
			await signOut();
			hideDrawer();
			router.replace("/welcome");
		} catch (error) {
			console.error("Sign out error:", error);
		}
	}, [signOut, hideDrawer, router]);

	const handleInvitePartner = useCallback(async () => {
		if (!partnerEmail.trim() || !userContext) return;

		// Basic email validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(partnerEmail)) {
			setInviteError("Please enter a valid email address");
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

			// Reload user context to get updated data
			const context = await getUserContext();
			setUserContext(context);
		} catch (error) {
			console.error("Error inviting partner:", error);
			setInviteError("Failed to send invitation. Please try again.");
		} finally {
			setInviting(false);
		}
	}, [partnerEmail, userContext]);

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

			// Reload user context
			const context = await getUserContext();
			setUserContext(context);
		} catch (error) {
			console.error("Error resending invitation:", error);
			setInviteError("Failed to resend invitation. Please try again.");
		} finally {
			setInviting(false);
		}
	}, [userContext]);

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

			// Reload user context to clear pending email
			const context = await getUserContext();
			setUserContext(context);
		} catch (error) {
			console.error("Error canceling invitation:", error);
			setInviteError("Failed to cancel invitation. Please try again.");
		} finally {
			setInviting(false);
		}
	}, [userContext]);

	const renderSettingsContent = useCallback(
		() => (
			<>
				{userContext && (
					<FormFieldContainer>
						<FieldLabel colorMode={themeColorMode}>Partner Status</FieldLabel>
						<PartnerStatusContainer colorMode={themeColorMode}>
							<PartnerRow>
								<PartnerLabel colorMode={themeColorMode}>Your Name:</PartnerLabel>
								<PartnerValue colorMode={themeColorMode}>{userContext.userName}</PartnerValue>
							</PartnerRow>

							{userContext.partnerId && userContext.partnerName ? (
								<>
									<PartnerRow>
										<PartnerLabel colorMode={themeColorMode}>Partner:</PartnerLabel>
										<PartnerValue colorMode={themeColorMode}>{userContext.partnerName}</PartnerValue>
									</PartnerRow>
									<PendingText colorMode={themeColorMode}>✓ Partner linked</PendingText>
								</>
							) : userContext.pendingPartnerEmail ? (
								<>
									<PartnerRow>
										<PartnerLabel colorMode={themeColorMode}>Invited:</PartnerLabel>
										<PartnerValue colorMode={themeColorMode}>{userContext.pendingPartnerEmail}</PartnerValue>
									</PartnerRow>
									<PendingText colorMode={themeColorMode}>⏳ Waiting for partner to sign up</PendingText>
									{inviteError && (
										<Text
											style={{ color: getColor("destructive", themeColorMode), fontSize: 12, marginTop: 4 }}
										>
											{inviteError}
										</Text>
									)}
									<View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
										<Button
											variant="outline"
											onPress={handleCancelInvitation}
											disabled={inviting}
											style={{ flex: 1, opacity: inviting ? 0.6 : 1 }}
										>
											Cancel
										</Button>
										<Button
											variant="default"
											onPress={handleResendInvitation}
											disabled={inviting}
											style={{ flex: 1, opacity: inviting ? 0.6 : 1 }}
										>
											{inviting ? "Sending..." : "Resend"}
										</Button>
									</View>
								</>
							) : (
								<>
									<PendingText colorMode={themeColorMode}>⚠️ No partner linked</PendingText>
									<FormFieldContainer style={{ marginTop: 12 }}>
										<Input
											placeholder="Enter partner's email"
											value={partnerEmail}
											onChangeText={setPartnerEmail}
											keyboardType="email-address"
											autoCapitalize="none"
										/>
										{inviteError && (
											<Text
												style={{ color: getColor("destructive", themeColorMode), fontSize: 12, marginTop: 4 }}
											>
												{inviteError}
											</Text>
										)}
										<Button
											variant="default"
											onPress={handleInvitePartner}
											disabled={inviting || !partnerEmail.trim()}
											style={{ marginTop: 8, opacity: inviting || !partnerEmail.trim() ? 0.6 : 1 }}
										>
											{inviting ? "Sending..." : "Invite Partner"}
										</Button>
									</FormFieldContainer>
								</>
							)}
						</PartnerStatusContainer>
					</FormFieldContainer>
				)}

				<FormFieldContainer>
					<Button variant="outline" onPress={handleSignOut}>
						Sign Out
					</Button>
				</FormFieldContainer>

				<Button variant="outline" onPress={hideDrawer}>
					Close
				</Button>
			</>
		),
		[
			userContext,
			themeColorMode,
			inviteError,
			inviting,
			partnerEmail,
			handleInvitePartner,
			handleCancelInvitation,
			handleResendInvitation,
			handleSignOut,
			hideDrawer,
		],
	);

	return (
		<HeaderContainer colorMode={colorMode}>
			<HeaderText colorMode={colorMode}>
				<IconWrapper>
					<IconHeart color={getColor("yellow", colorMode)} />
				</IconWrapper>
				Duo
			</HeaderText>

			{navButton ||
				(shouldShowMenu && (
					<CircleButton colorMode={colorMode} onPress={handleShowSettings}>
						<IconList size={16} color={getColor("foreground", colorMode)} />
					</CircleButton>
				)) ||
				(shouldShowBack && (
					<CircleButton colorMode={colorMode} onPress={() => router.back()}>
						<IconArrowBack size={20} color={getColor("foreground", colorMode)} />
					</CircleButton>
				))}
		</HeaderContainer>
	);
};

export default Header;
