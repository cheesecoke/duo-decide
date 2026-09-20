import type { ReactElement } from "react";

import { IconHouseChimney, type IconProps } from "@/assets/icons/IconHouseChimney";
import { IconList } from "@/assets/icons/IconList";
import { IconQueue } from "@/assets/icons/IconQueue";

/**
 * What the bottom tab bar shows, and in what order.
 *
 * Plain data, and deliberately NOT a file inside `app/`: expo-router turns
 * every `.ts`/`.tsx` under the app directory into a route, so a `tabs.ts`
 * sitting next to `_layout.tsx` would register a junk `/tabs` route with no
 * default export. Out here it stays importable from a test without standing
 * up the navigator, which is the point — `app/(protected)/(tabs)/_layout.tsx`
 * maps it into `<Tabs.Screen>`s.
 */

type TabScreen = {
	/** Route file name inside the `(tabs)` group. */
	name: string;
	/** The tab's label — the tab bar adapter reads it off `options.title`. */
	title: string;
	/** Icon components accept passthrough props beyond `IconProps`, hence the intersection. */
	Icon: (props: IconProps & Record<string, unknown>) => ReactElement;
};

const TAB_SCREENS: TabScreen[] = [
	{ name: "index", title: "Queue", Icon: IconHouseChimney },
	{ name: "history", title: "History", Icon: IconList },
	{ name: "options", title: "Options", Icon: IconQueue },
];

export { TAB_SCREENS };
export type { TabScreen };
