import * as React from "react";
import { View } from "react-native";

import { ContentLayout } from "@/components/layout";
import { Body, Display } from "@/components/ui/reusables/headline/headline";
import { HeartMark } from "@/components/ui/reusables/heart-mark/heart-mark";
import { usePersonColors } from "@/theme/usePersonColors";

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
 * ## The brand mark
 *
 * The six screens had no mark at all: you arrived from Welcome, which wore
 * one, and landed on a bare title. Chase asked for the heart to be the
 * application's main icon (2026-09-21), and sign-in is the screen he asked
 * about, so it is drawn here rather than on each screen — one frame, six
 * routes, and no way for one of them to drift.
 *
 * 40 px: half again the header's 20, so it reads as the app rather than as
 * chrome, and well under Welcome's 64, which is a centrepiece and not a
 * heading's companion. It is person A's `base`, the same seat as the other
 * two, and decorative — the `Display` under it is what a screen reader
 * announces.
 *
 * ## The headline
 *
 * tokens.md §5 gives `display` exactly one bold phrase per line, and on these
 * screens the phrase is the last word: "Sign **In**", "Choose New
 * **Password**". That is mechanical rather than authored — there is no screen
 * where a different word wants the weight — so `splitTitle` does it, and the
 * screens pass the plain string from the inventory.
 *
 * It keeps the `role="heading"` / `aria-level={1}` of the `H1` it replaces —
 * `Display` now carries both by default (headline.tsx), so this screen says
 * nothing about them. Dropping them would be a silent regression: a screen
 * reader's heading list is how you find the top of a page you have been
 * redirected to.
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
	const person = usePersonColors();

	return (
		<ContentLayout>
			<View className="w-full max-w-[450px] flex-1 gap-4 self-center">
				{/* The mark sits on the title's left edge — the frame is left-
				    aligned, and a centred badge over a left-aligned Display reads
				    as floating (T7 review). Wrapped in a `View` because
				    react-native-svg is not one of NativeWind's registered
				    components, so a class on the mark itself would be dropped. */}
				<View className="items-start">
					<HeartMark color={person.a.base} size={40} />
				</View>

				<Display>
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
