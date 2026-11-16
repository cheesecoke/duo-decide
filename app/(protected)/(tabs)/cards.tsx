import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View } from "react-native";

import { AddCardForm, EMPTY_CARD, type AddCardFormValue } from "@/components/cards/add-card-form";
import {
	ResponsibilityCard,
	type CardSeat,
} from "@/components/cards/responsibility-card/responsibility-card";
import { ConfirmDelete } from "@/components/decision-queue/confirm-delete/confirm-delete";
import { ContentLayout, ResponsiveCardList } from "@/components/layout";
import { ErrorStrip } from "@/components/layout/error-strip";
import { FIXED_FOOTER_HEIGHT, FixedFooter } from "@/components/layout/FixedFooter";
import { FooterPill } from "@/components/layout/footer-pill";
import { StaggerIn } from "@/components/layout/stagger-in";
import { Chip } from "@/components/ui/reusables/chip/chip";
import { Caption, Display, Eyebrow } from "@/components/ui/reusables/headline/headline";
import { Tile } from "@/components/ui/reusables/tile/tile";
import { useDrawer } from "@/context/drawer-provider";
import { useResponsibilityCards } from "@/context/responsibility-cards-provider";
import { useUserContext } from "@/context/user-context-provider";
import {
	CARD_CATEGORIES,
	CATEGORY_LABEL,
	STARTER_DECK,
	toCardCategory,
	type CardCategory,
} from "@/lib/responsibility-deck";
import type { ResponsibilityCard as CardRow } from "@/types/database";

/**
 * Cards: the couple's responsibilities, and who holds each one.
 *
 * Presentation and wiring only; `useResponsibilityCards` owns the data. The
 * card component is pure, so this file owns the one thing it cannot know:
 * **whose seat a holder is.** The viewer is always A (CLAUDE.md, the two-hue
 * person system), so a card held by the signed-in user is `"a"`, one held by
 * their partner is `"b"`, and anything else, including a holder who has left
 * the couple, is `"none"`.
 *
 * Order is the Options tab's: eyebrow → headline → the cards → the one black
 * button. The filter chips double as the tally ("You 12"), so who is carrying
 * how much is on screen before anything is tapped.
 *
 * Removing a card asks first, for the reason deleting a list does: both people
 * lose it.
 */

type Filter = "all" | CardSeat;

/** A holder's user id, as the viewer's seat. */
function seatOf(
	holderId: string | null | undefined,
	userId: string | null | undefined,
	partnerId: string | null | undefined,
): CardSeat {
	if (holderId == null) return "none";
	if (userId != null && holderId === userId) return "a";
	if (partnerId != null && holderId === partnerId) return "b";
	return "none";
}

/** Cards in one category, daily ones first, then by title. */
function sortCards(cards: CardRow[]): CardRow[] {
	return [...cards].sort(
		(x, y) => Number(y.daily) - Number(x.daily) || x.title.localeCompare(y.title),
	);
}

function EmptyDeck({ onStart, busy }: { onStart: () => void; busy: boolean }) {
	return (
		<View testID="cards-empty" className="mb-3">
			<Tile
				title={busy ? "Dealing the deck…" : "Start with the starter deck"}
				subtitle={`${STARTER_DECK.length} everyday jobs, from trash to date nights, ready to share out between you. Remove any you don't need and add your own.`}
				tint="surface-2"
				onPress={onStart}
			/>
		</View>
	);
}

