import "../global.css";

import * as React from "react";
import { View } from "react-native";
import { vars } from "nativewind";

import type { Decorator, Preview } from "@storybook/react-native-web-vite";

import { pairVars } from "../theme/presets";

/**
 * Every story renders inside the default person pair (sage + blush).
 * On web the `.theme-sage-blush` class carries the vars (global.css); the
 * inline `vars()` style is the native path and is harmless on web.
 */
const withDuoTheme: Decorator = (Story) => (
	<View className="theme-sage-blush flex-1 bg-bg p-5" style={vars(pairVars())}>
		<Story />
	</View>
);

const preview: Preview = {
	decorators: [withDuoTheme],
	parameters: {
		layout: "fullscreen",
		backgrounds: { disable: true },
		controls: { matchers: { color: /(background|color)$/i } },
	},
};

export default preview;
