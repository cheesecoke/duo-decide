import "../global.css";

import * as React from "react";

import type { Decorator, Preview } from "@storybook/react-native-web-vite";

import { PersonPairProvider } from "../theme/PersonPairProvider";

/**
 * Every story renders inside the default person pair (sage + blush), through
 * the same provider the app uses — so a story exercises the real wiring rather
 * than a Storybook-only copy of it.
 *
 * The provider supplies the native channel (NativeWind `vars()` on its own
 * View). `theme-sage-blush` is the web channel: on web the custom properties
 * come from that class in global.css.
 */
const withDuoTheme: Decorator = (Story) => (
	<PersonPairProvider className="theme-sage-blush flex-1 bg-bg p-5">
		<Story />
	</PersonPairProvider>
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
