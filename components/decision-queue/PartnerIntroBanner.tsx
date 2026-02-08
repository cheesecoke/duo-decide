import React from "react";
import { styled, getColor, cardShadow } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import { Text } from "@/components/ui/Text";
import { PrimaryButton } from "@/components/ui/Button";
import { PARTNER_INTRO } from "@/lib/welcomeDecisionContent";

const BannerContainer = styled.View<{ colorMode: "light" | "dark" }>`
	background-color: ${({ colorMode }) => getColor("card", colorMode)};
	border-radius: 8px;
	padding: 16px;
	border: 1px solid ${({ colorMode }) => getColor("border", colorMode)};
	${cardShadow}
	elevation: 2;
	margin-bottom: 16px;
`;

const BannerTitle = styled.Text<{ colorMode: "light" | "dark" }>`
	font-size: 18px;
	font-weight: 600;
	color: ${({ colorMode }) => getColor("foreground", colorMode)};
	margin-bottom: 8px;
`;

const BannerDescription = styled.Text<{ colorMode: "light" | "dark" }>`
	font-size: 14px;
	color: ${({ colorMode }) => getColor("mutedForeground", colorMode)};
	line-height: 20px;
	margin-bottom: 12px;
`;

const OptionRow = styled.View<{ colorMode: "light" | "dark" }>`
	flex-direction: row;
	align-items: flex-start;
	padding-vertical: 4px;
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
	align-items: flex-start;
	margin-top: 16px;
`;

interface PartnerIntroBannerProps {
	onDismiss: () => void;
}

export function PartnerIntroBanner({ onDismiss }: PartnerIntroBannerProps) {
	const { colorMode } = useTheme();

	return (
		<BannerContainer
			colorMode={colorMode}
			accessibilityRole="article"
			accessibilityLabel={PARTNER_INTRO.title}
		>
			<BannerTitle colorMode={colorMode}>{PARTNER_INTRO.title}</BannerTitle>
			<BannerDescription colorMode={colorMode}>{PARTNER_INTRO.description}</BannerDescription>
			{PARTNER_INTRO.options.map((opt, i) => (
				<OptionRow key={i} colorMode={colorMode}>
					<OptionBullet colorMode={colorMode}>•</OptionBullet>
					<OptionText colorMode={colorMode}>{opt.title}</OptionText>
				</OptionRow>
			))}
			<ButtonWrap>
				<PrimaryButton colorMode={colorMode} onPress={onDismiss} style={{ minWidth: 120 }}>
					<Text
						style={{
							color: getColor("yellowForeground", colorMode),
							fontWeight: "500",
							fontSize: 16,
						}}
					>
						Got it
					</Text>
				</PrimaryButton>
			</ButtonWrap>
		</BannerContainer>
	);
}
