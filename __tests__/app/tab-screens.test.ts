import { IconHouseChimney } from "@/assets/icons/IconHouseChimney";
import { IconListPlus } from "@/assets/icons/IconListPlus";
import { IconQueue } from "@/assets/icons/IconQueue";
import { TAB_SCREENS } from "@/components/layout/tab-screens";

/**
 * `app/(protected)/(tabs)/_layout.tsx` maps this straight into `<Tabs.Screen>`s,
 * so order and labels are asserted here rather than by rendering the navigator
 * — expo-router's `Tabs` is mocked in this environment and lays nothing out.
 */
describe("TAB_SCREENS", () => {
	it("lists the tabs home first, History last", () => {
		expect(TAB_SCREENS.map((tab) => tab.name)).toEqual(["index", "options", "history"]);
	});

	it("labels them Queue, Options and History", () => {
		expect(TAB_SCREENS.map((tab) => tab.title)).toEqual(["Queue", "Options", "History"]);
	});

	it("gives every tab an icon", () => {
		for (const tab of TAB_SCREENS) {
			expect(typeof tab.Icon).toBe("function");
		}
	});

	// The bar is icon-only, so the glyph is the whole label. History takes
	// the stacked-lines-and-triangle `Queue` mark, which reads as replay;
	// Options takes `ListPlus`, where the mark is a plus rather than a
	// triangle, because Options is where a list gets added to.
	it("maps each tab to its icon", () => {
		expect(TAB_SCREENS.map((tab) => tab.Icon)).toEqual([IconHouseChimney, IconListPlus, IconQueue]);
	});
});
