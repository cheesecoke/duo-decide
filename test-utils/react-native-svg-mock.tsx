/**
 * Stand-in for `react-native-svg` under jest.
 *
 * The real package reaches deep into react-native at import time —
 * `Touchable.Mixin`, `processColor`, `requireNativeComponent` — none of which
 * this repo's react-native mock (test-utils/setup.ts) provides, so importing
 * it throws before a single test runs.
 *
 * Every element becomes a host element of the same name with its props
 * forwarded, so a test can still assert the shape a component drew (`d`,
 * `stroke`, `viewBox`). What the pixels look like is Storybook's job.
 *
 * Same loud-failure contract as the reanimated mock: an element this file
 * does not implement throws by name instead of arriving as `undefined`.
 */
import * as React from "react";

function host(name: string) {
	function Element({ children, ...rest }: { children?: React.ReactNode; [key: string]: unknown }) {
		return React.createElement(name, rest, children);
	}
	Element.displayName = name;
	return Element;
}

export const Svg = host("Svg");
export const G = host("G");
export const Path = host("Path");
export const Circle = host("Circle");
export const Ellipse = host("Ellipse");
export const Rect = host("Rect");
export const Line = host("Line");
export const Polygon = host("Polygon");
export const Polyline = host("Polyline");
export const Defs = host("Defs");
export const ClipPath = host("ClipPath");
export const Mask = host("Mask");
export const Use = host("Use");
export const Stop = host("Stop");
export const LinearGradient = host("SvgLinearGradient");
export const RadialGradient = host("SvgRadialGradient");
export const SvgText = host("SvgText");
export const TSpan = host("TSpan");

export default Svg;

/** See `createReanimatedMock` — identical rationale, identical probe list. */
const PROBES = new Set([
	"__esModule",
	"then",
	"catch",
	"finally",
	"$$typeof",
	"constructor",
	"prototype",
	"nodeType",
	"tagName",
	"hasAttribute",
	"toJSON",
	"toString",
	"valueOf",
	"asymmetricMatch",
	"_isMockFunction",
]);

export function createSvgMock(): Record<string, unknown> {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const exported = require("./react-native-svg-mock") as Record<string, unknown>;

	return new Proxy(exported, {
		get(target, property, receiver) {
			if (property in target) return Reflect.get(target, property, receiver);
			if (typeof property === "symbol") return undefined;
			if (PROBES.has(property)) return undefined;

			throw new Error(
				`react-native-svg export "${property}" not mocked in test-utils/react-native-svg-mock.tsx`,
			);
		},
	});
}
