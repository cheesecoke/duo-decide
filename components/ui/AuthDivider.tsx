import { styled, getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import { Text } from "@/components/ui/Text";

const Row = styled.View`
	flex-direction: row;
	align-items: center;
	gap: 12px;
	margin-vertical: 8px;
`;

const Line = styled.View<{ colorMode: "light" | "dark" }>`
	flex: 1;
	height: 1px;
	background-color: ${({ colorMode }) => getColor("border", colorMode)};
`;

const Label = styled(Text)<{ colorMode: "light" | "dark" }>`
	color: ${({ colorMode }) => getColor("mutedForeground", colorMode)};
	font-size: 12px;
	font-weight: 600;
	letter-spacing: 1px;
`;

export function AuthDivider() {
	const { colorMode } = useTheme();
	return (
		<Row>
			<Line colorMode={colorMode} />
			<Label colorMode={colorMode}>OR</Label>
			<Line colorMode={colorMode} />
		</Row>
	);
}
