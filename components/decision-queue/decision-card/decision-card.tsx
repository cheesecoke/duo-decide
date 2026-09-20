import * as React from "react";
import { View } from "react-native";
import { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { AnimatedView } from "@/components/ui/reusables/animated/animated";
import { Card } from "@/components/ui/reusables/card/card";
import { Body } from "@/components/ui/reusables/headline/headline";
import { Text } from "@/components/ui/reusables/text/text";
import { useReducedMotion } from "@/hooks/useReducedMotion";
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
 * The expanded body, fading up as the card's height opens under it
 * (tokens.md §10: "card expand height + chevron rotate").
 *
 * An animated shared value rather than Reanimated's `entering={FadeIn}`: the
 * layout-animation path is the one piece of Reanimated nothing else in this
 * design system uses, and a cold web load was observed painting the header
 * with the body still at opacity 0 — a fade that fails to run leaves the body
 * permanently invisible. A shared value driven from an effect is the pattern
 * Card, Chip, Gauge and TabBar already use here, it lands on 1 even with the
 * worklet plugin off, and under reduce-motion it starts there.
 */
function Reveal({ testID, children }: { testID: string; children: React.ReactNode }) {
	const reducedMotion = useReducedMotion();
	const opacity = useSharedValue(reducedMotion ? 1 : 0);

	React.useEffect(() => {
		opacity.value = reducedMotion ? 1 : withTiming(1, { duration: DUR.base });
	}, [reducedMotion, opacity]);

	// The dependency array is required, not optional: Reanimated's Babel plugin
	// does not run in Storybook's vite pipeline (see .storybook/main.ts).
	const style = useAnimatedStyle(() => ({ opacity: opacity.value }), [opacity]);

	return (
		<AnimatedView testID={testID} style={style} className="mt-4">
			{children}
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
