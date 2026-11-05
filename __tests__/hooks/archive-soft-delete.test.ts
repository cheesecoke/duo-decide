// Archive + soft delete in the two queue hooks (migration 024):
//   useDecisionManagement — archive / soft delete, optimistic with rollback;
//   useDecisionsData      — the queue load and the realtime handler drop a
//                           decision either partner archived or deleted.
// Real hooks, real lib/database.ts, the in-memory Supabase mock underneath.

import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useState } from "react";

import { supabase } from "@/config/supabase";
import { useDecisionManagement } from "@/hooks/decision-queue/useDecisionManagement";
import { useDecisionsData, type UIDecision } from "@/hooks/decision-queue/useDecisionsData";
import {
	COUPLE_ID,
	OPTION_1_ID,
	USER_1_ID,
	USER_2_ID,
	mockCouple,
	mockProfiles,
	mockVoteDecision,
	mockVoteOptions,
} from "@/test-utils/fixtures";
import {
	getMockDecisions,
	mockSupabase,
	resetMockData,
	setMockCouples,
	setMockDecisionOptions,
	setMockDecisions,
	setMockLifecycleColumns,
	setMockProfiles,
	setMockRpcError,
} from "@/test-utils/supabase-mock";
import type { Decision, UserContext } from "@/types/database";

jest.mock("@/context/realtime-status-context", () => ({
	useRealtimeStatus: () => ({
		setReconnecting: jest.fn(),
		registerRefetch: jest.fn(() => () => {}),
		runRefetches: jest.fn(),
	}),
}));

const ctx: UserContext = {
	userId: USER_1_ID,
	coupleId: COUPLE_ID,
	partnerId: USER_2_ID,
	userName: "Alice",
	partnerName: "Bob",
};

const decided: Decision = {
	...mockVoteDecision,
	id: "decided",
	title: "Dinner",
	status: "completed",
	decided_by: USER_2_ID,
	decided_at: "2026-11-01T00:00:00Z",
	final_decision: OPTION_1_ID,
};
const open: Decision = { ...mockVoteDecision, id: "open", title: "Trip" };
const other: Decision = { ...mockVoteDecision, id: "other", title: "Movie" };

function ui(decision: Decision): UIDecision {
	return {
		...decision,
		expanded: false,
		createdBy: "Alice",
		details: "",
		options: [],
	};
}

beforeEach(() => {
	resetMockData();
	setMockCouples([mockCouple]);
	setMockProfiles(mockProfiles);
});

/* ------------------------------------------------- useDecisionManagement - */

/** The management hook over real list state, as the queue screen holds it. */
function useQueue(initial: Decision[]) {
	const [decisions, setDecisions] = useState<UIDecision[]>(initial.map(ui));
	const [error, setError] = useState<string | null>(null);
	const management = useDecisionManagement(ctx, setDecisions, setError);
	return { decisions, error, ...management };
}

const ids = (list: { id: string }[]) => list.map((d) => d.id);

describe("useDecisionManagement — archive", () => {
	it("takes the card off at once, before the write answers, and writes the archive", async () => {
		setMockDecisions([{ ...other }, { ...decided }, { ...open }]);
		let release!: () => void;
		jest.mocked(supabase.rpc).mockImplementationOnce(
			(() =>
				new Promise((resolve) => {
					release = () => resolve({ data: null, error: null } as never);
				})) as never,
		);
		const { result } = renderHook(() => useQueue([other, decided, open]));

		let pending!: Promise<boolean>;
		act(() => {
			pending = result.current.archiveExistingDecision("decided");
		});
		expect(ids(result.current.decisions)).toEqual(["other", "open"]);
		expect(supabase.rpc).toHaveBeenLastCalledWith("archive_decision", { p_decision_id: "decided" });

		await act(async () => {
			release();
			expect(await pending).toBe(true);
		});
		expect(ids(result.current.decisions)).toEqual(["other", "open"]);
		expect(result.current.error).toBeNull();
	});

	it("rolls back to the same place and says why when the write fails", async () => {
		setMockDecisions([{ ...other }, { ...decided }, { ...open }]);
		setMockRpcError("archive_decision", "Decision not found");
		const { result } = renderHook(() => useQueue([other, decided, open]));

		let ok: boolean | undefined;
		await act(async () => {
			ok = await result.current.archiveExistingDecision("decided");
		});

		expect(ok).toBe(false);
		expect(ids(result.current.decisions)).toEqual(["other", "decided", "open"]);
		expect(result.current.error).toBe("Decision not found");
		expect(getMockDecisions().find((d) => d.id === "decided")?.archived_at).toBeFalsy();
	});

	it("rolls back on a thrown error too", async () => {
		jest.mocked(supabase.rpc).mockImplementationOnce(() => {
			throw new Error("offline");
		});
		const { result } = renderHook(() => useQueue([decided, open]));

		await act(async () => {
			await result.current.archiveExistingDecision("decided");
		});

		expect(ids(result.current.decisions)).toEqual(["decided", "open"]);
		expect(result.current.error).toBe("offline");
	});

	it("before migration 024: rolls back with the database's message, nothing crashes", async () => {
		setMockLifecycleColumns(false);
		setMockDecisions([{ ...decided }]);
		const { result } = renderHook(() => useQueue([decided]));

		await act(async () => {
			await result.current.archiveExistingDecision("decided");
		});

		expect(ids(result.current.decisions)).toEqual(["decided"]);
		expect(result.current.error).toMatch(/archive_decision/);
	});
});

