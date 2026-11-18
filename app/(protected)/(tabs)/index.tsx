import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, View } from "react-native";

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
import { LeaveOut } from "@/components/decision-queue/leave-out/leave-out";
import {
	bucketLabel,
	QueueFilterBar,
} from "@/components/decision-queue/queue-filter-bar/queue-filter-bar";
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
import { useQueuePresence } from "@/hooks/decision-queue/useQueuePresence";
import {
	getSeenPartnerIntro,
	getSeenWelcomeDecision,
	setSeenPartnerIntro,
	setSeenWelcomeDecision,
} from "@/lib/onboardingStorage";
import {
	applyQueueFilter,
	bucketOf,
	type BucketCounts,
	type QueueFilter,
} from "@/lib/queue-filter";
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

/**
 * How many cards stagger in on a filter change before the rest arrive
 * together — 40 ms × 8 is the most a tap should ever wait to settle.
 */
const STAGGER_CAP = 8;

/**
 * What a filter that matched nothing says — never a bare "0 results", and
 * always a way back (the tile clears the filter).
 */
function emptyFilterCopy(
	filter: QueueFilter,
	counts: BucketCounts,
	partner: string | null,
): { title: string; subtitle: string } {
	const them = partner ?? "Your partner";
	const n = (count: number) => (count === 1 ? "1 is" : `${count} are`);
	switch (filter) {
		case "yours":
			return {
				title: "Nothing on your plate",
				subtitle:
					counts.theirs > 0
						? `${n(counts.theirs)} waiting on ${partner ?? "your partner"}. Tap to see everything.`
						: "Tap to see everything.",
			};
		case "theirs":
			return {
				title: `${them}'s all caught up`,
				subtitle:
					counts.yours > 0
						? `${n(counts.yours)} waiting on you. Tap to see everything.`
						: "Tap to see everything.",
			};
		default:
			return {
				title: "Nothing settled yet",
				subtitle: "Decisions land here once you agree. Tap to see everything.",
			};
	}
}

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
 * A filter or search that matched nothing.
 *
 * With a search typed, the way out is to start the decision you were looking
 * for — the tile opens the create sheet with that title filled in. With only
 * a status chip, it is the chip's own sentence (`emptyFilterCopy`) and the
 * tile clears the chip.
 */
function NoMatches({
	query,
	copy,
	onShowAll,
	onCreate,
}: {
	query: string;
	copy: { title: string; subtitle: string };
	onShowAll: () => void;
	onCreate: () => void;
}) {
	return (
		<View testID="decision-queue-no-matches" className="mb-3">
			{query ? (
				<Tile
					title={`No decisions match “${query}”`}
					subtitle={`Check the spelling, or start one called “${query}”.`}
					tint="surface-2"
					onPress={onCreate}
					illustration={<Character kind="fish" size={96} pose="waiting" name="you" />}
				/>
			) : (
				<Tile
					title={copy.title}
					subtitle={copy.subtitle}
					tint="surface-2"
					onPress={onShowAll}
					illustration={
						<View className="flex-row items-end gap-1.5">
							<Character kind="fish" size={96} name="you" />
							<Character kind="goose" size={96} name="your partner" />
						</View>
					}
				/>
			)}
		</View>
	);
}

