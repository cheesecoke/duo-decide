import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getUserContext } from "@/lib/database";
import type { UserContext } from "@/types/database";

interface UserContextProviderType {
	userContext: UserContext | null;
	loading: boolean;
	error: string | null;
	refreshUserContext: () => Promise<void>;
}

const UserContextContext = createContext<UserContextProviderType | undefined>(undefined);

export function UserContextProvider({
	children,
}: {
	children: ReactNode | ((context: UserContextProviderType) => ReactNode);
}) {
	const [userContext, setUserContext] = useState<UserContext | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const loadUserContext = async () => {
		setLoading(true);
		setError(null);

		try {
			const context = await getUserContext();
			setUserContext(context);
		} catch (err) {
			console.error("Error loading user context:", err);
			setError("Failed to load user data");
		} finally {
			setLoading(false);
		}
	};

	// Load on mount
	useEffect(() => {
		loadUserContext();
	}, []);

	const refreshUserContext = async () => {
		await loadUserContext();
	};

	const value: UserContextProviderType = {
		userContext,
		loading,
		error,
		refreshUserContext,
	};

	return (
		<UserContextContext.Provider value={value}>
			{typeof children === "function" ? children(value) : children}
		</UserContextContext.Provider>
	);
}

export function useUserContext() {
	const context = useContext(UserContextContext);
	if (context === undefined) {
		throw new Error("useUserContext must be used within a UserContextProvider");
	}
	return context;
}