export default function Cards() {
	const {
		showDrawer,
		hideDrawer,
		updateContent,
		isVisible: isDrawerVisible,
		drawerType,
	} = useDrawer();

	const { userContext, loading: userLoading, error: userError } = useUserContext();
	const {
		cards,
		loading: cardsLoading,
		error: cardsError,
		addDeck,
		addCard,
		dealCard,
		removeCard,
	} = useResponsibilityCards();

	const [filter, setFilter] = useState<Filter>("all");
	const [draft, setDraft] = useState<AddCardFormValue>(EMPTY_CARD);
	const [adding, setAdding] = useState(false);
	const [startingDeck, setStartingDeck] = useState(false);

	const userId = userContext?.userId ?? null;
	const partnerId = userContext?.partnerId ?? null;
	const partnerLabel = partnerId ? (userContext?.partnerName ?? "Partner") : null;

	const loading = userLoading || cardsLoading;
	const error = userError || cardsError;

	const seated = useMemo(
		() => cards.map((card) => ({ card, seat: seatOf(card.holder_id, userId, partnerId) })),
		[cards, userId, partnerId],
	);

	const tally = useMemo(() => {
		const counts: Record<CardSeat, number> = { a: 0, b: 0, none: 0 };
		for (const { seat } of seated) counts[seat] += 1;
		return counts;
	}, [seated]);

	const sections = useMemo(() => {
		const shown = filter === "all" ? seated : seated.filter(({ seat }) => seat === filter);
		const seatById = new Map(shown.map(({ card, seat }) => [card.id, seat]));
		return CARD_CATEGORIES.map((category: CardCategory) => ({
			category,
			cards: sortCards(
				shown.map(({ card }) => card).filter((card) => toCardCategory(card.category) === category),
			).map((card) => ({ card, seat: seatById.get(card.id) ?? "none" })),
		})).filter((section) => section.cards.length > 0);
	}, [seated, filter]);

	const seatToHolder = useCallback(
		(seat: CardSeat): string | null => (seat === "a" ? userId : seat === "b" ? partnerId : null),
		[userId, partnerId],
	);

	const handleStartDeck = useCallback(async () => {
		if (startingDeck) return;
		setStartingDeck(true);
		try {
			await addDeck();
		} finally {
			setStartingDeck(false);
		}
	}, [addDeck, startingDeck]);

	const handleCancelAdd = useCallback(() => {
		hideDrawer();
		setDraft(EMPTY_CARD);
	}, [hideDrawer]);

	const handleAdd = useCallback(async () => {
		if (!draft.title.trim()) return;

		setAdding(true);
		try {
			const added = await addCard({
				title: draft.title,
				category: draft.category,
				daily: draft.daily,
				holderId: seatToHolder(draft.holder),
			});
			if (added) {
				hideDrawer();
				setDraft(EMPTY_CARD);
			}
		} finally {
			setAdding(false);
		}
	}, [draft, addCard, seatToHolder, hideDrawer]);

	const renderAddCardContent = useCallback(
		() => (
			<AddCardForm
				value={draft}
				onChange={setDraft}
				onSubmit={handleAdd}
				onCancel={handleCancelAdd}
				partnerLabel={partnerLabel}
				submitting={adding}
			/>
		),
		[draft, handleAdd, handleCancelAdd, partnerLabel, adding],
	);

	const showAddCardDrawer = useCallback(() => {
		setDraft(EMPTY_CARD);
		showDrawer("Add a card", renderAddCardContent(), { type: "addCard" });
	}, [showDrawer, renderAddCardContent]);

	// Re-push the sheet's content as the draft changes. Guarded by `drawerType`
	// so the confirm sheet is never overwritten by the form (see options.tsx).
	useEffect(() => {
		if (isDrawerVisible && drawerType === "addCard") {
			updateContent(renderAddCardContent());
		}
	}, [renderAddCardContent, updateContent, isDrawerVisible, drawerType]);

	const confirmRemove = useCallback(
		(card: { id: string; title: string }) => {
			showDrawer(
				"Remove this card?",
				<ConfirmDelete
					title={card.title}
					message={`“${card.title}” leaves the deck for both of you.`}
					onCancel={hideDrawer}
					onConfirm={() => {
						void removeCard(card.id);
						hideDrawer();
					}}
				/>,
				{ type: "confirmDelete" },
			);
		},
		[showDrawer, hideDrawer, removeCard],
	);

	if (loading) {
		return (
			<ContentLayout scrollable={true}>
				<View className="flex-1 items-center justify-center">
					<Caption>Loading cards…</Caption>
				</View>
			</ContentLayout>
		);
	}

	const filters: { value: Filter; label: string; person?: "a" | "b" }[] = [
		{ value: "all", label: `All ${cards.length}` },
		{ value: "a", label: `You ${tally.a}`, person: "a" },
		...(partnerLabel
			? [{ value: "b" as const, label: `${partnerLabel} ${tally.b}`, person: "b" as const }]
			: []),
		{ value: "none", label: `Not dealt ${tally.none}` },
	];

	return (
		<View className="flex-1">
			<ContentLayout scrollable={true} footerInset={FIXED_FOOTER_HEIGHT}>
				{error ? <ErrorStrip message={error} /> : null}

				<View className="mb-6">
					<Eyebrow>Cards</Eyebrow>
					<Display className="mt-2">
						Who&apos;s <Display.Strong>holding what</Display.Strong>
					</Display>
				</View>

				{cards.length === 0 ? (
					<EmptyDeck onStart={handleStartDeck} busy={startingDeck} />
				) : (
					<View
						role="radiogroup"
						accessibilityLabel="Show cards held by"
						className="mb-5 flex-row flex-wrap gap-2"
					>
						{filters.map((option) => (
							<Chip
								key={option.value}
								role="radio"
								size="sm"
								person={option.person}
								label={option.label}
								selected={filter === option.value}
								onPress={() => setFilter(option.value)}
							/>
						))}
					</View>
				)}

				{cards.length > 0 && sections.length === 0 ? (
					<Caption testID="cards-filter-empty" className="text-ink-3">
						No cards here.
					</Caption>
				) : null}

				{sections.map((section) => (
					<View key={section.category} testID={`cards-section-${section.category}`} className="mb-3">
						<Caption className="mb-2 text-ink-3">{CATEGORY_LABEL[section.category]}</Caption>
						<ResponsiveCardList>
							{section.cards.map(({ card, seat }, index) => (
								<StaggerIn key={card.id} index={index}>
									<ResponsibilityCard
										title={card.title}
										category={section.category}
										daily={card.daily}
										holder={seat}
										partnerLabel={partnerLabel}
										onDeal={(next) => void dealCard(card.id, seatToHolder(next))}
										onRemove={() => confirmRemove(card)}
									/>
								</StaggerIn>
							))}
						</ResponsiveCardList>
					</View>
				))}
			</ContentLayout>

			<FixedFooter background="transparent">
				<FooterPill label="Add card" onPress={showAddCardDrawer} />
			</FixedFooter>
		</View>
	);
}
