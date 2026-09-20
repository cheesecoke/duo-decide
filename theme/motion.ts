/**
 * Motion tokens — derived from design-refs/tokens.md §8.
 *
 * Springs are `withSpring` configs for react-native-reanimated 3; durations
 * are milliseconds for `withTiming`. Rules from tokens.md: everything under
 * 450 ms, nothing bounces more than once.
 */

export const SPRING = {
	/** one overshoot max — thumb slides, character hops */
	gentle: { damping: 18, stiffness: 180, mass: 1 },
	/** tighter, no visible overshoot — chip fill, tab scale */
	snappy: { damping: 22, stiffness: 260, mass: 1 },
} as const;

export const DUR = {
	/** chip fill, tab scale */
	fast: 120,
	/** card state, colour shift */
	base: 220,
	/** result sheet rise */
	reveal: 420,
} as const;

/** ms per card in a staggered list reveal. */
export const STAGGER_LIST = 40;
