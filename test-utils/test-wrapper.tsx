// Test wrapper component with providers
// Wraps components with necessary context providers for testing

import React from "react";

import { PersonPairProvider } from "@/theme/PersonPairProvider";

interface TestWrapperProps {
	children: React.ReactNode;
}

/**
 * Wraps a component with the providers the app mounts above every screen.
 *
 * Today that is exactly one: `PersonPairProvider`, the sole writer of the
 * `--person-*` CSS vars and of the context `usePersonColors` reads. A
 * component that reaches for either without it renders in no colours at all,
 * so the wrapper is what makes a screen test render the way the app does.
 *
 * It is the real provider on its defaults (sage + blush), not a stub —
 * `PersonPairProvider` is stateless, so there is nothing to fake.
 */
export const TestWrapper: React.FC<TestWrapperProps> = ({ children }) => {
	return <PersonPairProvider>{children}</PersonPairProvider>;
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
