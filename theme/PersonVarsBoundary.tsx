import * as React from "react";
import { View } from "react-native";
import { vars } from "nativewind";

import { usePersonPair } from "@/theme/PersonPairProvider";
import { pairVars } from "@/theme/presets";

/**
 * The person pair's CSS vars, re-emitted inside a native `Modal`.
 *
 * `PersonPairProvider` writes `--person-a-base` and friends as NativeWind
 * `vars()` on a `View`, and a custom property only reaches what is *inside*
 * that view's box. A React Native `Modal` is not: on web it portals its tree
 * out to a sibling of the app root, so everything inside it is outside the
 * provider's element and reads the `:root` fallbacks `global.css` pins —
 * which are sage + blush, always. A couple on `sky` would open the create
 * sheet and find the option chips still sage, while the screen behind them
 * was not.
 *
 * So the boundary goes just inside the Modal and re-emits the same vars from
 * the same call, `vars(pairVars(a, b))`. It is a **re-emitter, not a second
 * source**: it reads the pair through `usePersonPair`, so the provider stays
 * the only thing that decides what the pair is, and there is no way for the
 * two to disagree. (The context channel — `usePersonColors`, which the
 * drawer's own hairline gradient uses — crosses the Modal already; React
 * context does not care about the DOM.)
 *
 * Native needs none of this and is not harmed by it: the vars resolve the
 * same either way, and one extra `View` inside a modal is not a layout.
 */

type PersonVarsBoundaryProps = {
	children?: React.ReactNode;
	/** Defaults to `flex-1` so the boundary never collapses its subtree. */
	className?: string;
	testID?: string;
};

function PersonVarsBoundary({
	children,
	className = "flex-1",
	testID = "person-vars-boundary",
}: PersonVarsBoundaryProps) {
	const { a, b } = usePersonPair();

	// Same call as the provider's, from the same ids — see above.
	const style = React.useMemo(() => vars(pairVars(a, b)), [a, b]);

	return (
		<View testID={testID} style={style} className={className}>
			{children}
		</View>
	);
}

export { PersonVarsBoundary };
export type { PersonVarsBoundaryProps };
