import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import {
	getOptionListsByCouple,
	createOptionList,
	updateOptionList,
	deleteOptionList,
} from "@/lib/database";
import type { OptionListWithItems } from "@/types/database";
import { useUserContext } from "./user-context-provider";

interface OptionListsContextType {
	optionLists: OptionListWithItems[];
	loading: boolean;
	error: string | null;
	refreshLists: () => Promise<void>;
	createList: (
		listData: { couple_id: string; title: string; description: string },
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

export function OptionListsProvider({ children }: { children: ReactNode }) {
	const { userContext } = useUserContext(); // Get userContext from provider
	const [optionLists, setOptionLists] = useState<OptionListWithItems[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Load option lists when userContext.coupleId is available
	useEffect(() => {
		const loadLists = async () => {
			if (!userContext?.coupleId) {
				setOptionLists([]);
				return;
			}

			setLoading(true);
			setError(null);

			try {
				const result = await getOptionListsByCouple(userContext.coupleId);
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
		};

		loadLists();
	}, [userContext?.coupleId]);

	// Refresh lists manually
	const refreshLists = useCallback(async () => {
		if (!userContext?.coupleId) return;

		setLoading(true);
		setError(null);

		try {
			const result = await getOptionListsByCouple(userContext.coupleId);
			if (result.error) {
				setError(result.error);
			} else {
				setOptionLists(result.data || []);
			}
		} catch (err) {
			console.error("Error refreshing lists:", err);
			setError("Failed to refresh lists");
		} finally {
			setLoading(false);
		}
	}, [userContext?.coupleId]);

	// Create new list
	const createList = useCallback(
		async (
			listData: { couple_id: string; title: string; description: string },
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
					// Add to local state
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

	// Update existing list
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
					setOptionLists((prev) =>
						prev.map((list) => (list.id === listId ? result.data! : list)),
					);
				}
			} catch (err) {
				console.error("Error updating list:", err);
				setError("Failed to update list");
			}
		},
		[],
	);

	// Delete list
	const deleteList = useCallback(async (listId: string): Promise<void> => {
		setError(null);

		try {
			const result = await deleteOptionList(listId);

			if (result.error) {
				setError(result.error);
				return;
			}

			// Remove from local state
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
