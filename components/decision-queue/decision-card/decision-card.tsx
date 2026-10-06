import * as React from "react";
import { View } from "react-native";

import { Card } from "@/components/ui/reusables/card/card";
import { Body } from "@/components/ui/reusables/headline/headline";
import { Reveal } from "@/components/ui/reusables/reveal/reveal";
import { Text } from "@/components/ui/reusables/text/text";

import { CardHeader } from "./card-header";
import { DecideButton } from "./decide-button";
import {
	isCreator as isCreatorOf,
	optionsDisabled,
	partnerOf,
	resolveBadge,
	resolveCardState,
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
 *
 * The body and the edit form each open inside a `Reveal`
 * (`reusables/reveal/`), rendered unconditionally so the close can animate.
 */

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
	const cta = resolveCta(props);
	const badge = resolveBadge(props);
	const disabled = optionsDisabled(props);

	/** Whose card this is — what `Card`, the badge and a vote CTA wear. */
	const cardState = resolveCardState(props);
	/** Which round this is — the poll-only thread; `neutral` on a vote card. */
	const roundTone = resolveRoundTone(mode, currentRound, status);
	/**
	 * The thread's colour where a poll card has one. A vote card has no round,
	 * so the two places that would have used it fall back to the person state
	 * (the segment indicator here; the chip fill below).
	 */
	const threadTone = mode === "poll" ? roundTone : cardState;

	/**
	 * `Chip` is a two-person component — it has no `together` fill — so round
	 * 3 borrows person A's. Deliberately A rather than the viewer's own hue:
	 * the thread has to read the same on both phones. A vote card follows
	 * whoever has acted, and falls back to the viewer before anyone has.
	 */
	const chipPerson: "a" | "b" =
		mode === "poll"
			? currentRound === 2
				? "b"
				: "a"
			: cardState === "a" || cardState === "b"
				? cardState
				: you.person;

	/**
	 * FEATURE-INVENTORY §1.10a (CollapsibleCard.tsx:136-147): starting an edit
	 * force-expands the card. So editing is open, whatever `expanded` says —
	 * otherwise the edit form renders under a collapsed, quiet header.
	 */
	const open = expanded || editing;

	// Seeded from the props every time the card enters edit mode, through a
	// ref so the effect does not re-seed — and throw away what is being typed
	// — whenever the parent hands down a fresh options array.
	const seed = React.useCallback(
		() => ({ title, description, deadline, options: options.map((option) => option.title) }),
		[title, description, deadline, options],
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
			// The deadline row in edit-body.tsx writes this; untouched, it is
			// still the `Date` the card was handed, which is what lets
			// `toInlineEditPayload` hand the column's own string back.
			deadline: draft.deadline,
			// A blank row is a row somebody started and abandoned, which is
			// how CreateDecisionForm treats it too.
			options: draft.options.map((option) => option.trim()).filter(Boolean),
		});

	return (
		<Card state={cardState} role="group" accessibilityLabel={title}>
			<CardHeader
				title={title}
				mode={mode}
				round={currentRound}
				tone={threadTone}
				badge={badge}
				createdBy={createdBy}
				deadline={deadline}
				expanded={open}
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

			<Reveal testID="decision-card-edit" open={editing}>
				<EditBody
					description={draft.description}
					deadline={draft.deadline}
					options={draft.options}
					onDescription={(value) => setDraft((current) => ({ ...current, description: value }))}
					onDeadline={(value) => setDraft((current) => ({ ...current, deadline: value }))}
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
					// Insert, not append: Enter on a row halfway up the list puts
					// the new row under *that* row. `edit-body.tsx` explains why.
					// Copy-then-splice rather than `toSpliced`, which Hermes does
					// not have on every engine version this ships to.
					onAddOption={(afterIndex) =>
						setDraft((current) => {
							const options = [...current.options];
							options.splice(afterIndex + 1, 0, "");
							return { ...current, options };
						})
					}
				/>
			</Reveal>

			<Reveal testID="decision-card-body" open={open && !editing}>
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

				<DecideButton cta={cta} roundTone={roundTone} showEndCap={mode === "poll"} onPress={onDecide} />
			</Reveal>
		</Card>
	);
}

export { DecisionCard };
