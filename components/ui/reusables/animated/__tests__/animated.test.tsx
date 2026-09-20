// The point of this suite is that AnimatedView is *not* the raw one, which
// it cannot assert without naming the raw one.
// eslint-disable-next-line no-restricted-imports
import Animated from "react-native-reanimated";

import { AnimatedView } from "@/components/ui/reusables/animated/animated";

/**
 * A guard on the registration itself, not on what it renders.
 *
 * The regression this file exists for is silent by construction: an
 * unregistered `Animated.View` still animates, still lays out, and still
 * accepts a `className` — it just drops it, so the layer renders with no
 * size, no radius and no colour while every style assertion in a test still
 * passes. Nothing that renders `AnimatedView` can tell the difference, and
 * NativeWind's class resolution does not run under jest at all
 * (nativewind/babel is off, see babel.config.js). So the only thing worth
 * asserting here is that `cssInterop` actually took: it returns a *new*
 * component rather than mutating the one it was given, and names it.
 *
 * If NativeWind ever changes to register in place, this fails loudly and the
 * assertion has to be rewritten against whatever the new evidence is — which
 * is the correct outcome, not a nuisance.
 */
describe("AnimatedView", () => {
	it("is not the bare Animated.View", () => {
		expect(AnimatedView).not.toBe(Animated.View);
	});

	it("is the component cssInterop produced", () => {
		expect((AnimatedView as { displayName?: string }).displayName).toMatch(/^CssInterop\./);
	});
});
