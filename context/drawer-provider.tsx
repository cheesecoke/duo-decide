import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";

/**
 * Which drawer is open, so a screen can tell its own drawer from someone
 * else's before it pushes new content into it (index.tsx re-renders the
 * create form as the form data changes).
 *
 * `confirmDelete` is the delete-confirm sheet (Chase's ruling 2026-09-20):
 * deleting a decision takes it and every vote on it away from both people and
 * there is no undo, so it asks first —
 * `components/decision-queue/confirm-delete/confirm-delete.tsx`.
 */
export type DrawerType = "createDecision" | "createList" | "settings" | "confirmDelete" | null;

interface DrawerOptions {
	type?: DrawerType;
}

interface DrawerContextType {
	isVisible: boolean;
	title: string;
	content: ReactNode | null;
	drawerType: DrawerType;
	showDrawer: (title: string, content: ReactNode, options?: DrawerOptions) => void;
	hideDrawer: () => void;
	updateContent: (content: ReactNode) => void;
}

const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

export function DrawerProvider({ children }: { children: ReactNode }) {
	const [isVisible, setIsVisible] = useState(false);
	const [title, setTitle] = useState("");
	const [content, setContent] = useState<ReactNode | null>(null);
	const [drawerType, setDrawerType] = useState<DrawerType>(null);

	const showDrawer = useCallback(
		(drawerTitle: string, drawerContent: ReactNode, options?: DrawerOptions) => {
			setTitle(drawerTitle);
			setContent(drawerContent);
			setDrawerType(options?.type ?? null);
			setIsVisible(true);
		},
		[],
	);

	const updateContent = useCallback((drawerContent: ReactNode) => {
		setContent(drawerContent);
	}, []);

	const hideDrawer = useCallback(() => {
		setIsVisible(false);
		setTitle("");
		setContent(null);
		setDrawerType(null);
	}, []);

	return (
		<DrawerContext.Provider
			value={{
				isVisible,
				title,
				content,
				drawerType,
				showDrawer,
				hideDrawer,
				updateContent,
			}}
		>
			{children}
		</DrawerContext.Provider>
	);
}

export function useDrawer() {
	const context = useContext(DrawerContext);
	if (context === undefined) {
		throw new Error("useDrawer must be used within a DrawerProvider");
	}
	return context;
}
