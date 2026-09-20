import { cva } from "class-variance-authority";
import * as React from "react";
import { Pressable, View } from "react-native";

import { Text, TextClassContext } from "@/components/ui/reusables/text/text";
import { cn } from "@/lib/utils";

/**
 * PillPair — two fused pills sharing one track, split by a notch cut out of
 * the seam (design-refs/fintech-pill-clusters.webp; the round-1 mock's
 * "Lock my vote | Simulate Sam" control).
 *
 * The halves are two independent actions, not two values of one field, so each
 * carries its own handler and `role="button"`. `selected` only says which side
 * currently reads as chosen.
 *
 * The notch is a circle centred on the seam rather than a gap between two
 * views: that keeps the track a single unbroken shape, so the seam stays at the
 * midpoint no matter how the labels wrap. It has to be painted in whatever sits
 * *behind* the control to read as a cut-out, so `notchClassName` defaults to
 * `bg-surface` (the control lives on a card) and callers placing it straight on
 * the page background pass `bg-bg`.
 */

const halfVariants = cva("flex-1 items-center justify-center self-stretch px-4 py-2", {
	variants: {
		person: { a: "", b: "" },
		selected: { true: "", false: "" },
	},
	compoundVariants: [
		{ person: "a", selected: true, className: "bg-person-a-tint" },
		{ person: "b", selected: true, className: "bg-person-b-tint" },
	],
	defaultVariants: { person: "a", selected: false },
});

// Body type from tokens.md §5 (16/22) at 600, per the PLAN-3 type ruling.
const halfTextVariants = cva("text-center text-[16px] font-semibold leading-[22px] text-ink", {
	variants: {
		person: { a: "", b: "" },
		selected: { true: "", false: "" },
	},
	compoundVariants: [
		{ person: "a", selected: true, className: "text-person-a-deep" },
		{ person: "b", selected: true, className: "text-person-b-deep" },
	],
	defaultVariants: { person: "a", selected: false },
});

type PillSide = "left" | "right";

type PillHalf = {
	label: string;
	onPress?: () => void;
	disabled?: boolean;
	person?: "a" | "b";
};

type PillPairProps = {
	left: PillHalf;
	right: PillHalf;
	selected?: PillSide | null;
	/** Colour of the seam cut-out — match whatever is behind the control. */
	notchClassName?: string;
	className?: string;
};

function Half({ half, side, selected }: { half: PillHalf; side: PillSide; selected: boolean }) {
	const person = half.person ?? (side === "left" ? "a" : "b");
	const disabled = half.disabled ?? false;

	return (
		<TextClassContext.Provider value={halfTextVariants({ person, selected })}>
			<Pressable
				role="button"
				accessibilityLabel={half.label}
				accessibilityState={{ selected, disabled }}
				disabled={disabled}
				// Also removes the half from the hit-test tree, so a disabled
				// side cannot swallow a press aimed at the track.
				pointerEvents={disabled ? "none" : undefined}
				onPress={half.onPress}
				className={cn(halfVariants({ person, selected }), disabled && "opacity-40")}
			>
				<Text>{half.label}</Text>
			</Pressable>
		</TextClassContext.Provider>
	);
}

function PillPair({
	left,
	right,
	selected = null,
	notchClassName = "bg-surface",
	className,
}: PillPairProps) {
	return (
		<View
			className={cn(
				// `min-h-12` rather than `h-12`: the track is 48 px tall at the
				// design's label lengths but grows instead of clipping when a
				// label wraps. The notch is centred, so it follows.
				"relative min-h-12 w-full flex-row items-stretch overflow-hidden rounded-chip bg-surface-2",
				className,
			)}
		>
			<Half half={left} side="left" selected={selected === "left"} />
			<Half half={right} side="right" selected={selected === "right"} />
			<View
				pointerEvents="none"
				// 10 px circle, pulled back by half its size so its centre sits
				// exactly on the seam at 50%.
				className={cn(
					"absolute left-1/2 top-1/2 -ml-[5px] -mt-[5px] h-2.5 w-2.5 rounded-chip",
					notchClassName,
				)}
			/>
		</View>
	);
}

export { PillPair, halfTextVariants, halfVariants };
export type { PillHalf, PillPairProps, PillSide };
