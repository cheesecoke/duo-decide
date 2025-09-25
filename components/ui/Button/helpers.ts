import { getColor } from "@/lib/styled";

const getDarkenedColor = (colorKey: string, colorMode: "light" | "dark", amount = 0.1): string => {
	const baseColor = getColor(colorKey, colorMode);
	if (baseColor.startsWith("hsl")) {
		return baseColor.replace(/(\d+)%\)$/, (match, lightness) => {
			const newLightness = Math.max(0, parseInt(lightness) - amount * 100);
			return `${newLightness}%)`;
		});
	}
	return baseColor;
};

export const getButtonColors = (variant: string, colorMode: "light" | "dark") => {
	switch (variant) {
		case "default":
			return {
				normal: getColor("yellow", colorMode),
				pressed: getDarkenedColor("yellow", colorMode, 0.15),
				textColor: getColor("yellowForeground", colorMode),
			};
		case "secondary":
			return {
				normal: getColor("muted", colorMode),
				pressed: getDarkenedColor("muted", colorMode, 0.1),
				textColor: getColor("mutedForeground", colorMode),
			};
		case "outline":
			return {
				normal: getColor("background", colorMode),
				pressed: getColor("muted", colorMode),
				textColor: getColor("foreground", colorMode),
			};
		case "destructive":
			return {
				normal: getColor("destructive", colorMode),
				pressed: getDarkenedColor("destructive", colorMode, 0.15),
				textColor: getColor("destructiveForeground", colorMode),
			};
		case "ghost":
			return {
				normal: "transparent",
				pressed: getColor("muted", colorMode),
				textColor: getColor("foreground", colorMode),
			};
		case "link":
			return {
				normal: "transparent",
				pressed: "transparent",
				textColor: getColor("primary", colorMode),
			};
		case "circle":
			return {
				normal: getColor("background", colorMode),
				pressed: getColor("muted", colorMode),
				textColor: getColor("foreground", colorMode),
			};
		default:
			return {
				normal: getColor("yellow", colorMode),
				pressed: getDarkenedColor("yellow", colorMode, 0.15),
				textColor: getColor("yellowForeground", colorMode),
			};
	}
};

export const getSizeStyles = (size: string) => {
	switch (size) {
		case "sm":
			return {
				height: 36,
				paddingHorizontal: 12,
				fontSize: 14,
			};
		case "lg":
			return {
				height: 44,
				paddingHorizontal: 32,
				fontSize: 18,
			};
		case "icon":
			return {
				height: 40,
				width: 40,
				paddingHorizontal: 0,
				fontSize: 14,
			};
		default:
			return {
				height: 40,
				paddingHorizontal: 16,
				fontSize: 14,
			};
	}
};
