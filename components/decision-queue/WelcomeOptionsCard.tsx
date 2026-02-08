import React from "react";
import { styled, getColor, cardShadow } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import { Text } from "@/components/ui/Text";
import { SecondaryButton } from "@/components/ui/Button";
import { WELCOME_OPTIONS } from "@/lib/welcomeDecisionContent";

const CardContainer = styled.View<{ colorMode: "light" | "dark" }>`
	background-color: ${({ colorMode }) => getColor("card", colorMode)};
	border-radius: 8px;
	padding: 16px;
	border: 1px solid ${({ colorMode }) => getColor("border", colorMode)};
	${cardShadow}
	elevation: 2;
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

interface WelcomeOptionsCardProps {
	onDismiss: () => void;
}

export function WelcomeOptionsCard({ onDismiss }: WelcomeOptionsCardProps) {
	const { colorMode } = useTheme();

	return (
		<CardContainer
			colorMode={colorMode}
			accessibilityRole="article"
			accessibilityLabel={WELCOME_OPTIONS.title}
		>
			<CardTitle colorMode={colorMode}>{WELCOME_OPTIONS.title}</CardTitle>
			<DetailsText colorMode={colorMode}>{WELCOME_OPTIONS.description}</DetailsText>
			<OptionsList>
				{WELCOME_OPTIONS.options.map((opt, i) => (
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
							color: getColor("yellowForeground", colorMode),
							fontWeight: "500",
							fontSize: 16,
						}}
					>
						Got it
					</Text>
				</SecondaryButton>
			</ButtonWrap>
		</CardContainer>
	);
}
