import { getColor, styled } from "@/lib/styled";
import { SafeAreaView, Text, View } from "react-native";
import { useTheme } from "@/context/theme-provider";
import { useDrawer } from "@/context/drawer-provider";
import Header from "@/components/layout/Header";
import { FloatingNav } from "@/components/navigation/FloatingNav/FloatingNav";
import { BottomDrawer } from "@/components/modals/BottomDrawer";

const Container = styled.View<{
	colorMode: "light" | "dark";
}>`
	flex: 1;
	background-color: ${({ colorMode }) => getColor("background", colorMode)};
`;

const ScrollContainer = styled.ScrollView<{
	colorMode: "light" | "dark";
}>`
	flex: 1;
	padding: 16px 16px 24px 16px;
`;

const ContentContainer = styled.View<{
	colorMode: "light" | "dark";
}>`
	flex: 1;
	padding: 16px 16px 24px 16px;
`;

interface MainLayoutProps {
	children: React.ReactNode;
	createButtonText?: string;
	onCreatePress?: () => void;
	scrollable?: boolean;
}

const MainLayout = ({ children, createButtonText = "Create", onCreatePress, scrollable = true }: MainLayoutProps) => {
	const { colorMode } = useTheme();
	const { isVisible, title, content, hideDrawer } = useDrawer();

	return (
		<Container colorMode={colorMode}>
			<SafeAreaView
				style={{
					flex: 1,
				}}
			>
				{scrollable ? (
					<ScrollContainer colorMode={colorMode}>
						<Header colorMode={colorMode} />
						{children}
					</ScrollContainer>
				) : (
					<ContentContainer colorMode={colorMode}>
						<Header colorMode={colorMode} />
						{children}
					</ContentContainer>
				)}

				{onCreatePress && (
					<FloatingNav createButtonText={createButtonText} onCreatePress={onCreatePress} />
				)}

				<BottomDrawer visible={isVisible} onClose={hideDrawer} title={title}>
					{content}
				</BottomDrawer>
			</SafeAreaView>
		</Container>
	);
};

export default MainLayout;
