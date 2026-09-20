import * as React from "react";

/**
 * Stand-in for `expo-linear-gradient` under jest.
 *
 * The real component calls `processColor` from react-native at render time,
 * which this repo's react-native mock (test-utils/setup.ts) does not provide,
 * and on native it resolves a view manager that has no JS implementation at
 * all. Colour blending is not something a jest assertion can see anyway, so
 * the mock renders a host element that keeps the props visible to queries —
 * a test can still assert *which* colours a component asked for.
 *
 * The gradient itself is exercised in Storybook (web).
 */

export function LinearGradient({
	children,
	...rest
}: {
	children?: React.ReactNode;
	[key: string]: unknown;
}) {
	return React.createElement("LinearGradient", rest, children);
}
LinearGradient.displayName = "LinearGradient";

export default LinearGradient;
