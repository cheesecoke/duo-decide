import * as React from "react";
import { View } from "react-native";

import { Card } from "@/components/ui/reusables/card/card";
import { Body, Caption, Title } from "@/components/ui/reusables/headline/headline";

/**
 * StatusCard — the block an auth screen uses to say a thing went wrong, or
 * that it worked and you should go look at your inbox.
 *
 * Every auth screen carried its own pair of these, spelled in hard-coded
 * Tailwind-palette hex (`#fef2f2` / `#fca5a5` / `#991b1b`, `#f0fdf4` /
 * `#86efac` / `#166534`) with a border around each one. Both facts are wrong
 * under tokens.md: §3 says cards do not use borders, and neither palette is
 * in the system.
 *
 * ## There is no green
 *
 * The success card is `Card state="together"` — the two-hue gradient, at the
 * wash opacity every other together-card uses. That is not a substitute for
 * green, it is the actual meaning: tokens.md §1 gives `together` to "both of
 * you", and §10 keeps it as the celebratory state. A palette with two people
 * in it and no third accent colour has nothing else to say "this worked"
 * with, and inventing a green for six screens would put a colour on the page
 * that belongs to no one.
 *
 * ## Tone picks the role, not just the colour
 *
 * An error is `role="alert"` — a screen reader interrupts for it, because the
 * thing you just did did not happen. A success is `role="status"`, which is
 * announced politely: you are already looking at it, and nothing is broken.
 *
 * ## Lines
 *
 * Each *string* child is one line, so a two-line card is two template-literal
 * children rather than one string with a newline in it. (Template literals,
 * not JSX text with `{email}` in the middle of it — that is three children,
 * and it would come out as three lines.) Anything that is not a string is
 * rendered as-is, for a caller that needs something other than a sentence.
 */

type StatusTone = "error" | "success";

type StatusCardProps = {
	tone: StatusTone;
	title: string;
	children?: React.ReactNode;
};

/** Wraps each bare string child in `Line`; leaves elements alone. */
function toLines(
	children: React.ReactNode,
	Line: (props: { children: React.ReactNode }) => React.ReactElement,
) {
	return React.Children.map(children, (child) =>
		typeof child === "string" || typeof child === "number" ? <Line>{child}</Line> : child,
	);
}

/**
 * Error body: caption scale, full `ink` — the red is the title's job, and
 * `ink-2` on `destructive-tint` measures 4.21:1, under AA's 4.5:1 (Task 12
 * fix round); `ink` on it is 13.8:1.
 */
function ErrorLine({ children }: { children: React.ReactNode }) {
	return <Caption className="text-ink">{children}</Caption>;
}

/** Success body: body scale, `ink-2`, on the together wash. */
function SuccessLine({ children }: { children: React.ReactNode }) {
	return <Body className="text-ink-2">{children}</Body>;
}

function StatusCard({ tone, title, children }: StatusCardProps) {
	if (tone === "error") {
		return (
			<View
				testID="status-card-error"
				role="alert"
				className="gap-1 rounded-card bg-destructive-tint p-4"
			>
				<Body className="font-semibold text-destructive">{title}</Body>
				{toLines(children, ErrorLine)}
			</View>
		);
	}

	// The wrapper keeps `Card`'s own `card-state-together` testID reachable —
	// it is how card.test.tsx and every screen test identify a together card.
	return (
		<View testID="status-card-success">
			<Card state="together" role="status">
				<Title>{title}</Title>
				<View className="mt-2 gap-2">{toLines(children, SuccessLine)}</View>
			</Card>
		</View>
	);
}

export { StatusCard };
export type { StatusCardProps, StatusTone };
