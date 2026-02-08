import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";

export type DrawerType = "createDecision" | "createList" | "settings" | null;

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
