import React, {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
	type ReactNode,
} from "react";

import { useRealtimeStatus } from "@/context/realtime-status-context";
import {
	addStarterDeck,
	createResponsibilityCard,
	dayKey,
	getCardCompletions,
	getResponsibilityCards,
	markCardDone,
	removeResponsibilityCard,
	setCardHolder,
	subscribeToResponsibilityCards,
	undoCardDone,
} from "@/lib/responsibility-cards";
import type { CardCategory } from "@/lib/responsibility-deck";
import type { CardCompletion, ResponsibilityCard } from "@/types/database";

interface NewCard {
	title: string;
	category: CardCategory;
	daily: boolean;
	holderId: string | null;
}

interface ResponsibilityCardsContextType {
	cards: ResponsibilityCard[];
	/** "Done" marks from the last 30 days, newest first. */
	completions: CardCompletion[];
	loading: boolean;
	error: string | null;
	/** Adds the app's starter deck. True when it landed. */
	addDeck: () => Promise<boolean>;
	/** Adds a card the couple wrote. True when it landed. */
	addCard: (card: NewCard) => Promise<boolean>;
	/** Deals a card to one partner, or back to nobody (`null`). */
	dealCard: (cardId: string, holderId: string | null) => Promise<void>;
	removeCard: (cardId: string) => Promise<void>;
	/** Marks a card done by the signed-in user, today. */
	markDone: (cardId: string) => Promise<void>;
	/** Takes back the signed-in user's mark on a card for today. */
	undoDone: (cardId: string) => Promise<void>;
}

const ResponsibilityCardsContext = createContext<ResponsibilityCardsContextType | undefined>(
	undefined,
);

/**
 * The couple's responsibility cards, kept live.
 *
 * Same contract as `OptionListsProvider`, for the same reason: `loading` is a
 * **first-load** flag. It is true until the first fetch for a couple settles,
 * and no later fetch (realtime, reconnect) raises it again, so the Cards
 * screen is never torn down under someone who is dealing.
 *
 * Dealing, removing and marking done are optimistic: the card changes at once
 * and is put back if the write fails. A deal is one tap repeated twenty times on a new deck,
 * and waiting on the network for each would make it feel broken.
 */
