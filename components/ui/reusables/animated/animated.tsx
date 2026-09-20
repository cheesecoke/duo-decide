import Animated from "react-native-reanimated";
import { cssInterop } from "nativewind";

/**
 * `Animated.View`, with NativeWind's `className` actually connected.
 *
 * NativeWind's JSX transform only rewrites `className` for components it has
 * an interop registration for. React Native's own `View` ships with one;
 * Reanimated's `Animated.View` does not, so a `className` on it is passed
 * straight through to a component that has no idea what to do with a class
 * string — and is silently dropped. The animated `style` still lands, which
 * is what makes the failure so quiet: the layer animates, at zero size, in no
 * colour.
 *
 * `cssInterop` (rather than the lighter `remapProps`) because the classes
 * these layers carry include `bg-person-a-tint`, which resolves to
 * `hsl(var(--person-a-tint))` — that needs the custom property read from the
 * surrounding `PersonPairProvider`, which is the part `cssInterop` does and
 * a plain prop remap does not.
 *
 * Registered once, here, so every animated layer in the design system imports
 * the same connected component instead of each file remembering to register.
 */
const AnimatedView = cssInterop(Animated.View, { className: "style" });

export { AnimatedView };
