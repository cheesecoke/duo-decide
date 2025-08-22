import React, { createContext, useContext, useState, ReactNode } from "react";

interface DrawerContextType {
	isVisible: boolean;
	title: string;
	content: ReactNode | null;
	showDrawer: (title: string, content: ReactNode) => void;
	hideDrawer: () => void;
}

const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

export function DrawerProvider({ children }: { children: ReactNode }) {
	const [isVisible, setIsVisible] = useState(false);
	const [title, setTitle] = useState("");
	const [content, setContent] = useState<ReactNode | null>(null);

	const showDrawer = (drawerTitle: string, drawerContent: ReactNode) => {
		setTitle(drawerTitle);
		setContent(drawerContent);
		setIsVisible(true);
	};

	const hideDrawer = () => {
		setIsVisible(false);
		setTitle("");
		setContent(null);
	};

	return (
		<DrawerContext.Provider
			value={{
				isVisible,
				title,
				content,
				showDrawer,
				hideDrawer,
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