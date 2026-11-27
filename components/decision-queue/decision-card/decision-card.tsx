import * as React from "react";
import { View } from "react-native";

import { Card } from "@/components/ui/reusables/card/card";
import {
	ArchiveGlyph,
	TrashGlyph,
	type CardMenuItem,
} from "@/components/ui/reusables/card-menu/card-menu";
import { Body } from "@/components/ui/reusables/headline/headline";
import { Reveal } from "@/components/ui/reusables/reveal/reveal";
import { Text } from "@/components/ui/reusables/text/text";

import { CardHeader } from "./card-header";
import { DecideButton } from "./decide-button";
import {
	COPY,
	isCreator as isCreatorOf,
	menuActions,
	optionsDisabled,
	partnerOf,
	resolveBadge,
	resolveCardState,
	resolveCta,
	resolveFooter,
	resolveMeta,
	resolveRoundTone,
	voterMark,
	type CardMenuAction,
	type DecisionCardProps,
} from "./decision-card.model";
import { EditBody } from "./edit-body";
import { FollowUpLine, FooterFade } from "./follow-up-line";
import { CalendarGlyph, CloseGlyph, LinkOutGlyph, NextGlyph } from "./glyphs";
import { OptionRows } from "./option-rows";
import { PollRound } from "./poll-round";
import { countFilled, optionShortfall } from "@/lib/decision-rules";
import type { FollowUpAction } from "@/lib/follow-up";
import { NEUTRAL } from "@/theme/neutrals";

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
 * R1 = A, R2 = B, R3 = both — carried along three elements: the round label
 * (`PollRound`), the segment indicator (`CardHeader`) and the lock-in end-cap
 * (`DecideButton`). Nothing else takes it; the badge, the meta line and the
 * body text stay on the neutral ramp, and the card's own rail and wash come
 * from `Card` reading the same tone. The selected option's mark used to be
 * the fourth link (the chip fill); as a row list (`OptionRows`) it is always
 * the viewer's own hue, person A — see option-rows.tsx.
 *
 * **Collapsed is header-only** (CollapsibleCard.tsx:204). The round-3 mock
 * keeps the voter row visible on a collapsed card; the inventory wins.
 *
 * **The inline-edit draft is view state, not decision state.** `editing` is
 * still a prop — the screen decides whether the card is in edit mode — and
 * the draft only exists between entering edit mode and `onSaveEdit`.
 *
 * **A decided card ends with one thing, or nothing** (`resolveFooter`). The
 * dead "Decided by …" pill is gone: who decided is on the header's meta line,
 * and the slot under the option rows holds a single follow-up pill ("Add to
 * calendar · Fri, Dec 12"), a calendar status line, or is simply not there.
 * Every other follow-up is in the ⋮ menu (`menuActions`). The card still only
 * reports: `onFollowUp` says what was picked and from where, and the screen
 * opens the sheet, the link or the create form.
 *
 * The pill is the same mounted `DecideButton` the open card's CTA was, so
 * deciding cross-fades "Waiting for partner" into it; the pill and the status
 * line swap through `FooterFade`. All of it stays inside the body `Reveal`.
 *
 * The body and the edit form each open inside a `Reveal`
 * (`reusables/reveal/`), rendered unconditionally so the close can animate.
 */

/** The pill's leading mark, in the label's own `ink`. All decorative. */
const PILL_GLYPH: Record<FollowUpAction, React.ReactNode> = {
	calendar: <CalendarGlyph color={NEUTRAL.ink} />,
	open_link: <LinkOutGlyph color={NEUTRAL.ink} />,
	decide_next: <NextGlyph color={NEUTRAL.ink} />,
};

const MENU_ICON: Record<CardMenuAction, React.ReactNode> = {
	archive: <ArchiveGlyph />,
	delete: <TrashGlyph />,
	calendar: <CalendarGlyph />,
	open_link: <LinkOutGlyph />,
	decide_next: <NextGlyph />,
	calendar_add_mine: <CalendarGlyph />,
	calendar_remove: <CloseGlyph />,
};

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
		onArchive,
		onFollowUp,
		onCalendarAnswer,
		onCalendarOpen,
		onCalendarRemove,
	} = props;

	const partner = partnerOf(props);
	const isCreator = isCreatorOf(props);
	const cta = resolveCta(props);
	const badge = resolveBadge(props);
	const disabled = optionsDisabled(props);

	/** Only the label's year rule reads it, so a fresh one per render is fine. */
	const footer = resolveFooter(props, props.now ?? new Date());
	const meta = resolveMeta(props);

	const menuPress: Record<CardMenuAction, () => void> = {
		archive: onArchive,
		delete: onDelete,
		calendar: () => onFollowUp?.("calendar", "menu"),
		open_link: () => onFollowUp?.("open_link", "menu"),
		decide_next: () => onFollowUp?.("decide_next", "menu"),
		// "Add to my calendar too" is the calendar action by another name.
		calendar_add_mine: () => onFollowUp?.("calendar", "menu"),
		calendar_remove: () => onCalendarRemove?.(),
	};
	const menuItems: CardMenuItem[] = menuActions(props).map((action) => ({
		label: COPY.menu[action],
		icon: MENU_ICON[action],
		destructive: action === "delete",
		onPress: menuPress[action],
	}));

	/**
	 * The footer slot's two halves. The button is the open card's CTA, or the
	 * decided card's follow-up pill; the line is the calendar's. `changed` has
	 * both (a caption over "Add again"), everything else has at most one.
	 */
	const pill = footer.kind === "action" || footer.kind === "changed" ? footer.pill : null;
	const line = footer.kind === "none" || footer.kind === "action" ? null : footer;

	/** Whose card this is — what `Card`, the badge and a vote CTA wear. */
	const cardState = resolveCardState(props);
	/** Which round this is — the poll-only thread; `neutral` on a vote card. */
	const roundTone = resolveRoundTone(mode, currentRound, status);
	/**
	 * The thread's colour where a poll card has one. A vote card has no round,
	 * so the segment indicator falls back to the person state.
	 */
	const threadTone = mode === "poll" ? roundTone : cardState;

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

	// Polls need 3 options in round 1, votes 2 (lib/decision-rules.ts).
	const optionsMessage = optionShortfall(mode, countFilled(draft.options), currentRound ?? 1);

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
				decidedBy={meta.decidedBy}
				expanded={open}
				editing={editing}
				canEdit={isCreator && status === "pending"}
				menuItems={menuItems}
				draftTitle={draft.title}
				onDraftTitle={(value) => setDraft((current) => ({ ...current, title: value }))}
				onToggle={onToggle}
				onEdit={onEdit}
				onCancelEdit={onCancelEdit}
				onSave={handleSave}
				saveDisabled={optionsMessage !== null}
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
					optionsMessage={optionsMessage}
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

				<OptionRows
					options={options}
					mode={mode}
					disabled={disabled}
					decided={status === "completed"}
					onSelect={onOptionSelect}
				/>

				<View testID="decision-card-footer" className="relative">
					<FooterFade show={line !== null}>
						{line ? (
							<FollowUpLine footer={line} onOpen={onCalendarOpen} onAnswer={onCalendarAnswer} />
						) : null}
					</FooterFade>

					<FooterFade show={cta !== null || pill !== null}>
						{cta ? (
							<DecideButton
								cta={cta}
								roundTone={roundTone}
								showEndCap={mode === "poll"}
								onPress={onDecide}
							/>
						) : pill ? (
							<DecideButton
								testID="decision-card-follow-up"
								// `together`, never `cta`: black reads as "you must act".
								cta={{ label: pill.label, disabled: false, tone: "together" }}
								roundTone={roundTone}
								showEndCap={false}
								glyph={PILL_GLYPH[pill.action]}
								accessibilityLabel={pill.accessibilityLabel}
								accessibilityHint={pill.accessibilityHint}
								onPress={() => onFollowUp?.(pill.action, "slot")}
							/>
						) : null}
					</FooterFade>
				</View>
			</Reveal>
		</Card>
	);
}

export { DecisionCard };
