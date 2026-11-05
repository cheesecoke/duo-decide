import { cn } from "@/lib/utils";
// Adapted: this project pins @rn-primitives/slot@1.x, which exports
// per-element slots (Slot.Text) rather than a single `Slot`.
import * as Slot from "@rn-primitives/slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { Platform, Text as RNText, type Role } from "react-native";

const textVariants = cva(
	cn(
		"text-foreground text-base",
		Platform.select({
			web: "select-text",
		}),
	),
	{
		variants: {
			variant: {
				default: "",
				h1: cn(
					"text-center text-4xl font-extrabold tracking-tight",
					Platform.select({ web: "scroll-m-20 text-balance" }),
				),
				h2: cn(
					"border-border border-b pb-2 text-3xl font-semibold tracking-tight",
					Platform.select({ web: "scroll-m-20 first:mt-0" }),
				),
				h3: cn("text-2xl font-semibold tracking-tight", Platform.select({ web: "scroll-m-20" })),
				h4: cn("text-xl font-semibold tracking-tight", Platform.select({ web: "scroll-m-20" })),
				p: "mt-3 leading-7 sm:mt-6",
				blockquote: "mt-4 border-l-2 pl-3 italic sm:mt-6 sm:pl-6",
				code: cn("bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold"),
				lead: "text-muted-foreground text-xl",
				large: "text-lg font-semibold",
				small: "text-sm font-medium leading-none",
				muted: "text-muted-foreground text-sm",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

type TextVariantProps = VariantProps<typeof textVariants>;

type TextVariant = NonNullable<TextVariantProps["variant"]>;

const ROLE: Partial<Record<TextVariant, Role>> = {
	h1: "heading",
	h2: "heading",
	h3: "heading",
	h4: "heading",
	blockquote: Platform.select({ web: "blockquote" as Role }),
	code: Platform.select({ web: "code" as Role }),
};

const ARIA_LEVEL: Partial<Record<TextVariant, string>> = {
	h1: "1",
	h2: "2",
	h3: "3",
	h4: "4",
};

const TextClassContext = React.createContext<string | undefined>(undefined);

/**
 * Dynamic Type cap for a label inside a fixed-height control.
 *
 * iOS Larger Text scales a `Text`'s font size *and* line-height by up to
 * 3.1×, but a control with a fixed height (`h-12`, `h-14`) does not grow with
 * it, so its label clipped top and bottom. A control provides
 * `CONTROL_MAX_FONT_SCALE` here and every reusable `Text` inside it takes it
 * as `maxFontSizeMultiplier`: the label still grows by 30%, which a 16/22 label
 * in a 48 px control has room for, and stops there. At the default text size
 * nothing changes. A `maxFontSizeMultiplier` prop on the `Text` still wins.
 *
 * Body text, headings and anything that can wrap into a taller box keep the
 * full scale: leave them outside this context.
 */
const TextMaxScaleContext = React.createContext<number | undefined>(undefined);
const CONTROL_MAX_FONT_SCALE = 1.3;

/**
 * Lets a line of user text break *inside* a word when nothing else fits — a
 * pasted URL has no spaces, so without it the text keeps its full width and
 * pushes whatever holds it past the card's edge.
 *
 * Web only, and it has to be `anywhere`: react-native-web already sets
 * `overflow-wrap: break-word`, but that value does not count toward a flex
 * item's min-content width, so the item still refuses to shrink below the
 * whole URL. `anywhere` does count. iOS and Android break long tokens on
 * their own and have no such property, so native gets nothing.
 *
 * Pair it with `min-w-0 shrink` (or `flex-1`) when the text sits in a row.
 */
const WRAP_ANYWHERE = Platform.select({ web: "[overflow-wrap:anywhere]", default: "" });

function Text({
	className,
	asChild = false,
	variant = "default",
	...props
}: React.ComponentProps<typeof RNText> &
	TextVariantProps & {
		asChild?: boolean;
	}) {
	// Upstream also intersects `React.RefAttributes<typeof RNText>`, which on
	// React 19 adds a `ref` typed against the component *constructor* and
	// conflicts with the `ref` ComponentProps already carries. Dropped here.
	const textClass = React.useContext(TextClassContext);
	const maxFontSizeMultiplier = React.useContext(TextMaxScaleContext);
	// Cast: @rn-primitives/slot@1.x types Slot.Text with its own ref shape,
	// which does not line up with RNText's. Behaviourally they are the same
	// props; the newer Slot API upstream targets does not have this mismatch.
	const Component = (asChild ? Slot.Text : RNText) as typeof RNText;
	return (
		<Component
			className={cn(textVariants({ variant }), textClass, className)}
			role={variant ? ROLE[variant] : undefined}
			aria-level={variant ? ARIA_LEVEL[variant] : undefined}
			maxFontSizeMultiplier={maxFontSizeMultiplier}
			{...props}
		/>
	);
}

export { CONTROL_MAX_FONT_SCALE, Text, TextClassContext, TextMaxScaleContext, WRAP_ANYWHERE };
