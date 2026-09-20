import { DEFAULT_PERSON_A, DEFAULT_PERSON_B, HUE_PRESETS, type HuePresetId } from "@/theme/presets";

/**
 * The rules a person pair obeys, with no React and no storage in sight.
 *
 * `pairVars` throws on an unknown id (theme/presets.ts:82) and
 * `PersonPairProvider` deliberately lets that throw reach the top of the tree.
 * That is the right behaviour for a programming mistake and the wrong one for
 * a value read back off a device — an app that will not start because a
 * three-year-old AsyncStorage row says `"chartreuse"` has no way out. So every
 * path from storage into the provider comes through `parseStoredPair`, which
 * validates first and falls back rather than throwing.
 *
 * Kept free of imports beyond `presets` so it stays unit-testable under the
 * repo's node test environment, same as `presets.ts` itself.
 */

/** A seat, not a person: seat A is always the viewer (`from-ui-decision.ts`). */
export type PersonSeat = "a" | "b";

/**
 * A pair narrowed to the five known ids. `PersonPairIds` (usePersonColors)
 * stays wider on purpose — it is what the provider accepts — but everything
 * that *chooses* or *persists* a pair works in known ids only.
 */
export type HuePair = { a: HuePresetId; b: HuePresetId };

export const DEFAULT_PAIR: HuePair = { a: DEFAULT_PERSON_A, b: DEFAULT_PERSON_B };

export function isHuePresetId(x: unknown): x is HuePresetId {
	return typeof x === "string" && HUE_PRESETS.some((preset) => preset.id === x);
}

/**
 * Put `id` in `seat`.
 *
 * The two seats may never hold the same hue — "your colour" and "their colour"
 * stop meaning anything the moment they match — so picking the hue the other
 * seat is wearing **swaps** the two rather than refusing the press. That is
 * why no swatch is ever disabled: every one of the ten is a legal press, and
 * five of them happen to be a swap.
 */
export function choosePair(current: HuePair, seat: PersonSeat, id: HuePresetId): HuePair {
	// Checked before the swap: picking the hue this seat already holds is a
	// no-op, not a swap with itself (which would put `id` in both seats).
	if (current[seat] === id) return current;

	const other: PersonSeat = seat === "a" ? "b" : "a";
	if (current[other] === id) {
		return seat === "a" ? { a: id, b: current.a } : { a: current.b, b: id };
	}

	return seat === "a" ? { a: id, b: current.b } : { a: current.a, b: id };
}

/**
 * `{"a":"sky","b":"butter"}` → `{ a: "sky", b: "butter" }`.
 *
 * Every way this can be wrong lands on the defaults: nothing stored, a value
 * that is not JSON, JSON that is not an object, an id that is not a preset,
 * and both seats holding the same id (a row written by a build that predates
 * the swap rule, or edited by hand). Never throws.
 */
export function parseStoredPair(json: string | null): HuePair {
	if (!json) return DEFAULT_PAIR;

	let parsed: unknown;
	try {
		parsed = JSON.parse(json);
	} catch {
		return DEFAULT_PAIR;
	}

	if (typeof parsed !== "object" || parsed === null) return DEFAULT_PAIR;

	const { a, b } = parsed as { a?: unknown; b?: unknown };
	if (!isHuePresetId(a) || !isHuePresetId(b)) return DEFAULT_PAIR;
	if (a === b) return DEFAULT_PAIR;

	return { a, b };
}