describe("useDecisionManagement — soft delete", () => {
	it("takes the card off and soft-deletes: the row stays in the database", async () => {
		setMockDecisions([{ ...open }, { ...other }]);
		const { result } = renderHook(() => useQueue([open, other]));

		await act(async () => {
			expect(await result.current.softDeleteExistingDecision("open")).toBe(true);
		});

		expect(ids(result.current.decisions)).toEqual(["other"]);
		expect(supabase.rpc).toHaveBeenLastCalledWith("soft_delete_decision", { p_decision_id: "open" });
		const row = getMockDecisions().find((d) => d.id === "open");
		expect(row).toBeTruthy();
		expect(row?.deleted_at).toBeTruthy();
	});

	it("rolls back when the write fails", async () => {
		setMockRpcError("soft_delete_decision", "permission denied");
		const { result } = renderHook(() => useQueue([open, other]));

		await act(async () => {
			await result.current.softDeleteExistingDecision("open");
		});

		expect(ids(result.current.decisions)).toEqual(["open", "other"]);
		expect(result.current.error).toBe("permission denied");
	});

	it("a failed write for a card that is not on screen puts nothing back", async () => {
		setMockRpcError("soft_delete_decision", "nope");
		const { result } = renderHook(() => useQueue([open]));

		await act(async () => {
			await result.current.softDeleteExistingDecision("missing");
		});

		expect(ids(result.current.decisions)).toEqual(["open"]);
		expect(result.current.error).toBe("nope");
	});
});

/* ------------------------------------------------------ useDecisionsData - */

/**
 * The realtime channel, with its postgres_changes handler kept so a test can
 * play the partner's write into it — what Supabase delivers when the other
 * phone archives or deletes.
 */
type Change = { eventType: "INSERT" | "UPDATE" | "DELETE"; new: unknown; old: unknown };
let deliver: ((payload: Change) => Promise<void>) | null = null;

function captureChannel() {
	deliver = null;
	type Channel = { on: jest.Mock; subscribe: jest.Mock; unsubscribe: jest.Mock };
	jest.mocked(mockSupabase.supabase.channel).mockImplementation((() => {
		const channel: Channel = {
			on: jest.fn((_event: string, _filter: unknown, handler: (p: Change) => Promise<void>) => {
				deliver ??= handler;
				return channel;
			}),
			subscribe: jest.fn(() => channel),
			unsubscribe: jest.fn(),
		};
		return channel;
	}) as never);
}

describe("useDecisionsData — the queue", () => {
	beforeEach(captureChannel);

	it("loads live decisions only: archived and soft-deleted ones stay off", async () => {
		setMockDecisions([
			{ ...decided },
			{ ...open },
			{ ...other, archived_at: "2026-11-02T00:00:00Z" },
			{ ...other, id: "gone", deleted_at: "2026-11-02T00:00:00Z" },
		]);
		const { result } = renderHook(() => useDecisionsData(ctx));
		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(ids(result.current.decisions).sort()).toEqual(["decided", "open"]);
	});

	it("before migration 024 the queue still loads", async () => {
		setMockLifecycleColumns(false);
		setMockDecisions([{ ...decided }, { ...open }]);
		const { result } = renderHook(() => useDecisionsData(ctx));
		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.error).toBeNull();
		expect(ids(result.current.decisions).sort()).toEqual(["decided", "open"]);
	});

	it("the partner archives it → it leaves this queue live", async () => {
		setMockDecisions([{ ...decided }, { ...open }]);
		const { result } = renderHook(() => useDecisionsData(ctx));
		await waitFor(() => expect(result.current.decisions).toHaveLength(2));

		await act(async () => {
			await deliver!({
				eventType: "UPDATE",
				new: { ...decided, archived_at: "2026-11-05T00:00:00Z", archived_by: USER_2_ID },
				old: { id: "decided" },
			});
		});

		expect(ids(result.current.decisions)).toEqual(["open"]);
	});

	it("the partner deletes an open one → it leaves this queue live", async () => {
		setMockDecisions([{ ...decided }, { ...open }]);
		const { result } = renderHook(() => useDecisionsData(ctx));
		await waitFor(() => expect(result.current.decisions).toHaveLength(2));

		await act(async () => {
			await deliver!({
				eventType: "UPDATE",
				new: { ...open, deleted_at: "2026-11-05T00:00:00Z" },
				old: { id: "open" },
			});
		});

		expect(ids(result.current.decisions)).toEqual(["decided"]);
	});

	it("moved back to the queue from History → it comes back live", async () => {
		setMockDecisions([{ ...open }, { ...decided, archived_at: "2026-11-02T00:00:00Z" }]);
		setMockDecisionOptions(mockVoteOptions.map((o) => ({ ...o, decision_id: "decided" })));
		const { result } = renderHook(() => useDecisionsData(ctx));
		await waitFor(() => expect(result.current.decisions).toHaveLength(1));

		// What unarchive_decision writes, then the UPDATE it sends.
		setMockDecisions([{ ...open }, { ...decided, archived_at: null }]);
		await act(async () => {
			await deliver!({
				eventType: "UPDATE",
				new: { ...decided, archived_at: null },
				old: { id: "decided" },
			});
		});

		expect(ids(result.current.decisions).sort()).toEqual(["decided", "open"]);
	});

	it("an ordinary update still patches in place", async () => {
		setMockDecisions([{ ...open }]);
		const { result } = renderHook(() => useDecisionsData(ctx));
		await waitFor(() => expect(result.current.decisions).toHaveLength(1));

		setMockDecisions([{ ...open, title: "Trip to Lisbon" }]);
		await act(async () => {
			await deliver!({ eventType: "UPDATE", new: { ...open }, old: { id: "open" } });
		});

		expect(result.current.decisions.map((d) => d.title)).toEqual(["Trip to Lisbon"]);
	});
});
