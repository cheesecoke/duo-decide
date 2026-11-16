import * as React from "react";
import { Text } from "react-native";
import { act, render, screen, waitFor } from "@testing-library/react-native";

import type { CardCompletion, ResponsibilityCard } from "@/types/database";

/**
 * ResponsibilityCardsProvider: the first-load `loading` contract it shares
 * with OptionListsProvider, and the optimistic deal / remove.
 *
 * `lib/responsibility-cards` is mocked at the module boundary;
 * `RealtimeStatusProvider` is the real one.
 */

const mockDb = {
	getResponsibilityCards: jest.fn(),
	addStarterDeck: jest.fn(),
	createResponsibilityCard: jest.fn(),
	setCardHolder: jest.fn(),
	removeResponsibilityCard: jest.fn(),
	subscribeToResponsibilityCards: jest.fn(),
	getCardCompletions: jest.fn(),
	markCardDone: jest.fn(),
	undoCardDone: jest.fn(),
};

jest.mock("@/lib/responsibility-cards", () => ({
	dayKey: () => "2026-11-15",
	getCardCompletions: (...args: unknown[]) => mockDb.getCardCompletions(...args),
	markCardDone: (...args: unknown[]) => mockDb.markCardDone(...args),
	undoCardDone: (...args: unknown[]) => mockDb.undoCardDone(...args),
	getResponsibilityCards: (...args: unknown[]) => mockDb.getResponsibilityCards(...args),
	addStarterDeck: (...args: unknown[]) => mockDb.addStarterDeck(...args),
	createResponsibilityCard: (...args: unknown[]) => mockDb.createResponsibilityCard(...args),
	setCardHolder: (...args: unknown[]) => mockDb.setCardHolder(...args),
	removeResponsibilityCard: (...args: unknown[]) => mockDb.removeResponsibilityCard(...args),
	subscribeToResponsibilityCards: (...args: unknown[]) =>
		mockDb.subscribeToResponsibilityCards(...args),
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const {
	ResponsibilityCardsProvider,
	useResponsibilityCards,
} = require("@/context/responsibility-cards-provider");
const { RealtimeStatusProvider } = require("@/context/realtime-status-context");
/* eslint-enable @typescript-eslint/no-require-imports */

type Result<T> = { data: T | null; error: string | null };

function deferred<T>() {
	let settle: (value: T) => void = () => {};
	const promise = new Promise<T>((resolve) => {
		settle = resolve;
	});
	return { promise, settle };
}

function card(over: Partial<ResponsibilityCard> = {}): ResponsibilityCard {
	return {
		id: "c1",
		couple_id: "couple-1",
		title: "Trash & recycling",
		category: "home",
		daily: true,
		holder_id: null,
		deck_key: "trash",
		created_by: "user-1",
		removed_at: null,
		removed_by: null,
		created_at: "2026-11-15T00:00:00Z",
		updated_at: "2026-11-15T00:00:00Z",
		...over,
	};
}

let api: ReturnType<typeof useResponsibilityCards>;
let onRealtime: () => void = () => {};

function Probe() {
	api = useResponsibilityCards();
	return (
		<Text testID="probe">
			{api.loading ? "loading" : "ready"}|{api.error ?? "ok"}|
			{api.cards.map((c: ResponsibilityCard) => `${c.title}:${c.holder_id ?? "-"}`).join(",")}
		</Text>
	);
}

const probe = () => screen.getByTestId("probe").props.children.join("");

function renderProvider(coupleId: string | null = "couple-1") {
	return render(
		<RealtimeStatusProvider>
			<ResponsibilityCardsProvider coupleId={coupleId} userId="user-1">
				<Probe />
			</ResponsibilityCardsProvider>
		</RealtimeStatusProvider>,
	);
}

beforeEach(() => {
	jest.clearAllMocks();
	mockDb.getResponsibilityCards.mockResolvedValue({ data: [card()], error: null });
	mockDb.getCardCompletions.mockResolvedValue({ data: [], error: null });
	mockDb.subscribeToResponsibilityCards.mockImplementation(
		(_couple: string, onChange: () => void) => {
			onRealtime = onChange;
			return { unsubscribe: jest.fn() };
		},
	);
});

describe("loading", () => {
	it("is true for the first fetch and never again", async () => {
		const first = deferred<Result<ResponsibilityCard[]>>();
		mockDb.getResponsibilityCards.mockReturnValueOnce(first.promise);
		renderProvider();
		expect(probe()).toBe("loading|ok|");

		await act(async () => first.settle({ data: [card()], error: null }));
		expect(probe()).toBe("ready|ok|Trash & recycling:-");

		const second = deferred<Result<ResponsibilityCard[]>>();
		mockDb.getResponsibilityCards.mockReturnValueOnce(second.promise);
		act(() => onRealtime());
		// Held open: a background refetch must not tear the screen down.
		expect(probe()).toBe("ready|ok|Trash & recycling:-");

		await act(async () => second.settle({ data: [card({ holder_id: "user-2" })], error: null }));
		expect(probe()).toBe("ready|ok|Trash & recycling:user-2");
	});

	it("has nothing to wait for without a couple", () => {
		renderProvider(null);

		expect(probe()).toBe("ready|ok|");
		expect(mockDb.getResponsibilityCards).not.toHaveBeenCalled();
	});

	it("keeps the cards it has when a refetch fails", async () => {
		renderProvider();
		await waitFor(() => expect(probe()).toBe("ready|ok|Trash & recycling:-"));

		mockDb.getResponsibilityCards.mockResolvedValueOnce({ data: null, error: "offline" });
		await act(async () => onRealtime());

		expect(probe()).toBe("ready|offline|Trash & recycling:-");
	});
});

describe("dealing", () => {
	it("moves the card at once, before the write lands", async () => {
		const write = deferred<Result<ResponsibilityCard>>();
		mockDb.setCardHolder.mockReturnValue(write.promise);
		renderProvider();
		await waitFor(() => expect(probe()).toContain("Trash"));

		let done: Promise<void> = Promise.resolve();
		act(() => {
			done = api.dealCard("c1", "user-2");
		});
		expect(probe()).toBe("ready|ok|Trash & recycling:user-2");
		expect(mockDb.setCardHolder).toHaveBeenCalledWith("c1", "user-2");

		await act(async () => {
			write.settle({ data: card({ holder_id: "user-2" }), error: null });
			await done;
		});
		expect(probe()).toBe("ready|ok|Trash & recycling:user-2");
	});

	it("puts the card back where it was when the write fails", async () => {
		mockDb.setCardHolder.mockResolvedValue({ data: null, error: "nope" });
		renderProvider();
		await waitFor(() => expect(probe()).toContain("Trash"));

		await act(async () => api.dealCard("c1", "user-2"));

		expect(probe()).toBe("ready|nope|Trash & recycling:-");
	});

	it("writes nothing when the card is already there", async () => {
		renderProvider();
		await waitFor(() => expect(probe()).toContain("Trash"));

		await act(async () => api.dealCard("c1", null));

		expect(mockDb.setCardHolder).not.toHaveBeenCalled();
	});
});

describe("the deck", () => {
	it("adds the starter deck as this user and reads the cards back", async () => {
		mockDb.addStarterDeck.mockResolvedValue({ data: true, error: null });
		renderProvider();
		await waitFor(() => expect(probe()).toContain("Trash"));

		mockDb.getResponsibilityCards.mockResolvedValueOnce({
			data: [card(), card({ id: "c2", title: "Car" })],
			error: null,
		});
		let ok = false;
		await act(async () => {
			ok = await api.addDeck();
		});

		expect(ok).toBe(true);
		expect(mockDb.addStarterDeck).toHaveBeenCalledWith("couple-1", "user-1");
		expect(probe()).toBe("ready|ok|Trash & recycling:-,Car:-");
	});

	it("adds a written card once, even if realtime delivered it first", async () => {
		const created = card({ id: "c9", title: "Taxes", deck_key: null });
		mockDb.createResponsibilityCard.mockResolvedValue({ data: created, error: null });
		renderProvider();
		await waitFor(() => expect(probe()).toContain("Trash"));

		const draft = { title: "Taxes", category: "out", daily: false, holderId: null };
		await act(async () => api.addCard(draft));
		await act(async () => api.addCard(draft));

		expect(mockDb.createResponsibilityCard).toHaveBeenCalledWith({
			coupleId: "couple-1",
			userId: "user-1",
			...draft,
		});
		expect(probe()).toBe("ready|ok|Trash & recycling:-,Taxes:-");
	});

	it("removes at once, and reads the truth back if the write fails", async () => {
		mockDb.removeResponsibilityCard.mockResolvedValue({ data: null, error: "nope" });
		renderProvider();
		await waitFor(() => expect(probe()).toContain("Trash"));

		await act(async () => api.removeCard("c1"));

		expect(mockDb.removeResponsibilityCard).toHaveBeenCalledWith("c1", "user-1");
		// The refetch after the failure brought it back.
		expect(probe()).toBe("ready|nope|Trash & recycling:-");
	});
});

describe("marking done", () => {
	const saved: CardCompletion = {
		id: "m1",
		card_id: "c1",
		couple_id: "couple-1",
		done_by: "user-1",
		done_on: "2026-11-15",
		undone_at: null,
		created_at: "2026-11-15T18:00:00Z",
	};
	const marks = () => api.completions.map((c: CardCompletion) => `${c.card_id}:${c.id}`).join(",");

	it("loads the couple's marks with the cards", async () => {
		mockDb.getCardCompletions.mockResolvedValue({ data: [saved], error: null });
		renderProvider();

		await waitFor(() => expect(marks()).toBe("c1:m1"));
	});

	it("shows the mark at once, then swaps in the saved row", async () => {
		const write = deferred<Result<CardCompletion>>();
		mockDb.markCardDone.mockReturnValue(write.promise);
		renderProvider();
		await waitFor(() => expect(probe()).toContain("ready"));

		let done: Promise<void> = Promise.resolve();
		act(() => {
			done = api.markDone("c1");
		});
		expect(marks()).toBe("c1:pending-c1-2026-11-15");
		expect(mockDb.markCardDone).toHaveBeenCalledWith({
			cardId: "c1",
			coupleId: "couple-1",
			userId: "user-1",
			day: "2026-11-15",
		});

		await act(async () => {
			write.settle({ data: saved, error: null });
			await done;
		});
		expect(marks()).toBe("c1:m1");
	});

	it("is one mark however many times it is tapped", async () => {
		mockDb.markCardDone
			.mockResolvedValueOnce({ data: saved, error: null })
			// The database refuses the second: reported as success with no row.
			.mockResolvedValueOnce({ data: null, error: null });
		renderProvider();
		await waitFor(() => expect(probe()).toContain("ready"));

		await act(async () => {
			await api.markDone("c1");
		});
		await act(async () => {
			await api.markDone("c1");
		});

		expect(marks()).toBe("c1:m1");
	});

	it("takes the mark off again when the write fails, and says why", async () => {
		mockDb.markCardDone.mockResolvedValue({ data: null, error: "offline" });
		renderProvider();
		await waitFor(() => expect(probe()).toContain("ready"));

		await act(async () => {
			await api.markDone("c1");
		});

		expect(marks()).toBe("");
		expect(probe()).toContain("|offline|");
	});

	it("takes back today's own mark, and leaves the partner's", async () => {
		const theirs = { ...saved, id: "m2", done_by: "user-2" };
		mockDb.getCardCompletions.mockResolvedValue({ data: [saved, theirs], error: null });
		mockDb.undoCardDone.mockResolvedValue({ data: true, error: null });
		renderProvider();
		await waitFor(() => expect(marks()).toBe("c1:m1,c1:m2"));

		await act(async () => {
			await api.undoDone("c1");
		});

		expect(marks()).toBe("c1:m2");
		expect(mockDb.undoCardDone).toHaveBeenCalledWith({
			cardId: "c1",
			userId: "user-1",
			day: "2026-11-15",
		});
	});

	it("logs and takes back an earlier day, keeping the newest day first", async () => {
		const earlier = { ...saved, id: "m0", done_on: "2026-11-12" };
		mockDb.getCardCompletions.mockResolvedValue({ data: [saved], error: null });
		mockDb.markCardDone.mockResolvedValue({ data: earlier, error: null });
		mockDb.undoCardDone.mockResolvedValue({ data: true, error: null });
		renderProvider();
		await waitFor(() => expect(marks()).toBe("c1:m1"));

		await act(async () => {
			await api.markDone("c1", "2026-11-12");
		});
		expect(mockDb.markCardDone).toHaveBeenCalledWith(expect.objectContaining({ day: "2026-11-12" }));
		expect(marks()).toBe("c1:m1,c1:m0");

		await act(async () => {
			await api.undoDone("c1", "2026-11-12");
		});
		expect(marks()).toBe("c1:m1");
	});

	it("reads the truth back when taking a mark back fails", async () => {
		mockDb.getCardCompletions.mockResolvedValue({ data: [saved], error: null });
		mockDb.undoCardDone.mockResolvedValue({ data: null, error: "offline" });
		renderProvider();
		await waitFor(() => expect(marks()).toBe("c1:m1"));

		await act(async () => {
			await api.undoDone("c1");
		});

		expect(marks()).toBe("c1:m1");
		expect(probe()).toContain("|offline|");
	});
});
