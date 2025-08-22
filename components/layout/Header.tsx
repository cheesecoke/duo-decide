import { getColor, styled } from "@/lib/styled";
import { CloseButton } from "@/components/ui/Button";
import { XIcon } from "@/assets/icons/x";
import { IconHeart } from "@/assets/icons/IconHeart";
import { useRouter } from "expo-router";

const HeaderContainer = styled.View<{ colorMode: "light" | "dark" }>`
	background-color: ${({ colorMode }) => getColor("background", colorMode)};
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	padding: 8px 16px;
`;

const HeaderTextContainer = styled.View`
	flex-direction: row;
	align-items: center;
`;

const HeaderText = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 18px;
	font-weight: bold;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
`;

const IconWrapper = styled.View`
	margin-right: 16px;
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

	return (
		<HeaderContainer colorMode={colorMode}>
			<HeaderTextContainer>
				<IconWrapper>
					<IconHeart color={getColor("yellow", colorMode)} />
				</IconWrapper>
				<HeaderText colorMode={colorMode}>Welcome to Duo</HeaderText>
			</HeaderTextContainer>
			{navButton ||
				(showBackButton && (
					<CloseButton colorMode={colorMode} size="sm" variant="outline" onPress={() => router.back()}>
						<XIcon />
					</CloseButton>
				))}
		</HeaderContainer>
	);
};

export default Header;
