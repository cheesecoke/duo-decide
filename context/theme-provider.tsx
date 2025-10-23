import React, { createContext, useContext, useState } from "react";
import { ThemeProvider as EmotionThemeProvider } from "@emotion/react";
import { theme, ColorMode } from "@/lib/theme";

interface ThemeContextType {
	colorMode: ColorMode;
	toggleColorMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	// Default to light mode instead of following system
	const [colorMode, setColorMode] = useState<ColorMode>("light");

	// Comment out system sync to keep it always light
	// useEffect(() => {
	// 	if (systemColorScheme) {
	// 		setColorMode(systemColorScheme === "dark" ? "dark" : "light");
	// 	}
	// }, [systemColorScheme]);

	const toggleColorMode = () => {
		setColorMode((prev) => (prev === "light" ? "dark" : "light"));
	};

	const value = {
		colorMode,
		toggleColorMode,
	};

	return (
		<ThemeContext.Provider value={value}>
			<EmotionThemeProvider
				theme={{
					...theme,
					colorMode,
				}}
			>
				{children}
			</EmotionThemeProvider>
		</ThemeContext.Provider>
	);
}

export function useTheme() {
	const context = useContext(ThemeContext);
	if (context === undefined) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
}
