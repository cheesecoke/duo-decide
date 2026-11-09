import {
	CONTROL_MAX_FONT_SCALE,
	TextClassContext,
	TextMaxScaleContext,
} from "@/components/ui/reusables/text/text";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { Platform, Pressable } from "react-native";

/**
 * ADAPTED from React Native Reusables:
 *
 * - **No class shadows.** Upstream's `shadow-sm shadow-black/5` did nothing on
 *   native (NativeWind's iOS shadow needs a background and no
 *   `overflow-hidden`, and Android ignores it) and only drew on web, against
 *   the `SHADOW.*` rule. A button that wants elevation takes `SHADOW.card`
 *   from `theme/shadows.ts` as a `style`.
 * - **No `dark:` classes.** Duo is light-only; on native `dark:` follows the
 *   *system* appearance, so a phone in dark mode re-coloured these buttons.
 * - **Labels are capped for Dynamic Type** (`TextMaxScaleContext`): callers
 *   pin a button's height (`h-12`, `h-14`), so its label stops at 1.3×.
 */
const buttonVariants = cva(
	cn(
		"group shrink-0 flex-row items-center justify-center gap-2 rounded-md",
		Platform.select({
			web: "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive whitespace-nowrap outline-none transition-all focus-visible:ring-[3px] disabled:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
		}),
	),
	{
		variants: {
			variant: {
				default: cn("bg-primary active:bg-primary/90", Platform.select({ web: "hover:bg-primary/90" })),
				destructive: cn(
					"bg-destructive active:bg-destructive/90",
					Platform.select({
						web: "hover:bg-destructive/90 focus-visible:ring-destructive/20",
					}),
				),
				outline: cn(
					"border-border bg-background active:bg-accent border",
					Platform.select({
						web: "hover:bg-accent",
					}),
				),
				secondary: cn(
					"bg-secondary active:bg-secondary/80",
					Platform.select({ web: "hover:bg-secondary/80" }),
				),
				ghost: cn("active:bg-accent", Platform.select({ web: "hover:bg-accent" })),
				link: "",
			},
			// ADAPTED: the upstream sizes each pair a height with an `sm:`
			// override that shrinks the control on a ≥640 px viewport — a
			// shadcn habit for desktop web. Duo is a phone app that also runs
			// on the web at the same scale, and it has no responsive shrink
			// anywhere else, so the override was only ever a trap: a caller's
			// explicit `h-14` sits in the *unprefixed* height group, twMerge
			// keeps both, and at ≥640 px the media rule wins and a 56 px
			// footer button renders 36 px. Removed rather than worked around;
			// `button.test.tsx` fails if one comes back in an `rnr add` diff.
			size: {
				default: cn("h-10 px-4 py-2", Platform.select({ web: "has-[>svg]:px-3" })),
				sm: cn("h-9 gap-1.5 rounded-md px-3", Platform.select({ web: "has-[>svg]:px-2.5" })),
				lg: cn("h-11 rounded-md px-6", Platform.select({ web: "has-[>svg]:px-4" })),
				icon: "h-10 w-10",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

const buttonTextVariants = cva(
	cn(
		"text-foreground text-sm font-medium",
		Platform.select({ web: "pointer-events-none transition-colors" }),
	),
	{
		variants: {
			variant: {
				default: "text-primary-foreground",
				destructive: "text-white",
				outline: cn(
					"group-active:text-accent-foreground",
					Platform.select({ web: "group-hover:text-accent-foreground" }),
				),
				secondary: "text-secondary-foreground",
				ghost: "group-active:text-accent-foreground",
				link: cn(
					"text-primary group-active:underline",
					Platform.select({ web: "underline-offset-4 hover:underline group-hover:underline" }),
				),
			},
			size: {
				default: "",
				sm: "",
				lg: "",
				icon: "",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

type ButtonProps = React.ComponentProps<typeof Pressable> &
	React.RefAttributes<typeof Pressable> &
	VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, ...props }: ButtonProps) {
	return (
		<TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
			<TextMaxScaleContext.Provider value={CONTROL_MAX_FONT_SCALE}>
				<Pressable
					className={cn(props.disabled && "opacity-50", buttonVariants({ variant, size }), className)}
					role="button"
					{...props}
				/>
			</TextMaxScaleContext.Provider>
		</TextClassContext.Provider>
	);
}

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
