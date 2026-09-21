import * as React from "react";
import { Pressable, View } from "react-native";
import { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import {
	EditableOptions,
	type EditableOption,
} from "@/components/options/editable-options/editable-options";
import { AnimatedView } from "@/components/ui/reusables/animated/animated";
import {
	CardMenu,
	CardMenuTrigger,
	TrashGlyph,
	useCardMenu,
} from "@/components/ui/reusables/card-menu/card-menu";
import { Card, type CardState } from "@/components/ui/reusables/card/card";
import { Caption, Title } from "@/components/ui/reusables/headline/headline";
import { ChevronGlyph, IconButton } from "@/components/ui/reusables/icon-button/icon-button";
import { Reveal } from "@/components/ui/reusables/reveal/reveal";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import { DUR } from "@/theme/motion";

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
 * Delete is behind the header's `⋯` overflow (`reusables/card-menu`), which
 * is where the queue's cards keep theirs. It used to be a bare trash circle
 * at the foot of the open body — a second delete gesture, on a card that
 * otherwise reads like a decision card, for no reason but that it was written
 * second (tweak T3).
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
	/** §1.11: the delete item exists only for the list's creator. */
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
	const menu = useCardMenu();
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

	/*
	 * The wrapper exists for the menu alone. `Card` clips to its own rounded
	 * corners so its rail and wash cannot spill, which also clips anything
	 * absolutely positioned inside it — and this card gets short: a list with
	 * no description is 88 px tall and the panel is 52 px at an offset of 52.
	 * Sitting beside the card rather than in it, the panel measures against
	 * the same box (the wrapper is exactly the card's size) and survives.
	 */
	return (
		<View className="relative">
			<Card state={state} role="group" accessibilityLabel={list.title}>
				{/*
				 * The whole header row is the tap target, but only the chevron is a
				 * *named* control: the row carries no role and no label, so assistive
				 * tech sees exactly one button here ("Expand" / "Collapse") instead of
				 * two overlapping ones with the same job. The card itself stays inert
				 * — the expanded body has controls of its own.
				 *
				 * `tabIndex={-1}` finishes that thought on web. React Native Web
				 * gives every Pressable `tabIndex=0` whether or not it has a name,
				 * so without this the row is a keyboard stop that announces nothing
				 * — Tab lands on it, a screen reader says "clickable" and no more,
				 * and the very next Tab reaches the chevron that does the same job
				 * and says its name. It stays a mouse and touch target; it just
				 * stops being a place the keyboard can strand you.
				 */}
				<Pressable
					testID="option-list-card-header"
					tabIndex={-1}
					onPress={onToggle}
					className="flex-row items-start gap-2.5"
				>
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

					{/*
					 * Both of these are nested pressables, so a tap on either is
					 * theirs alone — the touch responder hands it to the innermost
					 * one and the row never sees it. That is how the chevron has
					 * always avoided double-firing `onToggle`; the overflow sits in
					 * the same cluster and inherits it.
					 */}
					{canDelete ? <CardMenuTrigger menu={menu} /> : null}

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
				</Reveal>
			</Card>

			{/*
			 * The panel, beside the card rather than in it (see above) and
			 * outside the header row: a child of the 30 px trigger could not
			 * float over the body below it.
			 */}
			<CardMenu
				menu={menu}
				testID="option-list-card-menu"
				items={[
					// Copy unchanged from the trash circle this replaces.
					{ label: "Delete list", destructive: true, icon: <TrashGlyph />, onPress: onDelete },
				]}
			/>
		</View>
	);
}

export { OptionListCard, optionCount };
export type { OptionListCardProps };
