import * as React from "react";
import { renderHook } from "@testing-library/react-native";

import { PersonPairContext, usePersonColors } from "@/theme/usePersonColors";

describe("usePersonColors", () => {
	it("defaults to the tokens.md pair: sage for A, blush for B", () => {
		const { result } = renderHook(() => usePersonColors());

		expect(result.current).toEqual({
			a: { base: "hsl(150 32% 62%)", tint: "hsl(150 45% 92%)", deep: "hsl(150 30% 28%)" },
			b: { base: "hsl(355 65% 78%)", tint: "hsl(355 80% 94%)", deep: "hsl(355 40% 34%)" },
		});
	});

	it("resolves whichever pair the surrounding context names", () => {
		const { result } = renderHook(() => usePersonColors(), {
			wrapper: ({ children }) => (
				<PersonPairContext.Provider value={{ a: "sky", b: "butter" }}>
					{children}
				</PersonPairContext.Provider>
			),
		});

		expect(result.current.a.base).toBe("hsl(200 65% 74%)");
		expect(result.current.b.base).toBe("hsl(46 80% 70%)");
	});

	it("returns the same object while the pair is unchanged", () => {
		const { result, rerender } = renderHook(() => usePersonColors());
		const first = result.current;

		rerender({});

		expect(result.current).toBe(first);
	});

	it("throws by name when the context holds an unknown preset", () => {
		expect(() =>
			renderHook(() => usePersonColors(), {
				wrapper: ({ children }) => (
					<PersonPairContext.Provider value={{ a: "chartreuse", b: "blush" }}>
						{children}
					</PersonPairContext.Provider>
				),
			}),
		).toThrow(/Unknown hue preset "chartreuse"/);
	});
});
