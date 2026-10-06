import * as React from "react";
import { Text } from "react-native";
import { render, renderHook, screen, userEvent } from "@testing-library/react-native";

import { vars } from "nativewind";

import { PersonPairProvider, usePersonPair } from "@/theme/PersonPairProvider";
import { DEFAULT_PERSON_A, DEFAULT_PERSON_B, pairVars } from "@/theme/presets";
import { usePersonColors } from "@/theme/usePersonColors";

// The point of the provider is that the two channels the hues travel down —
// CSS custom properties for the NativeWind classes, React context for the
// values interpolateColor and expo-linear-gradient need — cannot disagree.
// So the assertions below compare one against the other rather than against a
// hard-coded colour.

function wrapperFor(a?: string, b?: string) {
	return function Wrapper({ children }: { children: React.ReactNode }) {
		return (
			<PersonPairProvider a={a} b={b}>
				{children}
			</PersonPairProvider>
		);
	};
}

describe("PersonPairProvider", () => {
	it.each([
		["the default pair", undefined, undefined, DEFAULT_PERSON_A, DEFAULT_PERSON_B],
		["an explicit pair", "sky", "butter", "sky", "butter"],
	])("gives usePersonColors exactly the CSS vars it sets for %s", (_label, a, b, idA, idB) => {
		const { result } = renderHook(() => usePersonColors(), { wrapper: wrapperFor(a, b) });
		const cssVars = pairVars(idA, idB);

		expect(result.current).toEqual({
			a: {
				base: `hsl(${cssVars["--person-a-base"]})`,
				tint: `hsl(${cssVars["--person-a-tint"]})`,
				deep: `hsl(${cssVars["--person-a-deep"]})`,
			},
			b: {
				base: `hsl(${cssVars["--person-b-base"]})`,
				tint: `hsl(${cssVars["--person-b-tint"]})`,
				deep: `hsl(${cssVars["--person-b-deep"]})`,
			},
		});
	});

	it("writes exactly vars(pairVars(a, b)) onto its own View, and nothing else", () => {
		// The other half of the same contract: the assertion above proves the
		// context channel resolves the pair, this one proves the CSS-var
		// channel is written from the very same call.
		const json = render(
			<PersonPairProvider a="sky" b="butter">
				<Text>child</Text>
			</PersonPairProvider>,
		).toJSON() as { props: { style?: unknown } } | null;

		expect(json).not.toBeNull();
		expect(json?.props.style).toEqual(vars(pairVars("sky", "butter")));
	});

	it("reports the pair's ids through usePersonPair", () => {
		const { result } = renderHook(() => usePersonPair(), { wrapper: wrapperFor("lavender", "sage") });

		expect(result.current.a).toBe("lavender");
		expect(result.current.b).toBe("sage");
	});

	it("routes setPair to the owner's onChange", async () => {
		const onChange = jest.fn();

		function Picker() {
			const { setPair } = usePersonPair();
			return <Text onPress={() => setPair({ a: "sky", b: "butter" })}>pick</Text>;
		}

		render(
			<PersonPairProvider a="sage" b="blush" onChange={onChange}>
				<Picker />
			</PersonPairProvider>,
		);

		await userEvent.setup().press(screen.getByText("pick"));

		expect(onChange).toHaveBeenCalledWith({ a: "sky", b: "butter" });
	});

	it("does not throw when nothing owns the pair", async () => {
		function Picker() {
			const { setPair } = usePersonPair();
			return <Text onPress={() => setPair({ a: "sky", b: "butter" })}>pick</Text>;
		}

		render(
			<PersonPairProvider>
				<Picker />
			</PersonPairProvider>,
		);

		await expect(userEvent.setup().press(screen.getByText("pick"))).resolves.toBeUndefined();
	});

	it("fails at the provider, by name, on an unknown preset", () => {
		expect(() =>
			renderHook(() => usePersonColors(), { wrapper: wrapperFor("chartreuse", "blush") }),
		).toThrow(/Unknown hue preset "chartreuse"/);
	});
});
