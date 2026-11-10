import { render, screen } from "@testing-library/react-native";
import * as React from "react";
import { Platform } from "react-native";

import { FIXED_FOOTER_HEIGHT, FixedFooter } from "@/components/layout/FixedFooter";
import { FooterPill } from "@/components/layout/footer-pill";
import { TAB_BAR_HEIGHT, TabBar } from "@/components/ui/reusables/tab-bar/tab-bar";
import {
	compileNativeCss,
	METRO_INLINE_REM,
	nativeStyleOf,
	type NativeRule,
} from "@/test-utils/native-css";
import { NATIVE_REM, REM } from "@/theme/rem";

/**
 * The room a screen reserves for a floating bar has to be the bar's real
 * height on iOS, not its web height.
 *
 * `TAB_BAR_HEIGHT` and `FIXED_FOOTER_HEIGHT` are numbers because they feed a
 * plain style object (the tab scene's padding, `ContentLayout footerInset`),
 * but the bars they stand for are drawn by rem classes (`h-14`, `py-2.5`).
 * NativeWind's rem is 14 on native and 16 on web, so a hard-coded `56`
 * reserved 7 pt too much on iOS (and the footer's `76`, 9.5 pt).
 *
 * Each bar is rendered, its own className read back, and that compiled for
 * iOS the way Metro compiles it (test-utils/native-css.ts: same options, same
 * `inlineRem`, read from metro.config.js). The constants must equal what
 * comes out. Changing `inlineRem`, or a bar's height or padding classes,
 * without the constant fails here.
 */

let rules: Record<string, NativeRule>;
let tabBarClasses: string;
let footerClasses: string;
let pillClasses: string;

beforeAll(async () => {
	render(
		<TabBar
			tabs={[{ key: "queue", label: "Queue", icon: () => null }]}
			activeKey="queue"
			onChange={() => {}}
		/>,
	);
	tabBarClasses = screen.getByTestId("tab-bar").props.className;
	screen.unmount();

	render(
		<FixedFooter>
			<FooterPill label="New decision" onPress={() => {}} />
		</FixedFooter>,
	);
	const tree = screen.toJSON();
	if (!tree || Array.isArray(tree)) throw new Error("FixedFooter should render one root view");
	footerClasses = tree.props.className;
	pillClasses = screen.getByLabelText("New decision").props.className;
	screen.unmount();

	({ rules } = await compileNativeCss({
		content: [{ raw: [tabBarClasses, footerClasses, pillClasses].join(" ") }],
	}));
}, 30_000);

function iosHeight(classes: string) {
	const style = nativeStyleOf(rules, classes);
	expect(typeof style.height).toBe("number");
	return style.height as number;
}

function iosPaddingY(classes: string) {
	const style = nativeStyleOf(rules, classes);
	const top = style.paddingTop ?? style.paddingVertical ?? style.padding;
	const bottom = style.paddingBottom ?? style.paddingVertical ?? style.padding;
	expect(typeof top).toBe("number");
	expect(typeof bottom).toBe("number");
	return (top as number) + (bottom as number);
}

it("runs as iOS, with theme/rem.ts on the rem Metro compiles with", () => {
	expect(Platform.OS).toBe("ios");
	expect(NATIVE_REM).toBe(METRO_INLINE_REM);
	expect(REM).toBe(METRO_INLINE_REM);
});

it("TAB_BAR_HEIGHT is the tab bar's compiled iOS height", () => {
	expect(tabBarClasses).toContain("h-14");
	expect(iosHeight(tabBarClasses)).toBe(49);
	expect(TAB_BAR_HEIGHT).toBe(iosHeight(tabBarClasses));
});

it("FIXED_FOOTER_HEIGHT is the footer pill plus the bar's vertical padding on iOS", () => {
	expect(pillClasses).toContain("h-14");
	expect(footerClasses).toContain("py-2.5");
	const compiled = iosHeight(pillClasses) + iosPaddingY(footerClasses);

	expect(compiled).toBe(49 + 2 * 8.75);
	expect(FIXED_FOOTER_HEIGHT).toBe(compiled);
});
