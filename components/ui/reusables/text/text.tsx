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
	// Cast: @rn-primitives/slot@1.x types Slot.Text with its own ref shape,
	// which does not line up with RNText's. Behaviourally they are the same
	// props; the newer Slot API upstream targets does not have this mismatch.
	const Component = (asChild ? Slot.Text : RNText) as typeof RNText;
	return (
		<Component
			className={cn(textVariants({ variant }), textClass, className)}
			role={variant ? ROLE[variant] : undefined}
			aria-level={variant ? ARIA_LEVEL[variant] : undefined}
			{...props}
		/>
	);
}

export { Text, TextClassContext };
