import { getColor, styled } from "@/lib/styled";
import { CloseButton } from "@/components/ui/Button";
import { XIcon } from "@/assets/icons/x";
import { IconHeart } from "@/assets/icons/IconHeart";

const HeaderContainer = styled.View`
	margin-bottom: 24px;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
`;

const HeaderText = styled.Text<{
	colorMode: "light" | "dark";
}>`
	font-size: 18px;
	font-weight: bold;
	margin-bottom: 8px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
`;

const Header = ({ colorMode }: { colorMode: "light" | "dark" }) => {
	return (
		<HeaderContainer>
			<HeaderText colorMode={colorMode}>
				<IconHeart color={getColor("yellow", colorMode)} /> Welcome to Duo
			</HeaderText>
			<CloseButton
				colorMode={colorMode}
				variant="outline"
				size="icon"
				onPress={() => {
					console.log("pressed");
				}}
				rounded
			>
				<XIcon size={16} color={getColor("foreground", colorMode)} />
			</CloseButton>
		</HeaderContainer>
	);
};

export default Header;
