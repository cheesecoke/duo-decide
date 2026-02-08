// Test wrapper component with providers
// Wraps components with necessary context providers for testing

import React from "react";
import { ThemeProvider } from "@/context/theme-provider";

interface TestWrapperProps {
	children: React.ReactNode;
}

/**
 * Wraps a component with the necessary providers for testing
 * Currently includes ThemeProvider
 */
export const TestWrapper: React.FC<TestWrapperProps> = ({ children }) => {
	return <ThemeProvider>{children}</ThemeProvider>;
};

/**
 * Creates a wrapper function for use with @testing-library/react-native
 * Usage: render(<Component />, { wrapper: createWrapper() })
 */
function WrapperComponent({ children }: { children: React.ReactNode }) {
	return <TestWrapper>{children}</TestWrapper>;
}
WrapperComponent.displayName = "TestWrapperComponent";

export const createWrapper = () => WrapperComponent;

export default TestWrapper;
