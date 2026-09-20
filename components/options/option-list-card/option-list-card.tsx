import * as React from "react";
import { Pressable, View } from "react-native";
import { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { IconTrashCan } from "@/assets/icons/IconTrashCan";
import {
	EditableOptions,
	type EditableOption,
} from "@/components/options/editable-options/editable-options";
import { AnimatedView } from "@/components/ui/reusables/animated/animated";
import { Card, type CardState } from "@/components/ui/reusables/card/card";
import { CircleButton } from "@/components/ui/reusables/circle-button/circle-button";
import { Caption, Title } from "@/components/ui/reusables/headline/headline";
import { ChevronGlyph, IconButton } from "@/components/ui/reusables/icon-button/icon-button";
import { Reveal } from "@/components/ui/reusables/reveal/reveal";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import { DUR } from "@/theme/motion";
import { NEUTRAL } from "@/theme/neutrals";

/**
 * OptionListCard — FEATURE-INVENTORY §1.11's `CollapsibleListCard`, on the v2
 * primitives, and **pure**: the list arrives as a prop, every action leaves as
 * a callback, and the two things the card cannot know for itself — whose card
 * this is and whether this viewer may delete it — arrive as `state` and
 * `canDelete` from the screen.
 *
 * **Whose card is it** (tokens.md §10, "the card's rail and wash follow the
 * person state"). A list has no votes, so the seat it wears is its *creator's*:
 * `"a"` when the signed-in user made it, `"b"` when their partner did,
 * `"neutral"` when the creator is unknown — every list made before
 * `creator_id` existed. The screen does that mapping and is tested on it;
 * this file just wears the answer.
 *
 * The old card led with a filled yellow `IconListDashes`. It is dropped: the
 * rail already says whose list this is in a colour that means something, and
 * a second decoration in a colour that means nothing would fight it.
 *
 * The body opens inside `Reveal` (`reusables/reveal/`), which this file used
 * to carry a private copy of — hoisted in the PLAN-3 final fix round (I4).
 */

interface OptionListCardProps {
	list: {
		id: string;
		title: string;
		description: string;
		options: EditableOption[];
		expanded: boolean;
	};
	/** The creator's seat — computed by the screen. `Card` wears it. */
	state: Extract<CardState, "neutral" | "a" | "b">;
	/** §1.11: the trash circle exists only for the list's creator. */
	canDelete: boolean;
	onToggle: () => void;
	onDelete: () => void;
	onOptionsUpdate: (options: EditableOption[]) => void;
}

const CHEVRON_TURN = 180;

/** §1.11's meta line. Singular, plural, and the honest zero. */
function optionCount(count: number): string {
	if (count === 0) return "No options yet";
	if (count === 1) return "1 option";
	return `${count} options`;
}

function OptionListCard({
	list,
	state,
	canDelete,
	onToggle,
	onDelete,
	onOptionsUpdate,
}: OptionListCardProps) {
	const reducedMotion = useReducedMotion();
	const { expanded } = list;

	const turn = useSharedValue(expanded ? CHEVRON_TURN : 0);
	React.useEffect(() => {
		const next = expanded ? CHEVRON_TURN : 0;
		turn.value = reducedMotion ? next : withTiming(next, { duration: DUR.base });
	}, [expanded, reducedMotion, turn]);

	const chevronStyle = useAnimatedStyle(
		() => ({ transform: [{ rotate: `${turn.value}deg` }] }),
		[turn],
	);

	return (
		<Card state={state} role="group" accessibilityLabel={list.title}>
			{/*
			 * The whole header row is the tap target, but only the chevron is a
			 * *named* control: the row carries no role and no label, so assistive
			 * tech sees exactly one button here ("Expand" / "Collapse") instead of
			 * two overlapping ones with the same job. The card itself stays inert
			 * — the expanded body has controls of its own.
			 */}
			<Pressable onPress={onToggle} className="flex-row items-start gap-2.5">
				<View className="min-w-0 flex-1 gap-1">
					{/* tokens.md §10 eye flow: a collapsed card is quieter. */}
					<Title className={cn(!expanded && "text-ink-2")}>{list.title}</Title>

					{/* An empty description renders nothing at all, not a blank line. */}
					{list.description ? (
						<Caption testID="option-list-card-description" className="text-ink-2">
							{list.description}
						</Caption>
					) : null}

					<Caption className="text-ink-3">{optionCount(list.options.length)}</Caption>
				</View>

				<IconButton
					label={expanded ? "Collapse" : "Expand"}
					accessibilityState={{ expanded }}
					onPress={onToggle}
				>
					<AnimatedView style={chevronStyle}>
						<ChevronGlyph />
					</AnimatedView>
				</IconButton>
			</Pressable>

			<Reveal testID="option-list-card-body" open={expanded}>
				<View className="mb-3.5 h-px bg-line" />

				<EditableOptions
					options={list.options}
					onOptionsUpdate={onOptionsUpdate}
					emptyMessage="No options in this list yet. Tap the edit button to add some!"
				/>

				{canDelete ? (
					<View className="mt-4 flex-row justify-end">
						<CircleButton label="Delete list" onPress={onDelete}>
							<IconTrashCan size={16} color={NEUTRAL.destructive} />
						</CircleButton>
					</View>
				) : null}
			</Reveal>
		</Card>
	);
}

export { OptionListCard, optionCount };
export type { OptionListCardProps };
