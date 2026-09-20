import React, { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";

import { IconAdd } from "@/assets/icons/IconAdd";
import { IconUnfoldLess } from "@/assets/icons/IconUnfoldLess";
import { IconUnfoldMore } from "@/assets/icons/IconUnfoldMore";
import { ConfirmDelete } from "@/components/decision-queue/confirm-delete/confirm-delete";
import {
	CreateDecisionForm,
	type CreateDecisionFormData,
} from "@/components/decision-queue/CreateDecisionForm";
import { DecisionCard } from "@/components/decision-queue/decision-card/decision-card";
import type { DecisionEditDraft } from "@/components/decision-queue/decision-card/decision-card.model";
import {
	toDecisionCardProps,
	toInlineEditPayload,
} from "@/components/decision-queue/decision-card/from-ui-decision";
import { whoLine } from "@/components/decision-queue/who-line";
import { ContentLayout, ResponsiveCardList } from "@/components/layout";
import { FixedFooter } from "@/components/layout/FixedFooter";
import { AnimatedView } from "@/components/ui/reusables/animated/animated";
import { Button } from "@/components/ui/reusables/button/button";
import { Card } from "@/components/ui/reusables/card/card";
import { Character } from "@/components/ui/reusables/character/character";
import {
	Body,
	Caption,
	Display,
	Eyebrow,
	Title,
} from "@/components/ui/reusables/headline/headline";
import { Text } from "@/components/ui/reusables/text/text";
import { Tile } from "@/components/ui/reusables/tile/tile";
import { useDrawer } from "@/context/drawer-provider";
import { useOptionLists } from "@/context/option-lists-provider";
import { useUserContext } from "@/context/user-context-provider";
import { useDecisionManagement } from "@/hooks/decision-queue/useDecisionManagement";
import { useDecisionsData, type UIDecision } from "@/hooks/decision-queue/useDecisionsData";
import { useDecisionVoting } from "@/hooks/decision-queue/useDecisionVoting";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
	getSeenPartnerIntro,
	getSeenWelcomeDecision,
	setSeenPartnerIntro,
	setSeenWelcomeDecision,
} from "@/lib/onboardingStorage";
import { PARTNER_INTRO, WELCOME_DECISION } from "@/lib/welcomeDecisionContent";
import { DUR, STAGGER_LIST } from "@/theme/motion";
import { NEUTRAL } from "@/theme/neutrals";
import { usePersonColors } from "@/theme/usePersonColors";

/**
 * The Decision Queue — FEATURE-INVENTORY §1.10, on the v2 primitives.
 *
 * Presentation only. Every piece of data and every write still comes from the
 * three hooks it came from before (`useDecisionsData`, `useDecisionVoting`,
 * `useDecisionManagement`, all untouched); what changed is that the card is
 * now pure, so this file owns the two things a pure card cannot:
 *
 *   1. **The mapping.** `toDecisionCardProps` turns a `UIDecision` + the poll
 *      ledger + the user context into the card's props, and
 *      `toInlineEditPayload` turns an edit draft back into the management
 *      hook's payload. Both are pure and table-tested
 *      (`__tests__/components/decision-queue/from-ui-decision.test.ts`).
 *   2. **The view state** — which card is open, which one is being edited,
 *      which one has a write in flight, and what a destructive action asks
 *      before it happens.
 *
 * Order is the mock's (design-refs/mocks/decision-queue-round-3.html) and
 * tokens.md §10's eye flow: eyebrow → headline → the list → the one black
 * button. `FixedFooter` pins that button above the floating tab pill; the
 * scene already reserves the pill's room (`(tabs)/_layout.tsx`).
 *
 * **One behaviour is new**, and deliberately: an empty queue used to render
 * *nothing at all* once the welcome flag was set (inventory §1.10, item 4).
 * It now renders the empty tile below.
 */

/** The blank create/edit form — reset to this in three places, so it is one constant. */
const EMPTY_FORM: CreateDecisionFormData = {
	title: "",
	description: "",
	dueDate: "",
	decisionType: "vote",
	selectedOptionListId: "",
	selectedOptions: [],
	customOptions: [],
};

