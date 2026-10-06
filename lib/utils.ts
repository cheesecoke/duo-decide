import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge only knows Tailwind's stock scales, so a Duo radius token
 * (`rounded-button`) would not be recognised as conflicting with a stock one
 * (`rounded-md`) and both would survive — leaving CSS source order to decide.
 * Teaching it the tokens.md §4 radii makes last-one-wins work as expected.
 *
 * `text-row` (tokens.md §5) has a sharper failure mode than a survivor: an
 * unknown `text-*` class falls into tailwind-merge's *colour* group, so
 * `cn("text-row text-ink", "text-ink-2")` would treat the size as a colour
 * being overridden and drop it — a 15 px row silently rendering at 16 px.
 * Declaring it in `font-size` puts it in the right group.
 */
const twMerge = extendTailwindMerge({
	extend: {
		classGroups: {
			rounded: [
				{
					rounded: ["chip", "button", "card", "tile", "sheet", "tab-active", "field"],
				},
			],
			"font-size": [{ text: ["row"] }],
		},
	},
});

/**
 * Merge Tailwind/NativeWind class strings, last-one-wins on conflicts.
 * Based on React Native Reusables (packages/registry/src/nativewind/lib/utils.ts).
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
