import { TAB_SCREENS } from "@/components/layout/tab-screens";

/**
 * `app/(protected)/(tabs)/_layout.tsx` maps this straight into `<Tabs.Screen>`s,
 * so order and labels are asserted here rather than by rendering the navigator
 * — expo-router's `Tabs` is mocked in this environment and lays nothing out.
 */
describe("TAB_SCREENS", () => {
	it("lists the tabs in the mock's order", () => {
		expect(TAB_SCREENS.map((tab) => tab.name)).toEqual(["index", "history", "options"]);
	});

	it("labels them Queue, History and Options", () => {
		expect(TAB_SCREENS.map((tab) => tab.title)).toEqual(["Queue", "History", "Options"]);
	});

	it("gives every tab an icon", () => {
		for (const tab of TAB_SCREENS) {
			expect(typeof tab.Icon).toBe("function");
		}
	});
});
