import styled from "@emotion/native";
import { theme, ColorKey, ColorMode } from "./theme";

export interface StyledProps {
	theme: typeof theme;
	colorMode: ColorMode;
}

export const getColor = (colorKey: ColorKey, colorMode: ColorMode = "light") => {
	return theme.colors[colorKey][colorMode];
};

/**
 * Platform-aware card shadow. Uses box-shadow (web/native) instead of deprecated shadow* props.
 */
export const cardShadow = "box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1)";

/**
 * Stronger shadow for elevated surfaces (e.g. bottom drawer).
 */
export const drawerShadow = "box-shadow: 0 -4px 10px rgba(0, 0, 0, 0.1)";

/**
 * Subtle shadow for switch thumb (unchecked state).
 */
export const thumbShadowSubtle = "box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05)";

/**
 * Stronger shadow for switch thumb (checked state).
 */
export const thumbShadowStrong = "box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25)";

export { styled };
export { theme };