/**
 * The screen-level error banner — the mock's `.strip` (a pill, not the old
 * full-width block) and tokens.md §8's "banners slide from above".
 *
 * Driven from a shared value rather than `entering={FadeIn}` for the reason
 * spelled out in decision-card.tsx: a layout animation that fails to run on a
 * cold web load leaves the element permanently invisible, and an error nobody
 * can see is worse than an error that does not animate.
 */
function ErrorStrip({ message }: { message: string }) {
	const reducedMotion = useReducedMotion();
	const progress = useSharedValue(0);

	useEffect(() => {
		progress.value = reducedMotion ? 1 : withTiming(1, { duration: DUR.base });
	}, [progress, reducedMotion]);

	const style = useAnimatedStyle(
		() => ({ opacity: progress.value, transform: [{ translateY: (progress.value - 1) * 8 }] }),
		[progress],
	);

	return (
		<AnimatedView
			testID="decision-queue-error"
			role="alert"
			style={style}
			className="mb-4 rounded-chip bg-destructive px-3.5 py-2"
		>
			<Caption className="text-center text-destructive-foreground">{message}</Caption>
		</AnimatedView>
	);
}

/**
 * One card's entrance — tokens.md §8's 40 ms-per-card stagger.
 *
 * The delay is the card's index, so the list arrives top-down. It runs on
 * mount only: a card that is already on screen when another one is deleted
 * must not replay its entrance.
 *
 * `break-inside-avoid` is what keeps a card whole in the web masonry column
 * layout (`ResponsiveCardList`); it used to live on `CollapsibleCard`'s own
 * outer cell, which this wrapper replaces.
 */
function StaggerIn({ index, children }: { index: number; children: React.ReactNode }) {
	const reducedMotion = useReducedMotion();
	const progress = useSharedValue(0);

	useEffect(() => {
		progress.value = reducedMotion
			? 1
			: withDelay(index * STAGGER_LIST, withTiming(1, { duration: DUR.base }));
	}, [index, progress, reducedMotion]);

	const style = useAnimatedStyle(
		() => ({ opacity: progress.value, transform: [{ translateY: (1 - progress.value) * 8 }] }),
		[progress],
	);

	return (
		<AnimatedView style={style} className="mb-3 break-inside-avoid">
			{children}
		</AnimatedView>
	);
}

/**
 * The welcome and partner-intro cards (`lib/welcomeDecisionContent.ts`), which
 * are guide copy rather than a decision — hence `Card state="together"`: they
 * are addressed to the two of you, not to either seat.
 *
 * The four "how it works" lines are the inventory's (§1.10 item 4); they are
 * the whole point of the card, so they are kept as a bulleted list, the shape
 * the mock's `.tile ul` uses.
 */
function IntroCard({
	content,
	onDismiss,
}: {
	content: { title: string; description: string; options: readonly { title: string }[] };
	onDismiss: () => void;
}) {
	return (
		<Card state="together" className="mb-3" role="group" accessibilityLabel={content.title}>
			<Title>{content.title}</Title>
			<Body className="mt-2 text-ink-2">{content.description}</Body>

			<View className="mt-4 gap-2.5">
				{content.options.map((option) => (
					<View key={option.title} className="flex-row gap-2.5">
						<View className="mt-1.5 h-1.5 w-1.5 rounded-chip bg-ink-3" />
						<Caption className="flex-1 text-ink">{option.title}</Caption>
					</View>
				))}
			</View>

			<Button
				variant="secondary"
				className="mt-4 h-12 w-full rounded-button"
				accessibilityLabel="Got it"
				onPress={onDismiss}
			>
				<Text className="text-[16px] font-semibold leading-[22px]">Got it</Text>
			</Button>
		</Card>
	);
}

/**
 * The empty queue.
 *
 * Inventory §1.10 item 4: once `seenWelcomeDecision` is true, an empty queue
 * rendered nothing at all — a blank screen with a button on it. This is the
 * hole closed. The 96 px pair is the two of you (tokens.md §9: characters
 * stand in for avatars and appear on the empty queue); the copy is the mock's
 * ("nothing in the queue yet", :786, and the fourth welcome bullet, :745).
 *
 * The tile is the button — it carries `Tile`'s own arrow affordance and opens
 * the same drawer the footer pill does. It deliberately has **no** button of
 * its own inside it: the footer pill is already on screen and says the same
 * words, and two controls with the same accessible name on one screen is a
 * thing a screen reader cannot disambiguate.
 */
