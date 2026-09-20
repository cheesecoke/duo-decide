import "../global.css";

import * as React from "react";

import type { Decorator, Preview } from "@storybook/react-native-web-vite";

import { PersonPairProvider } from "../theme/PersonPairProvider";

/**
 * Every story renders inside the default person pair (sage + blush), through
 * the same provider the app uses — so a story exercises the real wiring rather
 * than a Storybook-only copy of it.
 *
 * The provider is the whole channel on both platforms: NativeWind's `vars()`
 * emits inline custom properties on web too (react-native-web preserves `--`
 * keys on the style object). `theme-sage-blush` from global.css sets the same
 * six properties on the same element — redundant belt-and-braces against a
 * `vars()` regression, not "the web channel".
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
