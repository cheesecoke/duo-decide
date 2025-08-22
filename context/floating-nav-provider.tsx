import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';

interface FloatingNavConfig {
	show: boolean;
	createButtonText?: string;
	onCreatePress?: () => void;
	position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
}

interface FloatingNavContextType {
	config: FloatingNavConfig;
	setConfig: (config: FloatingNavConfig) => void;
	updateConfig: (partial: Partial<FloatingNavConfig>) => void;
}

const FloatingNavContext = createContext<FloatingNavContextType | undefined>(undefined);

export function FloatingNavProvider({ children }: { children: ReactNode }) {
	const [config, setConfig] = useState<FloatingNavConfig>({
		show: false,
		createButtonText: "Create",
		position: "bottom-right"
	});

	const updateConfig = useCallback((partial: Partial<FloatingNavConfig>) => {
		setConfig(prev => ({ ...prev, ...partial }));
	}, []);

	const contextValue = useMemo(() => ({
		config,
		setConfig,
		updateConfig
	}), [config, updateConfig]);

	return (
		<FloatingNavContext.Provider value={contextValue}>
			{children}
		</FloatingNavContext.Provider>
	);
}

export function useFloatingNav() {
	const context = useContext(FloatingNavContext);
	if (context === undefined) {
		throw new Error('useFloatingNav must be used within a FloatingNavProvider');
	}
	return context;
}