import * as React from "react";
import { Pressable } from "react-native";

import { IconUnfoldLess } from "@/assets/icons/IconUnfoldLess";
import { IconUnfoldMore } from "@/assets/icons/IconUnfoldMore";
import { NEUTRAL } from "@/theme/neutrals";

/**
 * The collapse-all / expand-all circle that sits beside a tab's eyebrow.
 *
 * Both card tabs have one and they were the same nine lines twice (PLAN-3
 * final review M5). The rule it carries is the part worth having in one
 * place: **the label says what the press will do, not what the screen is**.
 * Everything is open, so the button says "Collapse all"; everything is
 * collapsed, so it says "Expand all". A control named after the current state
 * is the classic way to make a screen reader announce the opposite of what
 * happens.
 *
 * A `Pressable` rather than `CircleButton`: this one is 36 px and flat on the
 * page background, where `CircleButton` is 34 px on `surface` with
 * `shadow.card`. It is a quiet affordance next to an eyebrow, not a floating
 * control.
 */
function CollapseAllButton({
	allCollapsed,
	onPress,
}: {
	allCollapsed: boolean;
	onPress: () => void;
}) {
	return (
		<Pressable
			role="button"
			accessibilityLabel={allCollapsed ? "Expand all" : "Collapse all"}
			onPress={onPress}
			className="h-9 w-9 items-center justify-center rounded-chip bg-surface"
		>
			{allCollapsed ? (
				<IconUnfoldMore size={20} color={NEUTRAL.ink2} />
			) : (
				<IconUnfoldLess size={20} color={NEUTRAL.ink2} />
			)}
		</Pressable>
	);
}

export { CollapseAllButton };
