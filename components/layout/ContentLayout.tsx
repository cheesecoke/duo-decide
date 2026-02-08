import { getColor, styled } from "@/lib/styled";
import { SafeAreaView } from "react-native";
import { useTheme } from "@/context/theme-provider";
import { useDrawer } from "@/context/drawer-provider";
import { BottomDrawer } from "@/components/modals/BottomDrawer";

const Container = styled.View<{
	colorMode: "light" | "dark";
}>`
	flex: 1;
	background-color: ${({ colorMode }) => getColor("background", colorMode)};
	width: 100%;
	max-width: 786px;
	align-self: center;
	margin: 0 auto;
`;

const ContentContainer = styled.View<{
	colorMode: "light" | "dark";
	scrollable: boolean;
}>`
	flex: 1;
	padding: 18px 30px 24px 30px;
`;

const ScrollContainer = styled.ScrollView<{
	colorMode: "light" | "dark";
}>`
	flex: 1;
	padding: 18px 30px 24px 30px;
`;

interface ContentLayoutProps {
	children: React.ReactNode;
	scrollable?: boolean;
}

const ContentLayout = ({ children, scrollable = false }: ContentLayoutProps) => {
	const { colorMode } = useTheme();
	const { isVisible, title, content, hideDrawer } = useDrawer();

	return (
		<Container colorMode={colorMode}>
			<SafeAreaView style={{ flex: 1 }}>
				{scrollable ? (
					<ScrollContainer colorMode={colorMode}>{children}</ScrollContainer>
				) : (
					<ContentContainer colorMode={colorMode} scrollable={scrollable}>
						{children}
					</ContentContainer>
				)}

				<BottomDrawer visible={isVisible} onClose={hideDrawer} title={title}>
					{content}
				</BottomDrawer>
			</SafeAreaView>
		</Container>
	);
};

export default ContentLayout;
