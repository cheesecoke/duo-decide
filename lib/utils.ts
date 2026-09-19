import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge only knows Tailwind's stock scales, so a Duo radius token
 * (`rounded-button`) would not be recognised as conflicting with a stock one
 * (`rounded-md`) and both would survive — leaving CSS source order to decide.
 * Teaching it the tokens.md §4 radii makes last-one-wins work as expected.
 */
const twMerge = extendTailwindMerge({
	extend: {
		classGroups: {
			rounded: [
				{
					rounded: ["chip", "button", "card", "tile", "sheet", "tab-active"],
				},
			],
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
