import * as React from "react";
import { View } from "react-native";
import { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { AnimatedView } from "@/components/ui/reusables/animated/animated";
import { Card } from "@/components/ui/reusables/card/card";
import { Body } from "@/components/ui/reusables/headline/headline";
import { Text } from "@/components/ui/reusables/text/text";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import { DUR } from "@/theme/motion";

import { CardHeader } from "./card-header";
import { DecideButton } from "./decide-button";
import {
	isCreator as isCreatorOf,
	optionsDisabled,
	partnerOf,
	resolveBadge,
	resolveCta,
	resolveRoundTone,
	voterMark,
	type DecisionCardProps,
} from "./decision-card.model";
import { EditBody } from "./edit-body";
import { OptionChips } from "./option-chips";
import { PollRound } from "./poll-round";

/**
 * DecisionCard — the whole of FEATURE-INVENTORY §1.10a on the v2 primitives,
 * and **pure**: every piece of decision data arrives as a prop and every
 * action leaves as a callback. No hooks, no Supabase, no AsyncStorage. The
 * screen wires it up (PLAN-3 task 7).
 *
 * What it decides, it decides in `decision-card.model.ts`; this file is only
 * the arrangement. Three things worth knowing before reading it:
 *
 * **The round-colour thread** (tokens.md §10). One hue per poll round —
 * R1 = A, R2 = B, R3 = both — carried along exactly four elements: the round
 * label (`PollRound`), the segment indicator (`CardHeader`), the selected
 * option chip's fill (`OptionChips`), and the lock-in end-cap
 * (`DecideButton`). Nothing else takes it; the badge, the meta line and the
 * body text stay on the neutral ramp, and the card's own rail and wash come
 * from `Card` reading the same tone.
 *
 * **Collapsed is header-only** (CollapsibleCard.tsx:204). The round-3 mock
 * keeps the voter row visible on a collapsed card; the inventory wins.
 *
 * **The inline-edit draft is view state, not decision state.** `editing` is
 * still a prop — the screen decides whether the card is in edit mode — and
 * the draft only exists between entering edit mode and `onSaveEdit`.
 */

/**
 * The expanded body opening — height and opacity together (tokens.md §10:
 * "card expand height + chevron rotate").
 *
 * ## Why not `entering={FadeIn}` / `layout={LinearTransition}`
 *
 * Reanimated's layout animations are the one part of the library nothing else
 * in this design system uses, and a cold headless web load was observed
 * painting the header with the body still at opacity 0. A fade that fails to
 * run leaves the body *permanently invisible*, which is a much worse failure
 * than no animation at all. A shared value driven from an effect is the
 * pattern Card, Chip, Gauge and TabBar already use, it lands on its target
 * even with the worklet plugin off, and under reduce-motion it starts there.
 *
 * ## Why the height is only borrowed
 *
 * The height is measured once, on the body's first layout, and animated from
 * 0 to that value — there is no RN equivalent of the mock's
 * `grid-template-rows` transition. Holding a fixed height forever would be a
 * bug: the body really does change size after it opens (a validation line
 * appears when the options drop below two, the voter row rewraps), and a card
 * pinned to its opening height would clip. So the measured height is released
 * once the animation's own duration has elapsed and the wrapper goes back to
 * `auto`. Before the first measurement it is `auto` too, so no path through
 * here can collapse the body.
 */
function Reveal({ testID, children }: { testID: string; children: React.ReactNode }) {
	const reducedMotion = useReducedMotion();
	const [height, setHeight] = React.useState<number | null>(null);
	const [settled, setSettled] = React.useState(reducedMotion);
	const progress = useSharedValue(reducedMotion ? 1 : 0);

	React.useEffect(() => {
		if (reducedMotion) {
			progress.value = 1;
			setSettled(true);
			return;
		}
		progress.value = withTiming(1, { duration: DUR.base });
		const release = setTimeout(() => setSettled(true), DUR.base);
		return () => clearTimeout(release);
	}, [reducedMotion, progress]);

	const clip = !settled && height !== null;

	// `settled` is the safety valve, and it is a plain JS timer rather than an
	// animation callback on purpose: whatever the animated value is doing —
	// stalled, throttled, never started — the body is fully open and fully
	// opaque one `dur.base` after it mounted. Nothing here can strand it.
	//
	// The dependency array is required, not optional: Reanimated's Babel plugin
	// does not run in Storybook's vite pipeline (see .storybook/main.ts).
	const style = useAnimatedStyle(
		() =>
			settled
				? { opacity: 1 }
				: {
						opacity: progress.value,
						// Before the first measurement the height is auto, so the
						// body is never clipped by a number nobody has taken yet.
						...(height === null ? null : { height: progress.value * height }),
					},
		[settled, height, progress],
	);

	return (
		<AnimatedView testID={testID} style={style} className={cn("mt-4", clip && "overflow-hidden")}>
			<View
				onLayout={(event) => {
					const measured = event.nativeEvent.layout.height;
					setHeight((current) => current ?? measured);
				}}
			>
				{children}
			</View>
		</AnimatedView>
	);
}

function DecisionCard(props: DecisionCardProps) {
	const {
		title,
		description,
		mode,
		currentRound,
		options,
		deadline,
		createdBy,
		you,
		status,
		expanded,
		editing,
		error,
		onToggle,
		onOptionSelect,
		onDecide,
		onEdit,
		onCancelEdit,
		onSaveEdit,
		onDelete,
	} = props;

	const partner = partnerOf(props);
	const isCreator = isCreatorOf(props);
	const roundTone = resolveRoundTone(mode, currentRound, status, you.person);
	const cta = resolveCta(props);
	const badge = resolveBadge(props);
	const disabled = optionsDisabled(props);

	/**
	 * `Chip` is a two-person component — it has no `together` fill — so round
	 * 3 borrows person A's. Deliberately A rather than the viewer's own hue:
	 * the thread has to read the same on both phones.
	 */
	const chipPerson: "a" | "b" = mode === "poll" ? (currentRound === 2 ? "b" : "a") : you.person;

	// Seeded from the props every time the card enters edit mode, through a
	// ref so the effect does not re-seed — and throw away what is being typed
	// — whenever the parent hands down a fresh options array.
	const seed = React.useCallback(
		() => ({ title, description, options: options.map((option) => option.title) }),
		[title, description, options],
	);
	const seedRef = React.useRef(seed);
	seedRef.current = seed;
	const [draft, setDraft] = React.useState(seed);

	React.useEffect(() => {
		if (editing) setDraft(seedRef.current());
	}, [editing]);

	const handleSave = () =>
		onSaveEdit({
			title: draft.title.trim(),
			description: draft.description.trim(),
			// No date picker in the card — see edit-body.tsx.
			deadline,
			// A blank row is a row somebody started and abandoned, which is
			// how CreateDecisionForm treats it too.
			options: draft.options.map((option) => option.trim()).filter(Boolean),
		});

	return (
		<Card state={roundTone} role="group" accessibilityLabel={title}>
			<CardHeader
				title={title}
				mode={mode}
				round={currentRound}
				tone={roundTone}
				badge={badge}
				createdBy={createdBy}
				deadline={deadline}
				expanded={expanded}
				editing={editing}
				canEdit={isCreator && status === "pending"}
				isCreator={isCreator}
				draftTitle={draft.title}
				onDraftTitle={(value) => setDraft((current) => ({ ...current, title: value }))}
				onToggle={onToggle}
				onEdit={onEdit}
				onCancelEdit={onCancelEdit}
				onSave={handleSave}
				onDelete={onDelete}
			/>

			{error ? (
				<View testID="decision-card-error" className="mt-3 rounded-card bg-destructive px-3.5 py-2.5">
					<Text className="text-center text-[13px] font-medium leading-[18px] text-destructive-foreground">
						{error}
					</Text>
				</View>
			) : null}

			{editing ? (
				<Reveal testID="decision-card-edit">
					<EditBody
						description={draft.description}
						options={draft.options}
						onDescription={(value) => setDraft((current) => ({ ...current, description: value }))}
						onOption={(index, value) =>
							setDraft((current) => ({
								...current,
								options: current.options.map((option, i) => (i === index ? value : option)),
							}))
						}
						onRemoveOption={(index) =>
							setDraft((current) => ({
								...current,
								options: current.options.filter((_, i) => i !== index),
							}))
						}
						onAddOption={() => setDraft((current) => ({ ...current, options: [...current.options, ""] }))}
					/>
				</Reveal>
			) : null}

			{expanded && !editing ? (
				<Reveal testID="decision-card-body">
					<Body className="text-ink-2">{description}</Body>
					<View className="my-3.5 h-px bg-line" />

					{mode === "poll" ? (
						<View className="mb-3.5">
							<PollRound
								round={currentRound}
								tone={roundTone}
								you={you}
								youMark={voterMark(props, "you")}
								partner={partner}
								partnerMark={voterMark(props, "partner")}
							/>
						</View>
					) : null}

					<OptionChips
						options={options}
						mode={mode}
						disabled={disabled}
						person={chipPerson}
						onSelect={onOptionSelect}
					/>

					<DecideButton
						cta={cta}
						roundTone={roundTone}
						showEndCap={mode === "poll"}
						onPress={onDecide}
					/>
				</Reveal>
			) : null}
		</Card>
	);
}

export { DecisionCard };