function EmptyQueue({ onCreate }: { onCreate: () => void }) {
	return (
		<View testID="decision-queue-empty" className="mb-3">
			<Tile
				title="Nothing in the queue yet"
				subtitle="Create a decision anytime with the button below — add options and invite your partner."
				tint="surface-2"
				onPress={onCreate}
				illustration={
					<View className="flex-row items-end gap-1.5">
						<Character kind="fish" size={96} name="you" />
						<Character kind="goose" size={96} name="your partner" />
					</View>
				}
			/>
		</View>
	);
}

/**
 * The mock's `duo-row` (decision-queue-round-3.html:448-451): the two of you
 * at 32 px, and one line saying what the queue holds.
 *
 * tokens.md §9 — a character never stands alone, so the pair and the line are
 * one row. The goose is dropped when nobody is linked, because the line says
 * "You" and a second character with no name behind it would be a person the
 * app invented. The characters own their reduced-motion behaviour
 * (`character.tsx`); nothing here animates.
 */
function DuoRow({
	decisions,
	you,
	partner,
}: {
	decisions: UIDecision[];
	you: string;
	partner: string | null;
}) {
	return (
		<View className="mt-4 flex-row items-center gap-2">
			<Character kind="fish" size={32} name={you} />
			{partner ? <Character kind="goose" size={32} name={partner} /> : null}
			<Caption className="flex-1">{whoLine(decisions, partner)}</Caption>
		</View>
	);
}

/** The footer pill — the mock's `.cta`: one black element, with a tinted end-cap. */
function CreateDecisionPill({ onPress }: { onPress: () => void }) {
	const person = usePersonColors();

	return (
		<Button
			className="h-14 w-full justify-between rounded-button py-[7px] pl-6 pr-[7px]"
			accessibilityLabel="Create Decision"
			onPress={onPress}
		>
			<Text className="text-[16px] font-semibold leading-[22px]">Create Decision</Text>
			<View className="h-10 w-10 items-center justify-center rounded-chip bg-person-a-tint">
				<IconAdd size={20} color={person.a.deep} />
			</View>
		</Button>
	);
}

