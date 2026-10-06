import * as React from "react";
import { renderHook } from "@testing-library/react-native";

import { PersonPairContext, usePersonColors } from "@/theme/usePersonColors";

// App code must set the pair through <PersonPairProvider>, which writes the
// CSS-var channel alongside this context. These tests are the deliberate
// exception: they exercise the hook's own context read in isolation, with no
// vars to keep in sync. The provider's two-channel contract is covered in
// PersonPairProvider.test.tsx.

describe("usePersonColors", () => {
	it("defaults to butter for A, lavender for B", () => {
		const { result } = renderHook(() => usePersonColors());

		expect(result.current).toEqual({
			a: { base: "hsl(46 80% 70%)", tint: "hsl(46 90% 92%)", deep: "hsl(46 45% 28%)" },
			b: { base: "hsl(250 55% 78%)", tint: "hsl(250 70% 94%)", deep: "hsl(250 35% 34%)" },
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
