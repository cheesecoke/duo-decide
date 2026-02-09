import React from "react";
import { styled, getColor, cardShadow } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import { Text } from "@/components/ui/Text";
import { SecondaryButton } from "@/components/ui/Button";

const CardContainer = styled.View<{ colorMode: "light" | "dark" }>`
	z-index: 10;
	background-color: ${({ colorMode }) => getColor("background", colorMode)};
	border-radius: 8px;
	padding: 16px;
	overflow: hidden;
	border: 1px solid ${({ colorMode }) => getColor("border", colorMode)};
	${cardShadow}
	elevation: 2;
	margin-bottom: 20px;
`;

const CardTitle = styled.Text<{ colorMode: "light" | "dark" }>`
	font-size: 18px;
	font-weight: 600;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
	margin-bottom: 8px;
`;

const DetailsText = styled.Text<{ colorMode: "light" | "dark" }>`
	font-size: 14px;
	color: ${({ colorMode }) => getColor("mutedForeground", colorMode)};
	line-height: 20px;
	margin-bottom: 16px;
`;

const OptionsList = styled.View`
	margin-bottom: 20px;
`;

const OptionRow = styled.View<{ colorMode: "light" | "dark" }>`
	flex-direction: row;
	align-items: flex-start;
	padding-vertical: 8px;
	border-bottom-width: 1px;
	border-bottom-color: ${({ colorMode }) => getColor("border", colorMode)};
`;

const OptionBullet = styled.Text<{ colorMode: "light" | "dark" }>`
	font-size: 14px;
	color: ${({ colorMode }) => getColor("yellow", colorMode)};
	margin-right: 8px;
`;

const OptionText = styled.Text<{ colorMode: "light" | "dark" }>`
	font-size: 14px;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
	flex: 1;
`;

const ButtonWrap = styled.View`
	align-items: center;
`;

export interface WelcomeCardOption {
	title: string;
}

export interface WelcomeCardProps {
	title: string;
	description: string;
	options: WelcomeCardOption[];
	onDismiss: () => void;
	buttonLabel?: string;
}

export function WelcomeCard({
	title,
	description,
	options,
	onDismiss,
	buttonLabel = "Got it",
}: WelcomeCardProps) {
	const { colorMode } = useTheme();

	return (
		<CardContainer colorMode={colorMode} accessibilityRole="article" accessibilityLabel={title}>
			<CardTitle colorMode={colorMode}>{title}</CardTitle>
			<DetailsText colorMode={colorMode}>{description}</DetailsText>
			<OptionsList>
				{options.map((opt, i) => (
					<OptionRow key={i} colorMode={colorMode}>
						<OptionBullet colorMode={colorMode}>•</OptionBullet>
						<OptionText colorMode={colorMode}>{opt.title}</OptionText>
					</OptionRow>
				))}
			</OptionsList>
			<ButtonWrap>
				<SecondaryButton colorMode={colorMode} onPress={onDismiss} style={{ minWidth: 120 }}>
					<Text
						style={{
							color: getColor("foreground", colorMode),
							fontWeight: "500",
							fontSize: 16,
						}}
					>
						{buttonLabel}
					</Text>
				</SecondaryButton>
			</ButtonWrap>
		</CardContainer>
	);
}
