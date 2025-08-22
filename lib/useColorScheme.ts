import { useColorScheme as useNativeColorScheme } from "react-native";
import { useState } from "react";

export function useColorScheme() {
	const systemColorScheme = useNativeColorScheme();
	const [colorScheme, setColorSchemeState] = useState(systemColorScheme ?? "dark");

	const setColorScheme = (scheme: "light" | "dark" | null) => {
		setColorSchemeState(scheme ?? "dark");
	};

	const toggleColorScheme = () => {
		setColorSchemeState((prev) => (prev === "light" ? "dark" : "light"));
	};

	return {
		colorScheme,
		isDarkColorScheme: colorScheme === "dark",
		setColorScheme,
		toggleColorScheme,
	};
}
