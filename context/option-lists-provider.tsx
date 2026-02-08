import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
	useRef,
	ReactNode,
} from "react";
import {
	getOptionListsByCouple,
	createOptionList,
	updateOptionList,
	deleteOptionList,
	subscribeToOptionLists,
} from "@/lib/database";
import type { OptionListWithItems } from "@/types/database";
import { useRealtimeStatus } from "@/context/realtime-status-context";

interface OptionListsContextType {
	optionLists: OptionListWithItems[];
	loading: boolean;
	error: string | null;
	refreshLists: () => Promise<void>;
	createList: (
		listData: { couple_id: string; title: string; description: string; creator_id?: string | null },
		items: { title: string }[],
	) => Promise<OptionListWithItems | null>;
	updateList: (
		listId: string,
		listData: { title?: string; description?: string },
		items?: { id?: string; title: string }[],
	) => Promise<void>;
	deleteList: (listId: string) => Promise<void>;
}

const OptionListsContext = createContext<OptionListsContextType | undefined>(undefined);

export function OptionListsProvider({
	children,
	coupleId,
}: {
	children: ReactNode;
	coupleId: string | null;
}) {
	const [optionLists, setOptionLists] = useState<OptionListWithItems[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const { setReconnecting, registerRefetch, runRefetches } = useRealtimeStatus();
	const refreshRef = useRef<() => Promise<void>>(async () => {});

	const loadLists = useCallback(async () => {
		if (!coupleId) {
			setOptionLists([]);
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const result = await getOptionListsByCouple(coupleId);
			if (result.error) {
				setError(result.error);
				setOptionLists([]);
			} else {
				setOptionLists(result.data || []);
			}
		} catch (err) {
			console.error("Error loading option lists:", err);
			setError("Failed to load option lists");
			setOptionLists([]);
		} finally {
			setLoading(false);
		}
	}, [coupleId]);

	refreshRef.current = loadLists;

	// Load option lists when coupleId is available
	useEffect(() => {
		loadLists();
	}, [loadLists]);

	// Refresh lists manually (same as loadLists but exposed to consumers)
	const refreshLists = useCallback(async () => {
		await loadLists();
	}, [loadLists]);

	// Real-time subscription for option_lists and option_list_items
	useEffect(() => {
		if (!coupleId) return;

		const unregisterRefetch = registerRefetch(() => refreshRef.current());

		const channel = subscribeToOptionLists(
			coupleId,
			() => {
				loadLists();
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
			channel.unsubscribe();
		};
	}, [coupleId, loadLists, registerRefetch, setReconnecting, runRefetches]);

	const createList = useCallback(
		async (
			listData: { couple_id: string; title: string; description: string; creator_id?: string | null },
			items: { title: string }[],
		): Promise<OptionListWithItems | null> => {
			setError(null);

			try {
				const result = await createOptionList(listData, items);

				if (result.error) {
					setError(result.error);
					return null;
				}

				if (result.data) {
					setOptionLists((prev) => [result.data!, ...prev]);
					return result.data;
				}

				return null;
			} catch (err) {
				console.error("Error creating list:", err);
				setError("Failed to create list");
				return null;
			}
		},
		[],
	);

	const updateList = useCallback(
		async (
			listId: string,
			listData: { title?: string; description?: string },
			items?: { id?: string; title: string }[],
		): Promise<void> => {
			setError(null);

			try {
				const result = await updateOptionList(listId, listData, items);

				if (result.error) {
					setError(result.error);
					return;
				}

				if (result.data) {
					// Update local state
					setOptionLists((prev) => prev.map((list) => (list.id === listId ? result.data! : list)));
				}
			} catch (err) {
				console.error("Error updating list:", err);
				setError("Failed to update list");
			}
		},
		[],
	);

	const deleteList = useCallback(async (listId: string): Promise<void> => {
		setError(null);

		try {
			const result = await deleteOptionList(listId);

			if (result.error) {
				setError(result.error);
				return;
			}

			setOptionLists((prev) => prev.filter((list) => list.id !== listId));
		} catch (err) {
			console.error("Error deleting list:", err);
			setError("Failed to delete list");
		}
	}, []);

	const value: OptionListsContextType = {
		optionLists,
		loading,
		error,
		refreshLists,
		createList,
		updateList,
		deleteList,
	};

	return <OptionListsContext.Provider value={value}>{children}</OptionListsContext.Provider>;
}

export function useOptionLists() {
	const context = useContext(OptionListsContext);
	if (context === undefined) {
		throw new Error("useOptionLists must be used within an OptionListsProvider");
	}
	return context;
}
