import * as React from "react";
import { View } from "react-native";

import { ContentLayout } from "@/components/layout";
import { Body, Display } from "@/components/ui/reusables/headline/headline";

/**
 * The shell every auth screen stands in: headline, optional intro, the form,
 * and a footer pinned to the bottom of the viewport.
 *
 * The six screens each rebuilt this out of four v1 `styled.View`s with the
 * same four rules in them (`flex: 1; gap: 16px`, `margin-top: auto;
 * padding-top: 16px; gap: 12px`). It is one component now, and the 450 px cap
 * the welcome copy already had is applied to all of them — a login form
 * stretched to 786 px on a desktop browser is a line length nobody can track.
 *
 * ## The headline
 *
 * tokens.md §5 gives `display` exactly one bold phrase per line, and on these
 * screens the phrase is the last word: "Sign **In**", "Choose New
 * **Password**". That is mechanical rather than authored — there is no screen
 * where a different word wants the weight — so `splitTitle` does it, and the
 * screens pass the plain string from the inventory.
 *
 * It keeps `role="heading"` / `aria-level="1"` from the `H1` it replaces.
 * Dropping those would be a silent regression: `Display` is a type scale, not
 * a landmark, and a screen reader's heading list is how you find the top of a
 * page you have been redirected to.
 */

/**
 * "Choose New Password" → `["Choose New ", "Password"]`.
 *
 * Pure and exported so the one rule in here is table-tested rather than read
 * off a story. A single-word title is all bold; the trailing space stays on
 * the lead half so the two Texts do not run together.
 */
function splitTitle(title: string): [lead: string, strong: string] {
	const lastSpace = title.trimEnd().lastIndexOf(" ");
	if (lastSpace === -1) return ["", title];
	return [title.slice(0, lastSpace + 1), title.slice(lastSpace + 1)];
}

type AuthScreenProps = {
	title: string;
	intro?: string;
	children?: React.ReactNode;
	footer: React.ReactNode;
};

function AuthScreen({ title, intro, children, footer }: AuthScreenProps) {
	const [lead, strong] = splitTitle(title);

	return (
		<ContentLayout>
			<View className="w-full max-w-[450px] flex-1 gap-4 self-center">
				<Display role="heading" aria-level="1">
					{lead}
					<Display.Strong>{strong}</Display.Strong>
				</Display>

				{intro ? <Body className="text-ink-2">{intro}</Body> : null}

				{children}

				{/* `mt-auto` is what pins this to the bottom of whatever space is
				    left, on a short form and a tall one alike. */}
				<View testID="auth-footer" className="mt-auto gap-3 pt-4">
					{footer}
				</View>
			</View>
		</ContentLayout>
	);
}

export { AuthScreen, splitTitle };
export type { AuthScreenProps };