/**
 * The mock's `duo-row` (decision-queue-round-3.html:448-451): the two of you
 * at 32 px, and one line saying what the queue holds.
 *
 * Only the **empty** queue shows it now. Once there is anything to filter,
 * `QueueFilterBar` takes its place: the counts it printed became the filter
 * chips, and the fish and goose moved into "Your turn" and "{Partner}'s turn".
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
		archiveExistingDecision,
		softDeleteExistingDecision,
	} = useDecisionManagement(userContext, setDecisions, setError);

	// Onboarding flags (AsyncStorage) - null = not loaded yet
	const [seenWelcomeDecision, setSeenWelcomeDecisionState] = useState<boolean | null>(null);
	const [seenPartnerIntro, setSeenPartnerIntroState] = useState<boolean | null>(null);

	// Local UI state
	const [allCollapsed, setAllCollapsed] = useState(false);
	/** The status chip. `"all"` is none selected. Not persisted: a cold start is everything. */
	const [filter, setFilter] = useState<QueueFilter>("all");
	const [query, setQuery] = useState("");
	const [searchOpen, setSearchOpen] = useState(false);
	/** The decision the *drawer* is editing (the full form). */
	const [editingDecisionId, setEditingDecisionId] = useState<string | null>(null);
	/** The decision being edited *in its card* — the card's `editing` prop. */
	const [editingCardId, setEditingCardId] = useState<string | null>(null);
	const [formData, setFormData] = useState<CreateDecisionFormData>(EMPTY_FORM);
	/**
	 * Cards on their way out of the queue, and what takes them: `LeaveOut`
	 * plays the exit, then `finishLeaving` makes the (optimistic) write.
	 */
	const [leaving, setLeaving] = useState<Record<string, "archive" | "delete">>({});

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

	const startLeaving = useCallback((decisionId: string, how: "archive" | "delete") => {
		setLeaving((current) => ({ ...current, [decisionId]: how }));
	}, []);

	const finishLeaving = useCallback(
		(decisionId: string) => {
			const how = leaving[decisionId];
			setLeaving((current) => {
				const next = { ...current };
				delete next[decisionId];
				return next;
			});
			if (how === "archive") void archiveExistingDecision(decisionId);
			else if (how === "delete") void softDeleteExistingDecision(decisionId);
		},
		[leaving, archiveExistingDecision, softDeleteExistingDecision],
	);

	/**
	 * Delete asks first (Chase's ruling 2026-09-20). Since migration 024 it is
	 * a soft delete — the row stays in the database — but nothing in the app
	 * brings it back, so to the two of them it is still gone for good.
	 *
	 * Only an open decision offers Delete. A decided one offers Archive
	 * instead, which asks nothing: History keeps it, and History can bring it
	 * back.
	 */
	const confirmDelete = useCallback(
		(decision: UIDecision) => {
			showDrawer(
				"Delete this decision?",
				<ConfirmDelete
					title={decision.title}
					message={`“${decision.title}” is removed for both of you. This cannot be undone.`}
					onCancel={hideDrawer}
					onConfirm={() => {
						hideDrawer();
						startLeaving(decision.id, "delete");
					}}
				/>,
				{ type: "confirmDelete" },
			);
		},
		[showDrawer, hideDrawer, startLeaving],
	);

	/* ---------------------------------------------------------------------- */
	/* filtering                                                               */
	/* ---------------------------------------------------------------------- */

	// Every card's props and bucket, computed once per render and reused by
	// the list below — the bucket is read off the same props the card draws.
	const items = useMemo(
		() =>
			userContext
				? decisions.map((decision) => {
						const card = toDecisionCardProps(decision, pollVotes[decision.id] || {}, userContext);
						return { decision, card, bucket: bucketOf(card) };
					})
				: [],
		[decisions, pollVotes, userContext],
	);

	const { visible, counts } = useMemo(
		() => applyQueueFilter(items, filter, query),
		[items, filter, query],
	);

	const allIds = useMemo(() => items.map((item) => item.decision.id), [items]);
	const matchedIds = useMemo(() => visible.map((item) => item.decision.id), [visible]);
	const {
		shown,
		exiting,
		done: finishExit,
	} = useQueuePresence(matchedIds, `${filter}\u0000${query}`, allIds);
	const rendered = items.filter(
		(item) => shown.has(item.decision.id) || exiting.has(item.decision.id),
	);

	const handleFilterChange = useCallback(
		(next: QueueFilter) => {
			setFilter(next);
			// The list changing under a screen reader is silent otherwise.
			const count = next === "all" ? counts.all : counts[next];
			const what = next === "all" ? "all" : bucketLabel(next, userContext?.partnerName ?? null);
			AccessibilityInfo.announceForAccessibility?.(
				`Showing ${what}, ${count} ${count === 1 ? "decision" : "decisions"}`,
			);
		},
		[counts, userContext?.partnerName],
	);

	const cancelSearch = useCallback(() => {
		setQuery("");
		setSearchOpen(false);
	}, []);

	const closeSearch = useCallback(() => {
		setQuery((current) => current.trim());
		setSearchOpen(false);
	}, []);

	/** "No decisions match 'pizza'" → start one called that. */
	const createFromQuery = useCallback(() => {
		const title = query.trim();
		cancelSearch();
		setEditingDecisionId(null);
		setFormData({ ...EMPTY_FORM, title });
		// The sheet effect re-pushes the content once `formData` lands.
		showDrawer("Create Decision", renderCreateDecisionContent(), { type: "createDecision" });
	}, [query, cancelSearch, showDrawer, renderCreateDecisionContent]);

	const filtering = filter !== "all" || query.trim() !== "";
	const nothingMatches = filtering && shown.size === 0 && exiting.size === 0;

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

					{userContext && decisions.length > 0 ? (
						<QueueFilterBar
							counts={counts}
							filter={filter}
							onFilterChange={handleFilterChange}
							you={userContext.userName}
							partner={userContext.partnerName}
							query={query}
							onQueryChange={setQuery}
							searchOpen={searchOpen}
							onOpenSearch={() => setSearchOpen(true)}
							onCloseSearch={closeSearch}
							onCancelSearch={cancelSearch}
						/>
					) : userContext ? (
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

				{nothingMatches ? (
					<NoMatches
						query={query.trim()}
						copy={emptyFilterCopy(filter, counts, userContext?.partnerName ?? null)}
						onShowAll={() => handleFilterChange("all")}
						onCreate={createFromQuery}
					/>
				) : null}

				<ResponsiveCardList>
					{rendered.map(({ decision, card }, index) => {
						if (!userContext) return null;
						const filteredOut = exiting.has(decision.id);

						return (
							<StaggerIn key={decision.id} index={Math.min(index, STAGGER_CAP)}>
								{/* Out of the filter: the same fade-and-settle an
								    archive gets, then it stops rendering. */}
								<LeaveOut leaving={filteredOut} onLeft={() => finishExit(decision.id)}>
									<LeaveOut
										testID={`decision-leave-${decision.id}`}
										leaving={leaving[decision.id] !== undefined}
										onLeft={() => finishLeaving(decision.id)}
									>
										<DecisionCard
											{...card}
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
											onArchive={() => startLeaving(decision.id, "archive")}
										/>
									</LeaveOut>
								</LeaveOut>
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
