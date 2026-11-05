import * as React from "react";
import {
	Linking,
	Platform,
	Text as RNText,
	type GestureResponderEvent,
	type ViewStyle,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import { Text, WRAP_ANYWHERE } from "@/components/ui/reusables/text/text";
import { linkify } from "@/lib/linkify";
import { cn } from "@/lib/utils";
import { usePersonColors } from "@/theme/usePersonColors";

/**
 * OptionText — an option's title, with any pasted link made tappable.
 *
 * Options are whatever was typed or pasted, and many are a name and a URL.
 * Each link (`lib/linkify.ts`) is drawn as its **hostname without `www.`**
 * plus a small arrow-out-of-box mark — "Alexa Sharf: psychologytoday.com ↗"
 * — rather than the whole URL. The full URL is the link's accessible label,
 * so a screen reader still has it, and the caller's own label (the decision
 * card's option row) still carries the title exactly as written.
 *
 * ## Pressing a link
 *
 * The link is a nested `Text` with its own `onPress`, which is how React
 * Native does inline links: it wraps with the line rather than jumping to a
 * row of its own, and its press never reaches whatever the text sits in.
 *
 * - **Native:** a nested `Text` with `onPress` becomes the touch responder
 *   ahead of any `Pressable` around it, so pressing the link does not select
 *   the option row. That holds on a *disabled* row too — a decided card's
 *   links still open.
 * - **Web:** react-native-web's `Text` calls `stopPropagation()` on the click
 *   before `onPress`, and a `Pressable` only fires from that click
 *   (PressResponder's `onClick`), so the row never hears it.
 *
 * `Linking.openURL(url)` with one argument opens a **new tab** on web:
 * react-native-web's `openURL` defaults its target to `_blank` and calls
 * `window.open(url, "_blank", "noopener")`. On iOS and Android it hands the
 * URL to the system browser.
 *
 * The outer `Text` takes the caller's `className` (size, weight, colour) and
 * the link inherits all of it except colour and underline. The link is a
 * *plain* React Native `Text` for exactly that reason: the reusable `Text`
 * re-applies `text-base`, which would set a 15 px row's link at 16 px.
 */

type OptionTextProps = Omit<React.ComponentProps<typeof Text>, "children"> & {
	/** The title, exactly as stored. */
	text: string;
	/** Extra classes for each link run (colour, weight). */
	linkClassName?: string;
	/**
	 * Whose `deep` the link and its mark are drawn in. Person A (the viewer)
	 * unless the text sits on the other person's tint, as a history row's
	 * winning pill does when the partner decided it.
	 */
	tone?: "a" | "b";
};

const LINK_CLASS = { a: "text-person-a-deep", b: "text-person-b-deep" } as const;

/** Opens a link. On web this is a new tab — see the file comment. */
function openLink(url: string) {
	// A bad URL or no handler for its scheme: there is nothing useful to do
	// from inside a list row, and an unhandled rejection is worse.
	Linking.openURL(url).catch(() => {});
}

/**
 * Tailwind's preflight sets `svg { display: block }`, which on web drops the
 * mark onto a line of its own. Inside a run of text it has to be inline. A
 * `style` because a `className` does not reach react-native-svg (CLAUDE.md);
 * cast because React Native's style types have no `inline-block`.
 */
const INLINE_ON_WEB = Platform.select({
	web: { display: "inline-block", verticalAlign: "-1px" } as unknown as ViewStyle,
	default: undefined,
});

/**
 * Arrow out of a box, on the 24-unit grid the card's other glyphs use
 * (`decision-card/glyphs.tsx`): stroke 2, round caps, no fill. Decorative —
 * the link around it carries the label.
 */
function ExternalLinkGlyph({ size = 13, color }: { size?: number; color: string }) {
	return (
		<Svg
			testID="glyph-external-link"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			style={INLINE_ON_WEB}
		>
			{["M14 4h6v6", "M20 4 11 13", "M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"].map(
				(d) => (
					<Path
						key={d}
						d={d}
						stroke={color}
						strokeWidth={2.25}
						strokeLinecap="round"
						strokeLinejoin="round"
						fill="none"
					/>
				),
			)}
		</Svg>
	);
}

/** How many of the host's last letters stay on the line with the mark. */
const TAIL = 4;

function OptionText({ text, className, linkClassName, tone = "a", ...props }: OptionTextProps) {
	const person = usePersonColors();
	const segments = React.useMemo(() => linkify(text), [text]);

	return (
		<Text className={cn(WRAP_ANYWHERE, className)} {...props}>
			{segments.map((segment, index) =>
				segment.type === "text" ? (
					segment.text
				) : (
					<RNText
						// Index keys are right here: the segments are derived from
						// one string and only ever change all together.
						key={index}
						role="link"
						accessibilityLabel={segment.url}
						accessibilityHint="Opens in your browser"
						onPress={(event: GestureResponderEvent) => {
							event?.stopPropagation?.();
							openLink(segment.url);
						}}
						className={cn(LINK_CLASS[tone], linkClassName)}
					>
						{/* The underline is on the hostname only, so it does not run
						    on under the space and the mark. */}
						<RNText className="underline">{segment.host.slice(0, -TAIL)}</RNText>
						{/* The last few letters, a no-break space and the mark are
						    held on one line: on web a line may otherwise break before
						    the <svg> (an atomic inline) however the space is spelled,
						    leaving the mark alone on a line of its own. */}
						<RNText className="web:whitespace-nowrap">
							<RNText className="underline">{segment.host.slice(-TAIL)}</RNText>
							{"\u00A0"}
							<ExternalLinkGlyph color={person[tone].deep} />
						</RNText>
					</RNText>
				),
			)}
		</Text>
	);
}

export { ExternalLinkGlyph, OptionText, openLink };
export type { OptionTextProps };
