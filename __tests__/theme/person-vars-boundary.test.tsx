import * as React from "react";
import { Text, View } from "react-native";
import { render, screen } from "@testing-library/react-native";

import { vars } from "nativewind";

import { BottomDrawer } from "@/components/modals/BottomDrawer";
import { PersonPairProvider } from "@/theme/PersonPairProvider";
import { PersonVarsBoundary } from "@/theme/PersonVarsBoundary";
import { DEFAULT_PERSON_A, DEFAULT_PERSON_B, pairVars } from "@/theme/presets";

/**
 * A React Native `Modal` portals its tree out of the app root on web, so the
 * `--person-*` custom properties `PersonPairProvider` writes onto its own View
 * do not reach anything inside a sheet — a `person-a-tint` chip in the create
 * sheet would fall back to the sage + blush `:root` block in global.css while
 * the screen behind it was on the pair the couple actually picked.
 *
 * What is asserted is the fix's whole contract: the boundary is inside the
 * Modal, and the vars it emits are `vars(pairVars(a, b))` for the *live* pair
 * — the same call, from the same ids, as the provider above it. Classes are
 * not styled under jest (see babel.config.js), so the chip below is there to
 * show what consumes the vars; the style object on the boundary is the proof.
 */

function renderSheet(pair?: { a: string; b: string }) {
	return render(
		<PersonPairProvider a={pair?.a} b={pair?.b}>
			<BottomDrawer visible onClose={jest.fn()} title="Create decision">
				{/* What the vars are for: the create sheet's option chips. */}
				<View testID="option-chip" className="bg-person-a-tint">
					<Text>Thai</Text>
				</View>
			</BottomDrawer>
		</PersonPairProvider>,
	);
}

describe("PersonVarsBoundary", () => {
	it("re-emits the picked pair's vars inside the drawer's Modal", () => {
		renderSheet({ a: "sky", b: "butter" });

		expect(screen.getByTestId("person-vars-boundary").props.style).toEqual(
			vars(pairVars("sky", "butter")),
		);
	});

	it("re-emits the defaults when nothing has been picked", () => {
		renderSheet();

		expect(screen.getByTestId("person-vars-boundary").props.style).toEqual(
			vars(pairVars(DEFAULT_PERSON_A, DEFAULT_PERSON_B)),
		);
	});

	it("wraps the sheet's content, so a consumer is inside the vars", () => {
		renderSheet({ a: "sky", b: "butter" });

		const boundary = screen.getByTestId("person-vars-boundary");
		const chip = screen.getByTestId("option-chip");

		// The chip is a descendant of the boundary, not a sibling — which is
		// the only thing that makes a custom property reach it on web.
		let node = chip.parent;
		let found = false;
		while (node) {
			if (node === boundary) {
				found = true;
				break;
			}
			node = node.parent;
		}
		expect(found).toBe(true);
	});

	it("takes the pair from the provider rather than holding one", () => {
		// The boundary is a re-emitter: with no provider above it, it emits
		// the context defaults, never a pair of its own.
		render(
			<PersonVarsBoundary>
				<Text>child</Text>
			</PersonVarsBoundary>,
		);

		expect(screen.getByTestId("person-vars-boundary").props.style).toEqual(
			vars(pairVars(DEFAULT_PERSON_A, DEFAULT_PERSON_B)),
		);
	});
});
