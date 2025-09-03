import { getColor, styled } from "@/lib/styled";
import { CircleButton } from "@/components/ui/Button";
import { IconHeart } from "@/assets/icons/IconHeart";
import { IconArrowBack } from "@/assets/icons/IconArrowBack";
import { useRouter } from "expo-router";

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
			<HeaderText colorMode={colorMode}>
				<IconWrapper>
					<IconHeart color={getColor("yellow", colorMode)} />
				</IconWrapper>
				Duo
			</HeaderText>
			{navButton ||
				(showBackButton && (
					<CircleButton colorMode={colorMode} onPress={() => router.back()}>
						<IconArrowBack color={getColor("foreground", colorMode)} />
					</CircleButton>
				))}
		</HeaderContainer>
	);
};

export default Header;
