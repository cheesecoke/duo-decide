import { getColor, styled } from "@/lib/styled";
import { CircleButton } from "@/components/ui/Button";
import { IconHeart } from "@/assets/icons/IconHeart";
import { IconArrowBack } from "@/assets/icons/IconArrowBack";
import { IconList } from "@/assets/icons/IconList";
import { useRouter, usePathname } from "expo-router";
import { useDrawer } from "@/context/drawer-provider";
import { useTheme } from "@/context/theme-provider";
import { useAuth } from "@/context/supabase-provider";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { useState, useEffect } from "react";
import { getUserContext } from "@/lib/database";
import type { UserContext } from "@/types/database";

const HeaderContainer = styled.View<{
	colorMode: "light" | "dark";
}>`
	background-color: ${({ colorMode }) => getColor("background", colorMode)};
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	padding: 8px 16px;
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
	const { showDrawer, hideDrawer } = useDrawer();
	const { colorMode: themeColorMode } = useTheme();
	const { signOut } = useAuth();
	const [userContext, setUserContext] = useState<UserContext | null>(null);

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

	const handleSignOut = async () => {
		try {
			await signOut();
			hideDrawer();
			router.replace("/welcome");
		} catch (error) {
			console.error("Sign out error:", error);
		}
	};

	const renderSettingsContent = () => (
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
									<PartnerValue colorMode={themeColorMode}>
										{userContext.pendingPartnerEmail}
									</PartnerValue>
								</PartnerRow>
								<PendingText colorMode={themeColorMode}>⏳ Waiting for partner to sign up</PendingText>
							</>
						) : (
							<PendingText colorMode={themeColorMode}>⚠️ No partner linked</PendingText>
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
