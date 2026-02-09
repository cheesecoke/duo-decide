import { styled, getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";

const FooterOuter = styled.View<{
	colorMode: "light" | "dark";
	background: "solid" | "transparent";
}>`
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	z-index: 3;
	padding: 10px 20px;
	align-items: center;
	width: 100%;
	max-width: 786px;
	margin-left: auto;
	margin-right: auto;
	${({ colorMode, background }) => {
		if (background === "transparent") {
			return `background-color: transparent;`;
		}
		return `background-color: ${getColor("background", colorMode)};`;
	}}
`;

interface FixedFooterProps {
	children: React.ReactNode;
	background?: "solid" | "transparent";
}

export function FixedFooter({ children, background = "solid" }: FixedFooterProps) {
	const { colorMode } = useTheme();
	return (
		<FooterOuter colorMode={colorMode} background={background}>
			{children}
		</FooterOuter>
	);
}
