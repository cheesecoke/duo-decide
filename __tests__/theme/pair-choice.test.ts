import {
	choosePair,
	DEFAULT_PAIR,
	type HuePair,
	isHuePresetId,
	parseStoredPair,
} from "@/theme/pair-choice";
import { DEFAULT_PERSON_A, DEFAULT_PERSON_B, HUE_PRESETS, pairVars } from "@/theme/presets";

/**
 * The pair rules. No React here — this is the layer that exists so the
 * provider never sees a pair it would throw on.
 */

const SAGE_BLUSH: HuePair = { a: "sage", b: "blush" };

describe("choosePair", () => {
	it.each([
		// [what it is, current, seat, pick, expected]
		["fills an empty-ish seat A", SAGE_BLUSH, "a", "sky", { a: "sky", b: "blush" }],
		["fills seat B", SAGE_BLUSH, "b", "butter", { a: "sage", b: "butter" }],
		["is a no-op when seat A already holds the pick", SAGE_BLUSH, "a", "sage", SAGE_BLUSH],
		["is a no-op when seat B already holds the pick", SAGE_BLUSH, "b", "blush", SAGE_BLUSH],
		[
			"swaps when seat A picks what B is wearing",
			SAGE_BLUSH,
			"a",
			"blush",
			{ a: "blush", b: "sage" },
		],
		["swaps when seat B picks what A is wearing", SAGE_BLUSH, "b", "sage", { a: "blush", b: "sage" }],
		[
			"swaps a non-default pair just the same",
			{ a: "sky", b: "lavender" } as HuePair,
			"b",
			"sky",
			{ a: "lavender", b: "sky" },
		],
	] as const)("%s", (_label, current, seat, pick, expected) => {
		expect(choosePair(current, seat, pick)).toEqual(expected);
	});

	it("never lets the two seats hold the same hue, from any start, for any pick", () => {
		for (const start of HUE_PRESETS) {
			for (const other of HUE_PRESETS) {
				if (start.id === other.id) continue;
				const current: HuePair = { a: start.id, b: other.id };
				for (const pick of HUE_PRESETS) {
					expect(choosePair(current, "a", pick.id).a).not.toBe(choosePair(current, "a", pick.id).b);
					expect(choosePair(current, "b", pick.id).a).not.toBe(choosePair(current, "b", pick.id).b);
				}
			}
		}
	});

	it("leaves the pair it was given alone", () => {
		const current: HuePair = { ...SAGE_BLUSH };
		choosePair(current, "a", "blush");
		expect(current).toEqual(SAGE_BLUSH);
	});
});

describe("isHuePresetId", () => {
	it.each(HUE_PRESETS.map((preset) => preset.id))("accepts %s", (id) => {
		expect(isHuePresetId(id)).toBe(true);
	});

	it.each([["chartreuse"], [""], [null], [undefined], [42], [{ id: "sage" }], [["sage"]]])(
		"rejects %p",
		(value) => {
			expect(isHuePresetId(value)).toBe(false);
		},
	);
});

describe("parseStoredPair", () => {
	it("reads a pair it wrote", () => {
		expect(parseStoredPair(JSON.stringify({ a: "sky", b: "butter" }))).toEqual({
			a: "sky",
			b: "butter",
		});
	});

	it("ignores anything else on the row", () => {
		expect(parseStoredPair('{"a":"sky","b":"butter","c":"nonsense"}')).toEqual({
			a: "sky",
			b: "butter",
		});
	});

	it.each([
		["nothing stored", null],
		["an empty string", ""],
		["not JSON at all", "sage,blush"],
		["JSON that is not an object", '"sage"'],
		["null", "null"],
		["an array", '["sage","blush"]'],
		["a missing seat", '{"a":"sage"}'],
		["an unknown id", '{"a":"chartreuse","b":"blush"}'],
		["a non-string id", '{"a":1,"b":2}'],
		["both seats the same", '{"a":"sage","b":"sage"}'],
	])("falls back to the defaults on %s", (_label, stored) => {
		expect(parseStoredPair(stored)).toEqual({ a: DEFAULT_PERSON_A, b: DEFAULT_PERSON_B });
	});

	it("never returns a pair pairVars would throw on", () => {
		const bad = ['{"a":"chartreuse","b":"blush"}', "not json", null, '{"a":"sage","b":"sage"}'];
		for (const stored of bad) {
			const pair = parseStoredPair(stored);
			expect(() => pairVars(pair.a, pair.b)).not.toThrow();
		}
	});
});

describe("DEFAULT_PAIR", () => {
	it("is tokens.md §1's sage + blush, and the same defaults presets.ts publishes", () => {
		expect(DEFAULT_PAIR).toEqual({ a: "sage", b: "blush" });
		expect(DEFAULT_PAIR).toEqual({ a: DEFAULT_PERSON_A, b: DEFAULT_PERSON_B });
	});
});
