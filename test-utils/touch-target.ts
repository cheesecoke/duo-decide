import type { Insets } from "react-native";

/** The minimum touch target (Apple HIG; WCAG 2.5.5), in pt. */
export const MIN_TOUCH_TARGET = 44;

/**
 * How big a press target is along its narrower axis once `hitSlop` is added:
 * the visual size plus the slop on both sides. A number slop applies to all
 * four edges; an `Insets` slop is checked on its narrowest pair.
 */
export function touchReach(size: number, hitSlop: number | Insets | null | undefined): number {
	if (hitSlop == null) return size;
	if (typeof hitSlop === "number") return size + 2 * hitSlop;
	const horizontal = (hitSlop.left ?? 0) + (hitSlop.right ?? 0);
	const vertical = (hitSlop.top ?? 0) + (hitSlop.bottom ?? 0);
	return size + Math.min(horizontal, vertical);
}
