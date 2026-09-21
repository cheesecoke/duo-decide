import type { ReactElement } from "react";

import { IconHouseChimney, type IconProps } from "@/assets/icons/IconHouseChimney";
import { IconListPlus } from "@/assets/icons/IconListPlus";
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
 *
 * History and Options swapped glyphs on 2026-09-21. Phosphor's `Queue` —
 * stacked lines with a play triangle — reads as "replay", which is History's
 * job, not Options'; Options is where a list gets added to, so it takes
 * `ListPlus`, where the mark next to the lines is a plus.
 */

type TabScreen = {
	/** Route file name inside the `(tabs)` group. */
	name: string;
	/**
	 * The tab's name. Tabs are icon-only, so it is never drawn: the adapter
	 * reads it off `options.title` and `TabBar` spends it on the tab's
	 * `accessibilityLabel`.
	 */
	title: string;
	/** Icon components accept passthrough props beyond `IconProps`, hence the intersection. */
	Icon: (props: IconProps & Record<string, unknown>) => ReactElement;
};

/**
 * Queue, then Options, then History: home is where you act, Options is what
 * you reach for next, and History — "this is what we've all completed" —
 * closes the bar (Chase, 2026-09-21).
 */
const TAB_SCREENS: TabScreen[] = [
	{ name: "index", title: "Queue", Icon: IconHouseChimney },
	{ name: "options", title: "Options", Icon: IconListPlus },
	{ name: "history", title: "History", Icon: IconQueue },
];

export { TAB_SCREENS };
export type { TabScreen };
