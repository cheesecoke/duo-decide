import React, { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { IconUnfoldLess } from "@/assets/icons/IconUnfoldLess";
import { IconUnfoldMore } from "@/assets/icons/IconUnfoldMore";
import { ConfirmDelete } from "@/components/decision-queue/confirm-delete/confirm-delete";
import { ContentLayout, ResponsiveCardList } from "@/components/layout";
import { ErrorStrip } from "@/components/layout/error-strip";
import { FixedFooter } from "@/components/layout/FixedFooter";
import { FooterPill } from "@/components/layout/footer-pill";
import { IntroCard } from "@/components/layout/intro-card";
import { StaggerIn } from "@/components/layout/stagger-in";
import { CreateListForm, type CreateListFormValue } from "@/components/options/create-list-form";
import type { EditableOption } from "@/components/options/editable-options/editable-options";
import { OptionListCard } from "@/components/options/option-list-card/option-list-card";
import type { CardState } from "@/components/ui/reusables/card/card";
import { Caption, Display, Eyebrow } from "@/components/ui/reusables/headline/headline";
import { Tile } from "@/components/ui/reusables/tile/tile";
import { useDrawer } from "@/context/drawer-provider";
import { useOptionLists } from "@/context/option-lists-provider";
import { useUserContext } from "@/context/user-context-provider";
import { getSeenWelcomeOptions, setSeenWelcomeOptions } from "@/lib/onboardingStorage";
import { WELCOME_OPTIONS } from "@/lib/welcomeDecisionContent";
import { NEUTRAL } from "@/theme/neutrals";

/**
 * Lists of Options — FEATURE-INVENTORY §1.11, on the v2 primitives.
 *
 * Presentation only. `useOptionLists` and `useUserContext` are untouched, and
 * `createList` / `updateList` / `deleteList` are called with exactly the
 * arguments they were called with before. What changed is that the card is
 * now pure, so this file owns the two things a pure card cannot know:
 *
 *   1. **Whose list it is.** tokens.md §10 says a card's rail and wash follow
 *      the person state. A list has no votes, so its seat is its *creator's*
 *      — `listState` below. A list whose `creator_id` is null (every list
 *      made before that column existed) is `neutral` rather than being
 *      guessed at.
 *   2. **Who may delete it.** §1.11: only the creator, which is the same
 *      comparison, minus the partner branch.
 *
 * Order is the queue's (`index.tsx`) and tokens.md §10's eye flow: eyebrow →
 * headline → the list → the one black button. No duo-row: tokens.md §9 puts
 * the characters on the queue and the welcome, and nowhere else.
 *
 * **Two behaviours are new**, and deliberately:
 *
 *   - An empty Options tab used to render *nothing at all* once the welcome
 *     flag was set — the same hole the queue had. It now renders a tile.
 *   - Deleting a list asks first. Chase's ruling of 2026-09-20 was about
 *     decisions; the reason it gave is exactly as true of a list (both people
 *     lose it, and nothing in the app undoes anything), so it extends.
 */

/** The blank draft — reset to this in two places, so it is one constant. */
const EMPTY_LIST: CreateListFormValue = { title: "", description: "", options: [] };

/**
 * A list's seat. `null` creator → `neutral`: the column is nullable and old
 * rows have nothing in it, and inventing a seat for those would put a colour
 * on a card that means nothing.
 */
function listState(
	creatorId: string | null | undefined,
	userId: string | null | undefined,
	partnerId: string | null | undefined,
): Extract<CardState, "neutral" | "a" | "b"> {
	if (creatorId == null) return "neutral";
	if (userId != null && creatorId === userId) return "a";
	if (partnerId != null && creatorId === partnerId) return "b";
	return "neutral";
}

/** §1.11: the trash circle is the creator's, and nobody else's. */
function canDeleteList(
	creatorId: string | null | undefined,
	userId: string | null | undefined,
): boolean {
	return creatorId != null && userId != null && creatorId === userId;
}

/**
 * The empty tab.
 *
 * The tile is the button — it carries `Tile`'s own arrow affordance and opens
 * the same drawer the footer pill does. It deliberately has **no** button of
 * its own inside it, and no illustration: tokens.md §9 keeps the characters
 * on the queue and the welcome, and two controls with the same accessible
 * name on one screen is a thing a screen reader cannot disambiguate
 * (the same reasoning as `EmptyQueue`).
 */
function EmptyLists({ onCreate }: { onCreate: () => void }) {
	return (
		<View testID="options-empty" className="mb-3">
			<Tile
				title="No lists yet"
				subtitle="Save the options you choose between often — dinner spots, date nights, weekend plans — and reuse them on any decision."
				tint="surface-2"
				onPress={onCreate}
			/>
		</View>
	);
}

export default function Options() {
	const {
		showDrawer,
		hideDrawer,
		updateContent,
		isVisible: isDrawerVisible,
		drawerType,
	} = useDrawer();

	const { userContext, loading: userLoading, error: userError } = useUserContext();
	const {
		optionLists,
		loading: listsLoading,
		error: listsError,
		createList,
		updateList,
		deleteList,
	} = useOptionLists();

	// Onboarding flag (AsyncStorage) — null = not loaded yet, which is why the
	// welcome card tests `=== false` rather than falsiness.
	const [seenWelcomeOptions, setSeenWelcomeOptionsState] = useState<boolean | null>(null);

	// Local UI state
	const [expandedListIds, setExpandedListIds] = useState<Set<string>>(new Set());
	const [allCollapsed, setAllCollapsed] = useState(false);
	const [draft, setDraft] = useState<CreateListFormValue>(EMPTY_LIST);
	/** True while the create write is in flight — the sheet's `submitting`. */
	const [creating, setCreating] = useState(false);

	const loading = userLoading || listsLoading;
	const error = userError || listsError;

	const handleToggleAll = () => {
		const newCollapsedState = !allCollapsed;
		setAllCollapsed(newCollapsedState);
		setExpandedListIds(newCollapsedState ? new Set() : new Set(optionLists.map((list) => list.id)));
	};

	const handleToggleList = (listId: string) => {
		setExpandedListIds((prev) => {
			const next = new Set(prev);
			if (next.has(listId)) next.delete(listId);
			else next.add(listId);
			return next;
		});
	};

	/**
	 * The card hands up its rows; the list's title and description are
	 * unchanged, so they are read back off the list and passed through — the
	 * same three arguments `updateList` took before.
	 */
	const handleUpdateListOptions = async (listId: string, newOptions: EditableOption[]) => {
		const list = optionLists.find((candidate) => candidate.id === listId);
		if (!list) return;

		await updateList(listId, { title: list.title, description: list.description || "" }, newOptions);
	};

	const handleCancelCreate = useCallback(() => {
		hideDrawer();
		setDraft(EMPTY_LIST);
	}, [hideDrawer]);

	const handleCreate = useCallback(async () => {
		if (!draft.title.trim() || !userContext?.coupleId) return;

		// A row the user typed into but never confirmed with ✓ is still on the
		// list (§1.11). A row they never typed into is not.
		const optionsToSave = draft.options.filter((option) => option.title.trim());

		setCreating(true);
		try {
			const result = await createList(
				{
					couple_id: userContext.coupleId,
					title: draft.title,
					description: draft.description || "",
					creator_id: userContext.userId,
				},
				optionsToSave,
			);

			if (result) {
				hideDrawer();
				setDraft(EMPTY_LIST);
			}
		} finally {
			setCreating(false);
		}
	}, [draft, userContext, createList, hideDrawer]);

	const renderCreateListContent = useCallback(
		() => (
			<CreateListForm
				value={draft}
				onChange={setDraft}
				onSubmit={handleCreate}
				onCancel={handleCancelCreate}
				submitting={creating}
			/>
		),
		[draft, handleCreate, handleCancelCreate, creating],
	);

	const showCreateListDrawer = useCallback(() => {
		setDraft(EMPTY_LIST);
		showDrawer("Create New List", renderCreateListContent(), { type: "createList" });
	}, [showDrawer, renderCreateListContent]);

	// Load the onboarding flag.
	useEffect(() => {
		if (!userContext?.userId) return;
		let cancelled = false;
		getSeenWelcomeOptions(userContext.userId).then((seen) => {
			if (!cancelled) setSeenWelcomeOptionsState(seen);
		});
		return () => {
			cancelled = true;
		};
	}, [userContext?.userId]);

	// Re-push the sheet's content as the draft changes. Guarded by `drawerType`
	// so the confirm-delete sheet is never overwritten by the form.
	//
	// The render callback is the dependency, not the values it happens to read
	// — see the same effect in index.tsx for why.
	useEffect(() => {
		if (isDrawerVisible && drawerType === "createList") {
			updateContent(renderCreateListContent());
		}
	}, [renderCreateListContent, updateContent, isDrawerVisible, drawerType]);

	const handleDismissWelcomeOptions = useCallback(async () => {
		if (!userContext?.userId) return;
		await setSeenWelcomeOptions(userContext.userId);
		setSeenWelcomeOptionsState(true);
	}, [userContext?.userId]);

	/**
	 * Delete asks first — Chase's ruling of 2026-09-20, extended from
	 * decisions to lists for the same reason.
	 *
	 * The second sentence is checked against `lib/database.ts`:
	 * `createDecision` copies option *titles* into `decision_options`, and
	 * nothing in that table or in `schema.sql` points back at
	 * `option_list_items`. Deleting a list cascades to its own items and
	 * touches no decision.
	 */
	const confirmDelete = useCallback(
		(list: { id: string; title: string }) => {
			showDrawer(
				"Delete this list?",
				<ConfirmDelete
					title={list.title}
					message={`“${list.title}” and its options are removed for both of you. Decisions you already made from it keep their options.`}
					onCancel={hideDrawer}
					onConfirm={() => {
						void deleteList(list.id);
						hideDrawer();
					}}
				/>,
				{ type: "confirmDelete" },
			);
		},
		[showDrawer, hideDrawer, deleteList],
	);

	if (loading) {
		return (
			<ContentLayout scrollable={true}>
				<View className="flex-1 items-center justify-center">
					<Caption>Loading option lists…</Caption>
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
						<Eyebrow>Options</Eyebrow>
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
						Lists you <Display.Strong>reach for again</Display.Strong>
					</Display>
				</View>

				{/* First run on this tab, with nothing saved yet. */}
				{optionLists.length === 0 && seenWelcomeOptions === false && userContext && (
					<IntroCard content={WELCOME_OPTIONS} onDismiss={handleDismissWelcomeOptions} />
				)}

				{/* The empty tab itself — shown whatever the welcome flag says. */}
				{optionLists.length === 0 && <EmptyLists onCreate={showCreateListDrawer} />}

				<ResponsiveCardList>
					{optionLists.map((list, index) => (
						<StaggerIn key={list.id} index={index}>
							<OptionListCard
								list={{
									id: list.id,
									title: list.title,
									description: list.description || "",
									options: list.items,
									expanded: expandedListIds.has(list.id),
								}}
								state={listState(list.creator_id, userContext?.userId, userContext?.partnerId)}
								canDelete={canDeleteList(list.creator_id, userContext?.userId)}
								onToggle={() => handleToggleList(list.id)}
								onDelete={() => confirmDelete(list)}
								onOptionsUpdate={(newOptions) => handleUpdateListOptions(list.id, newOptions)}
							/>
						</StaggerIn>
					))}
				</ResponsiveCardList>
			</ContentLayout>

			<FixedFooter background="transparent">
				<FooterPill label="Create List" onPress={showCreateListDrawer} />
			</FixedFooter>
		</View>
	);
}
