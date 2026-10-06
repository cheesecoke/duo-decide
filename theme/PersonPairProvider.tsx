import * as React from "react";
import { View } from "react-native";
import { vars } from "nativewind";

import { DEFAULT_PERSON_A, DEFAULT_PERSON_B, type HuePresetId, pairVars } from "@/theme/presets";
import { PersonPairContext, type PersonPairIds } from "@/theme/usePersonColors";

/**
 * The single place the active person pair is set.
 *
 * Duo's two hues reach components down two different channels — CSS custom
 * properties for everything NativeWind styles (`bg-person-a-tint`), and React
 * context for the values `interpolateColor` and `expo-linear-gradient` need
 * (`usePersonColors`). Two channels means two chances to disagree, and a Card
 * whose rail animates toward a colour its own background is not using is the
 * kind of bug that survives review.
 *
 * So neither is settable on its own: this provider writes both from one pair
 * of preset ids, and `PersonPairContext` has no other writer in the app.
 *
 * Stateless on purpose. The pair is owned by whoever persists the user's pick
 * — the preset picker, once it exists — which passes it back down as `a`/`b`
 * and takes changes through `onChange`.
 */

type PersonPairProviderProps = {
	a?: HuePresetId | (string & {});
	b?: HuePresetId | (string & {});
	/** Where a preset picker inside the subtree sends its result. */
	onChange?: (pair: PersonPairIds) => void;
	children?: React.ReactNode;
	className?: string;
};

type PersonPairValue = PersonPairIds & {
	/** No-op unless the owner passed `onChange` — the provider holds no state. */
	setPair: (pair: PersonPairIds) => void;
};

const PersonPairSetterContext = React.createContext<(pair: PersonPairIds) => void>(() => {});

function PersonPairProvider({
	a = DEFAULT_PERSON_A,
	b = DEFAULT_PERSON_B,
	onChange,
	children,
	className = "flex-1",
}: PersonPairProviderProps) {
	const ids = React.useMemo<PersonPairIds>(() => ({ a, b }), [a, b]);

	// `pairVars` throws on an unknown id, which is the same throw
	// `usePersonColors` would produce — surfaced here so a bad persisted pick
	// fails at the provider rather than in whichever card rendered first.
	const style = React.useMemo(() => vars(pairVars(a, b)), [a, b]);

	const setPair = React.useCallback((pair: PersonPairIds) => onChange?.(pair), [onChange]);

	return (
		<View style={style} className={className}>
			<PersonPairSetterContext.Provider value={setPair}>
				<PersonPairContext.Provider value={ids}>{children}</PersonPairContext.Provider>
			</PersonPairSetterContext.Provider>
		</View>
	);
}

/**
 * The pair's *ids* plus the setter. For the colours themselves — the resolved
 * `hsl(...)` strings — use `usePersonColors`.
 */
function usePersonPair(): PersonPairValue {
	const { a, b } = React.useContext(PersonPairContext);
	const setPair = React.useContext(PersonPairSetterContext);

	return React.useMemo(() => ({ a, b, setPair }), [a, b, setPair]);
}

export { PersonPairProvider, usePersonPair };
export type { PersonPairProviderProps, PersonPairValue };
