import * as React from "react";
import { render } from "@testing-library/react-native";

import { TestWrapper } from "./test-wrapper";

/**
 * Renders one of the six auth screens the way jest needs them.
 *
 * Two things every one of them requires:
 *
 * 1. **The person pair.** Every screen is under `PersonPairProvider` in the
 *    app, and the auth kit's colours come from it — `TestWrapper` mounts the
 *    real one on its defaults.
 *
 * 2. **A focusable `TextInput`.** react-hook-form focuses the first invalid
 *    field on a failed submit (`shouldFocusError`, on by default), and
 *    react-test-renderer hands host components a null ref unless a node mock
 *    is supplied — so without this, every validation test dies on
 *    "e.focus is not a function" instead of asserting the message.
 *
 * The handle is shared and stateless on purpose: nothing asserts focus here
 * (that is `reusables/form`'s own test, where it is the point).
 */
const TEXT_INPUT_HANDLE = {
	focus: () => {},
	blur: () => {},
	isFocused: () => false,
};

export function renderAuthScreen(node: React.ReactElement) {
	return render(node, {
		wrapper: TestWrapper,
		createNodeMock: (element) => (element.type === "TextInput" ? TEXT_INPUT_HANDLE : null),
	});
}
