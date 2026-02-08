import { styled, getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";

const FooterOuter = styled.View<{
	colorMode: "light" | "dark";
}>`
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	background-color: ${({ colorMode }) => getColor("background", colorMode)};
	padding: 10px 20px;
	align-items: center;
	width: 100%;
	max-width: 786px;
	margin-left: auto;
	margin-right: auto;
`;

interface FixedFooterProps {
	children: React.ReactNode;
}

/**
 * Fixed bottom footer for primary actions (e.g. Create Decision, Create List).
 * Slim, themed strip that sits above the tab bar. Consistent across Decision Queue and Options.
 */
export function FixedFooter({ children }: FixedFooterProps) {
	const { colorMode } = useTheme();
	return <FooterOuter colorMode={colorMode}>{children}</FooterOuter>;
}
