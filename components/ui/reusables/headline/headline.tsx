import * as React from "react";
import type { TextStyle } from "react-native";

import { Text, TextClassContext } from "@/components/ui/reusables/text/text";
import { cn } from "@/lib/utils";

/**
 * The type scale (tokens.md §5), as six components.
 *
 * | component | size/line | weight | colour  |
 * | --------- | --------- | ------ | ------- |
 * | `Eyebrow` | 13/16     | 500    | `ink-2` |
 * | `Display` | 32/38     | 300    | `ink`   |
 * | `Title`   | 20/26     | 600    | `ink`   |
 * | `Body`    | 16/22     | 400    | `ink`   |
 * | `Caption` | 13/18     | 500    | `ink-2` |
 * | `Numeral` | 40/44     | 600    | `ink`   |
 *
 * Each one publishes its classes through `TextClassContext` and renders a bare
 * vendored `Text`, the same shape Chip uses. That is what makes
 * `<Display.Strong>` work: the nested Text picks up the display's size, line
 * height and colour from the context and overrides nothing but the weight.
 *
 * The headline pattern tokens.md §5 asks for is a light 32 px line with
 * exactly ONE bold phrase in it:
 *
 *   <Display>What are we <Display.Strong>deciding today?</Display.Strong></Display>
 */

type TextProps = React.ComponentProps<typeof Text>;

/**
 * `Display` is 300 and `Display.Strong` is 700 — the only place in the system
 * where two weights share a line, and a 400-point swing. That is set as a real
 * style rather than a `font-bold` class so a caller's own `className` on the
 * surrounding Display cannot flatten it through class merging, and so it is
 * assertable under jest, where nativewind/babel is off (see babel.config.js).
 */
const STRONG_STYLE: TextStyle = { fontWeight: "700" };

/** RN spells tabular figures as a font variant; there is no NativeWind class. */
const TABULAR_STYLE: TextStyle = { fontVariant: ["tabular-nums"] };

function scaleComponent(displayName: string, classes: string) {
	function Component({ className, children, ...props }: TextProps) {
		return (
			<TextClassContext.Provider value={cn(classes, className)}>
				<Text {...props}>{children}</Text>
			</TextClassContext.Provider>
		);
	}
	Component.displayName = displayName;
	return Component;
}

/** "Decision Queue", "History" — a label above a headline, never uppercased. */
const Eyebrow = scaleComponent(
	"Eyebrow",
	"text-[13px] font-medium leading-4 tracking-[0.2px] text-ink-2",
);

const Title = scaleComponent("Title", "text-[20px] font-semibold leading-[26px] text-ink");

const Body = scaleComponent("Body", "text-[16px] font-normal leading-[22px] text-ink");

const Caption = scaleComponent("Caption", "text-[13px] font-medium leading-[18px] text-ink-2");

const DisplayRoot = scaleComponent("Display", "text-[32px] font-light leading-[38px] text-ink");

/** The one bold phrase inside a Display. Inherits everything but the weight. */
function Strong({ className, style, children, ...props }: TextProps) {
	return (
		<Text style={[STRONG_STYLE, style]} className={cn("font-bold", className)} {...props}>
			{children}
		</Text>
	);
}
Strong.displayName = "Display.Strong";

const Display = Object.assign(DisplayRoot, { Strong });

/** Vote counts and the gauge centre. Tabular so digits do not jitter. */
function Numeral({ className, style, children, ...props }: TextProps) {
	return (
		<TextClassContext.Provider
			value={cn("text-[40px] font-semibold leading-[44px] text-ink", className)}
		>
			<Text style={[TABULAR_STYLE, style]} {...props}>
				{children}
			</Text>
		</TextClassContext.Provider>
	);
}
Numeral.displayName = "Numeral";

export { Body, Caption, Display, Eyebrow, Numeral, Title };
