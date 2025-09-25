import { getColor, styled } from "@/lib/styled";
import { CircleButton } from "@/components/ui/Button";
import { IconHeart } from "@/assets/icons/IconHeart";
import { IconArrowBack } from "@/assets/icons/IconArrowBack";
import { IconList } from "@/assets/icons/IconList";
import { useRouter, usePathname } from "expo-router";
import { useDrawer } from "@/context/drawer-provider";
import { useTheme } from "@/context/theme-provider";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";

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

	const isIndexPage = pathname === "/" || pathname === "/(protected)/(tabs)/";
	const shouldShowMenu = isIndexPage && !navButton;
	const shouldShowBack = showBackButton && !isIndexPage && !navButton;

	const handleShowSettings = () => {
		showDrawer("Settings", renderSettingsContent());
	};

	const renderSettingsContent = () => (
		<>
			<FormFieldContainer>
				<FieldLabel colorMode={themeColorMode}>App Settings</FieldLabel>
				<Text style={{ color: getColor("mutedForeground", themeColorMode) }}>
					Settings functionality coming soon...
				</Text>
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
