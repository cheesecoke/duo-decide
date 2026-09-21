import React, { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";

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
import { CollapseAllButton } from "@/components/layout/collapse-all-button";
import { ErrorStrip } from "@/components/layout/error-strip";
import { FIXED_FOOTER_HEIGHT, FixedFooter } from "@/components/layout/FixedFooter";
import { FooterPill } from "@/components/layout/footer-pill";
import { IntroCard } from "@/components/layout/intro-card";
import { StaggerIn } from "@/components/layout/stagger-in";
import { Character } from "@/components/ui/reusables/character/character";
import { Caption, Display, Eyebrow } from "@/components/ui/reusables/headline/headline";
import { Tile } from "@/components/ui/reusables/tile/tile";
import { useDrawer } from "@/context/drawer-provider";
import { useOptionLists } from "@/context/option-lists-provider";
import { useUserContext } from "@/context/user-context-provider";
import { useDecisionManagement } from "@/hooks/decision-queue/useDecisionManagement";
import { useDecisionsData, type UIDecision } from "@/hooks/decision-queue/useDecisionsData";
import { useDecisionVoting } from "@/hooks/decision-queue/useDecisionVoting";
import {
	getSeenPartnerIntro,
	getSeenWelcomeDecision,
	setSeenPartnerIntro,
	setSeenWelcomeDecision,
} from "@/lib/onboardingStorage";
import { PARTNER_INTRO, WELCOME_DECISION } from "@/lib/welcomeDecisionContent";

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
 * The empty queue.
 *
 * Inventory §1.10 item 4: once `seenWelcomeDecision` is true, an empty queue
 * rendered nothing at all — a blank screen with a button on it. This is the
 * hole closed. The 96 px pair is the two of you (tokens.md §9: characters
 * stand in for avatars and appear on the empty queue); the copy is the mock's
 * ("Nothing waiting on either of you", and the fourth welcome bullet, :745).
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

	/**
	 * `useDecisionManagement` returns a fresh `createNewDecision` /
	 * `updateExistingDecision` on every render (it has no `useCallback`), and
	 * the sheet effect below depends on the render callback that closes over
	 * them. Read through a ref, or every push of the sheet re-renders this
	 * screen, which mints new functions, which changes the callback, which
	 * pushes the sheet — forever (final re-review, 2026-09-20). Same pattern as
	 * `PersistedPersonPair`'s setter: the write target is a sink, not a dep.
	 */
	const management = useRef({ createNewDecision, updateExistingDecision });
	useEffect(() => {
		management.current = { createNewDecision, updateExistingDecision };
	});

	const handleCreateOrUpdate = useCallback(async () => {
		if (editingDecisionId) {
			const success = await management.current.updateExistingDecision(editingDecisionId, formData);
			if (success) {
				hideDrawer();
				handleCancelEdit();
			}
		} else {
			const newDecision = await management.current.createNewDecision(formData);
			if (newDecision) {
				hideDrawer();
				handleCancelEdit();
			}
		}
	}, [editingDecisionId, formData, hideDrawer, handleCancelEdit]);

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

	// Re-push the sheet's content whenever anything it renders from changes.
	// Guarded by `drawerType` so the confirm-delete sheet is never overwritten
	// by the form.
	//
	// The dependency is the render callback itself, not a hand-written list of
	// what it reads. The hand-written list had drifted: it named `formData` but
	// not `creating`, so the open sheet never learned the create was in flight,
	// its submit button stayed live and a second tap created a second decision.
	// `renderCreateDecisionContent` is `useCallback`ed with its own deps, so it
	// changes identity exactly when the sheet would render differently — one
	// list to keep correct instead of two.
	useEffect(() => {
		if (isDrawerVisible && drawerType === "createDecision") {
			updateContent(renderCreateDecisionContent());
		}
	}, [renderCreateDecisionContent, updateContent, isDrawerVisible, drawerType]);

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
			<ContentLayout scrollable={true} footerInset={FIXED_FOOTER_HEIGHT}>
				{error ? <ErrorStrip testID="decision-queue-error" message={error} /> : null}

				<View className="mb-6">
					<View className="flex-row items-center justify-between">
						<Eyebrow>Decision Queue</Eyebrow>
						<CollapseAllButton allCollapsed={allCollapsed} onPress={handleToggleAll} />
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
				<FooterPill label="Create Decision" onPress={showCreateDecisionDrawer} />
			</FixedFooter>
		</View>
	);
}