export default function Home() {
	const {
		showDrawer,
		hideDrawer,
		updateContent,
		isVisible: isDrawerVisible,
		drawerType,
	} = useDrawer();
	const { userContext } = useUserContext();

	// Data loading and subscriptions
	const { decisions, setDecisions, pollVotes, setPollVotes, loading, error, setError } =
		useDecisionsData(userContext);

	// Option lists from provider
	const { optionLists } = useOptionLists();

	// Voting logic
	const { voting, handleVote, handlePollVote, selectOption } = useDecisionVoting(
		userContext,
		decisions,
		setDecisions,
		setPollVotes,
		setError,
	);

	// CRUD operations
	const {
		creating,
		createNewDecision,
		updateExistingDecision,
		updateDecisionInline,
		deleteExistingDecision,
	} = useDecisionManagement(userContext, setDecisions, setError);

	// Onboarding flags (AsyncStorage) - null = not loaded yet
	const [seenWelcomeDecision, setSeenWelcomeDecisionState] = useState<boolean | null>(null);
	const [seenPartnerIntro, setSeenPartnerIntroState] = useState<boolean | null>(null);

	// Local UI state
	const [allCollapsed, setAllCollapsed] = useState(false);
	/** The decision the *drawer* is editing (the full form). */
	const [editingDecisionId, setEditingDecisionId] = useState<string | null>(null);
	/** The decision being edited *in its card* — the card's `editing` prop. */
	const [editingCardId, setEditingCardId] = useState<string | null>(null);
	const [formData, setFormData] = useState<CreateDecisionFormData>(EMPTY_FORM);

	const handleCancelEdit = useCallback(() => {
		hideDrawer();
		setEditingDecisionId(null);
		setFormData(EMPTY_FORM);
	}, [hideDrawer]);

	const handleCreateOrUpdate = useCallback(async () => {
		if (editingDecisionId) {
			const success = await updateExistingDecision(editingDecisionId, formData);
			if (success) {
				hideDrawer();
				handleCancelEdit();
			}
		} else {
			const newDecision = await createNewDecision(formData);
			if (newDecision) {
				hideDrawer();
				handleCancelEdit();
			}
		}
	}, [
		editingDecisionId,
		formData,
		updateExistingDecision,
		createNewDecision,
		hideDrawer,
		handleCancelEdit,
	]);

	const renderCreateDecisionContent = useCallback(
		() => (
			<CreateDecisionForm
				formData={formData}
				onFormDataChange={setFormData}
				onSubmit={handleCreateOrUpdate}
				onCancel={handleCancelEdit}
				isEditing={!!editingDecisionId}
				isSubmitting={creating}
				optionLists={optionLists}
			/>
		),
		[formData, handleCreateOrUpdate, handleCancelEdit, editingDecisionId, creating, optionLists],
	);

	const showCreateDecisionDrawer = useCallback(() => {
		setEditingDecisionId(null);
		setFormData(EMPTY_FORM);
		showDrawer("Create Decision", renderCreateDecisionContent(), { type: "createDecision" });
	}, [showDrawer, renderCreateDecisionContent]);

	// Load onboarding flags from AsyncStorage
	useEffect(() => {
		if (!userContext?.userId) return;
		let cancelled = false;
		(async () => {
			const [welcome, partnerIntro] = await Promise.all([
				getSeenWelcomeDecision(userContext.userId),
				getSeenPartnerIntro(userContext.userId),
			]);
			if (!cancelled) {
				setSeenWelcomeDecisionState(welcome);
				setSeenPartnerIntroState(partnerIntro);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [userContext?.userId]);

	// Update drawer content when drawer opens or form data changes. Guarded by
	// `drawerType` so the confirm-delete sheet is never overwritten by the form.
	useEffect(() => {
		if (isDrawerVisible && drawerType === "createDecision") {
			updateContent(renderCreateDecisionContent());
		}
	}, [formData, updateContent, isDrawerVisible, drawerType]);

	// UI state handlers
	const handleToggleDecision = (decisionId: string) => {
		setDecisions((prev) =>
			prev.map((decision) =>
				decision.id === decisionId ? { ...decision, expanded: !decision.expanded } : decision,
			),
		);
	};

	const handleToggleAll = () => {
		const newCollapsedState = !allCollapsed;
		setAllCollapsed(newCollapsedState);
		setDecisions((prev) => prev.map((decision) => ({ ...decision, expanded: !newCollapsedState })));
	};

	const handleDismissWelcome = useCallback(async () => {
		if (!userContext?.userId) return;
		await setSeenWelcomeDecision(userContext.userId);
		setSeenWelcomeDecisionState(true);
	}, [userContext?.userId]);

	const handleDismissPartnerIntro = useCallback(async () => {
		if (!userContext?.userId) return;
		await setSeenPartnerIntro(userContext.userId);
		setSeenPartnerIntroState(true);
	}, [userContext?.userId]);

	/**
	 * CollapsibleCard resolved the selected option itself before calling
	 * `onDecide` (CollapsibleCard.tsx:109-114); the pure card does not know the
	 * option ids the hook wants, so the screen resolves it here instead. Poll
	 * mode never needed one — `handlePollVote` reads the selection off the
	 * decision (index.tsx:326-330, before).
	 */
	const handleDecide = useCallback(
		(decision: UIDecision) => {
			if (decision.type === "poll") {
				void handlePollVote(decision.id);
				return;
			}
			const selected = (decision.options ?? []).find((option) => option.selected);
			if (selected) void handleVote(decision.id, selected.id);
		},
		[handlePollVote, handleVote],
	);

	/**
	 * Saving leaves edit mode whether or not the write succeeded, which is what
	 * `saveInlineEditing` did (CollapsibleCard.tsx:149-159). A failure is not
	 * silent: the hook writes it to `error`, and the strip above the list says so.
	 */
	const handleSaveEdit = useCallback(
		(decision: UIDecision, draft: DecisionEditDraft) => {
			setEditingCardId(null);
			void updateDecisionInline(decision.id, toInlineEditPayload(decision, draft));
		},
		[updateDecisionInline],
	);

	/**
	 * Delete asks first (Chase's ruling 2026-09-20) — the one place the app
	 * confirms, because it removes the decision and every vote on it for both
	 * people and nothing in the app undoes anything.
	 */
	const confirmDelete = useCallback(
		(decision: UIDecision) => {
			showDrawer(
				"Delete this decision?",
				<ConfirmDelete
					title={decision.title}
					onCancel={hideDrawer}
					onConfirm={() => {
						void deleteExistingDecision(decision.id);
						hideDrawer();
					}}
				/>,
				{ type: "confirmDelete" },
			);
		},
		[showDrawer, hideDrawer, deleteExistingDecision],
	);

	if (loading) {
		return (
			<ContentLayout scrollable={true}>
				<View className="flex-1 items-center justify-center">
					<Caption>Loading decisions…</Caption>
				</View>
			</ContentLayout>
		);
	}

	return (
		<View className="flex-1">
			<ContentLayout scrollable={true}>
				{error ? <ErrorStrip message={error} /> : null}

				<View className="mb-6">
					<View className="flex-row items-center justify-between">
						<Eyebrow>Decision Queue</Eyebrow>
						<Pressable
							role="button"
							accessibilityLabel={allCollapsed ? "Expand all" : "Collapse all"}
							onPress={handleToggleAll}
							className="h-9 w-9 items-center justify-center rounded-chip bg-surface"
						>
							{allCollapsed ? (
								<IconUnfoldMore size={20} color={NEUTRAL.ink2} />
							) : (
								<IconUnfoldLess size={20} color={NEUTRAL.ink2} />
							)}
						</Pressable>
					</View>

					<Display className="mt-2">
						What are we <Display.Strong>deciding today?</Display.Strong>
					</Display>

					{userContext ? (
						<DuoRow decisions={decisions} you={userContext.userName} partner={userContext.partnerName} />
					) : null}
				</View>

				{/* Partner intro: second user who just joined, has partner and decisions */}
				{decisions.length > 0 && userContext?.partnerId && seenPartnerIntro === false && (
					<IntroCard content={PARTNER_INTRO} onDismiss={handleDismissPartnerIntro} />
				)}

				{/* Welcome: first-time user with an empty queue */}
				{decisions.length === 0 && seenWelcomeDecision === false && userContext && (
					<IntroCard content={WELCOME_DECISION} onDismiss={handleDismissWelcome} />
				)}

				{/* The empty queue itself — shown whatever the welcome flag says. */}
				{decisions.length === 0 && <EmptyQueue onCreate={showCreateDecisionDrawer} />}

				<ResponsiveCardList>
					{decisions.map((decision, index) => {
						if (!userContext) return null;

						// The poll ledger for this decision's current round, keyed by
						// display name (useDecisionsData.ts:110).
						const roundVotes = pollVotes[decision.id] || {};

						return (
							<StaggerIn key={decision.id} index={index}>
								<DecisionCard
									{...toDecisionCardProps(decision, roundVotes, userContext)}
									expanded={decision.expanded}
									editing={editingCardId === decision.id}
									submitting={voting === decision.id}
									// The hooks keep one error for the screen, not one per
									// decision, so the strip above the list is where it shows.
									error={null}
									onToggle={() => handleToggleDecision(decision.id)}
									onOptionSelect={(optionId: string) => selectOption(decision.id, optionId)}
									onDecide={() => handleDecide(decision)}
									onEdit={() => setEditingCardId(decision.id)}
									onCancelEdit={() => setEditingCardId(null)}
									onSaveEdit={(draft) => handleSaveEdit(decision, draft)}
									onDelete={() => confirmDelete(decision)}
								/>
							</StaggerIn>
						);
					})}
				</ResponsiveCardList>
			</ContentLayout>

			<FixedFooter background="transparent">
				<CreateDecisionPill onPress={showCreateDecisionDrawer} />
			</FixedFooter>
		</View>
	);
}
