import styled from "@emotion/native";
import { theme, ColorKey, ColorMode } from "./theme";

export interface StyledProps {
	theme: typeof theme;
	colorMode: ColorMode;
}

export const getColor = (colorKey: ColorKey, colorMode: ColorMode = "light") => {
	return theme.colors[colorKey][colorMode];
};

export { styled };
export { theme };