export function ResponsibilityCardsProvider({
	children,
	coupleId,
	userId,
}: {
	children: ReactNode;
	coupleId: string | null;
	userId: string | null;
}) {
	const [cards, setCards] = useState<ResponsibilityCard[]>([]);
	const [completions, setCompletions] = useState<CardCompletion[]>([]);
	const [loading, setLoading] = useState(coupleId != null);
	const [error, setError] = useState<string | null>(null);
	const { setReconnecting, registerRefetch, runRefetches } = useRealtimeStatus();
	const refreshRef = useRef<() => Promise<void>>(async () => {});
	const firstFetchStartedFor = useRef<string | null>(null);
	/** The cards as last rendered, for the optimistic writes below. */
	const cardsRef = useRef<ResponsibilityCard[]>([]);
	cardsRef.current = cards;

	const loadCards = useCallback(async () => {
		if (!coupleId) {
			firstFetchStartedFor.current = null;
			setCards([]);
			setCompletions([]);
			setLoading(false);
			return;
		}

		const isFirstFetch = firstFetchStartedFor.current !== coupleId;
		if (isFirstFetch) {
			firstFetchStartedFor.current = coupleId;
			setLoading(true);
		}

		try {
			const [result, done] = await Promise.all([
				getResponsibilityCards(coupleId),
				getCardCompletions(coupleId),
			]);
			if (result.error) {
				setError(result.error);
			} else {
				setError(done.error);
				setCards(result.data ?? []);
				if (!done.error) setCompletions(done.data ?? []);
			}
		} catch (err) {
			console.error("Error loading responsibility cards:", err);
			setError("Failed to load cards");
		} finally {
			if (isFirstFetch) setLoading(false);
		}
	}, [coupleId]);

	refreshRef.current = loadCards;

	useEffect(() => {
		void loadCards();
	}, [loadCards]);

	useEffect(() => {
		if (!coupleId) return;

		const unregisterRefetch = registerRefetch(() => refreshRef.current());

		const channel = subscribeToResponsibilityCards(
			coupleId,
			() => {
				void loadCards();
			},
			(status) => {
				if (status === "CLOSED" || status === "CHANNEL_ERROR") {
					setReconnecting(true);
				} else if (status === "SUBSCRIBED") {
					setReconnecting(false);
					runRefetches();
				}
			},
		);

		return () => {
			unregisterRefetch();
			void channel.unsubscribe();
		};
	}, [coupleId, loadCards, registerRefetch, setReconnecting, runRefetches]);

	const addDeck = useCallback(async (): Promise<boolean> => {
		if (!coupleId || !userId) return false;
		setError(null);

		const result = await addStarterDeck(coupleId, userId);
		if (result.error) {
			setError(result.error);
			return false;
		}
		await loadCards();
		return true;
	}, [coupleId, userId, loadCards]);

	const addCard = useCallback(
		async (card: NewCard): Promise<boolean> => {
			if (!coupleId || !userId) return false;
			setError(null);

			const result = await createResponsibilityCard({ coupleId, userId, ...card });
			if (result.error || !result.data) {
				setError(result.error ?? "Failed to add card");
				return false;
			}

			const created = result.data;
			// The realtime echo may have delivered it already.
			setCards((prev) => (prev.some((c) => c.id === created.id) ? prev : [...prev, created]));
			return true;
		},
		[coupleId, userId],
	);

	const dealCard = useCallback(async (cardId: string, holderId: string | null): Promise<void> => {
		const before = cardsRef.current.find((card) => card.id === cardId);
		if (!before || before.holder_id === holderId) return;
		setError(null);

		const withHolder = (holder: string | null) => (prev: ResponsibilityCard[]) =>
			prev.map((card) => (card.id === cardId ? { ...card, holder_id: holder } : card));

		setCards(withHolder(holderId));

		const result = await setCardHolder(cardId, holderId);
		if (result.error) {
			setError(result.error);
			setCards(withHolder(before.holder_id));
		}
	}, []);

	const removeCard = useCallback(
		async (cardId: string): Promise<void> => {
			if (!userId) return;
			setError(null);

			setCards((prev) => prev.filter((card) => card.id !== cardId));

			const result = await removeResponsibilityCard(cardId, userId);
			if (result.error) {
				// Simplest correct recovery: read the truth back. The error is
				// set after, because a successful read clears it.
				await loadCards();
				setError(result.error);
			}
		},
		[userId, loadCards],
	);

	const markDone = useCallback(
		async (cardId: string): Promise<void> => {
			if (!coupleId || !userId) return;
			const day = dayKey(new Date());
			const isMine = (c: CardCompletion) =>
				c.card_id === cardId && c.done_by === userId && c.done_on === day;
			setError(null);

			const optimistic: CardCompletion = {
				id: `pending-${cardId}-${day}`,
				card_id: cardId,
				couple_id: coupleId,
				done_by: userId,
				done_on: day,
				undone_at: null,
				created_at: new Date().toISOString(),
			};
			// Already marked (a double tap, or the realtime echo): nothing to add.
			setCompletions((prev) => (prev.some(isMine) ? prev : [optimistic, ...prev]));

			const result = await markCardDone({ cardId, coupleId, userId, day });
			if (result.error) {
				setError(result.error);
				setCompletions((prev) => prev.filter((c) => c.id !== optimistic.id));
				return;
			}
			const saved = result.data;
			if (saved) {
				setCompletions((prev) => [saved, ...prev.filter((c) => !isMine(c))]);
			}
		},
		[coupleId, userId],
	);

	const undoDone = useCallback(
		async (cardId: string): Promise<void> => {
			if (!userId) return;
			const day = dayKey(new Date());
			setError(null);

			setCompletions((prev) =>
				prev.filter((c) => !(c.card_id === cardId && c.done_by === userId && c.done_on === day)),
			);

			const result = await undoCardDone({ cardId, userId, day });
			if (result.error) {
				await loadCards();
				setError(result.error);
			}
		},
		[userId, loadCards],
	);

	const value: ResponsibilityCardsContextType = {
		cards,
		completions,
		loading,
		error,
		addDeck,
		addCard,
		dealCard,
		removeCard,
		markDone,
		undoDone,
	};

	return (
		<ResponsibilityCardsContext.Provider value={value}>
			{children}
		</ResponsibilityCardsContext.Provider>
	);
}

export function useResponsibilityCards() {
	const context = useContext(ResponsibilityCardsContext);
	if (context === undefined) {
		throw new Error("useResponsibilityCards must be used within a ResponsibilityCardsProvider");
	}
	return context;
}

export type { NewCard };
