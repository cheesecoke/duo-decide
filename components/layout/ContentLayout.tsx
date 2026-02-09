import { getColor, styled } from "@/lib/styled";
import { SafeAreaView } from "react-native";
import { useTheme } from "@/context/theme-provider";

/**
 * Centered content container - transparent so corner illustrations show through
 * in the body area. Cards and content elements have their own opaque backgrounds.
 */
const Container = styled.View<{
	colorMode: "light" | "dark";
}>`
	flex: 1;
	width: 100%;
	max-width: 786px;
	align-self: center;
	margin: 0 auto;
	background-color: transparent;
`;

const ContentContainer = styled.View<{
	colorMode: "light" | "dark";
	scrollable: boolean;
}>`
	flex: 1;
	padding: 18px 30px 24px 30px;
	background-color: transparent;
`;

const ScrollContainer = styled.ScrollView<{
	colorMode: "light" | "dark";
}>`
	flex: 1;
	padding: 18px 30px 24px 30px;
	background-color: transparent;
`;

interface ContentLayoutProps {
	children: React.ReactNode;
	scrollable?: boolean;
}

const ContentLayout = ({ children, scrollable = false }: ContentLayoutProps) => {
	const { colorMode } = useTheme();

	return (
		<Container colorMode={colorMode}>
			<SafeAreaView style={{ flex: 1 }}>
				{scrollable ? (
					<ScrollContainer colorMode={colorMode}>
						{children}
					</ScrollContainer>
				) : (
					<ContentContainer colorMode={colorMode} scrollable={scrollable}>
						{children}
					</ContentContainer>
				)}
			</SafeAreaView>
		</Container>
	);
};

export default ContentLayout;
