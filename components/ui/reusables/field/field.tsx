import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { TextInput, type TextInputProps } from "react-native";

import { Text, TextClassContext } from "@/components/ui/reusables/text/text";
import { cn } from "@/lib/utils";
import { NEUTRAL } from "@/theme/neutrals";

/**
 * Field — the text entry primitives, and the small uppercase label above them.
 *
 * React Native Reusables ships an `input` and a `textarea`, but both are
 * written against the shadcn scale (`h-10`, `border-input`, `rounded-md`) and
 * none of that survives contact with the round-3 mock, where a field is a
 * borderless `surface-2` slab at `radius.field` (tokens.md §4). So these are
 * Duo's own, built on the same three pieces the vendored files use — `cva`
 * for the variants, `cn()` for last-one-wins merging, `TextClassContext` for
 * the text that sits inside — so they read like the rest of `reusables/`.
 *
 * Mock: `.inp`, `.ta`, `.flabel`
 * (design-refs/mocks/decision-queue-round-3.html:263-265, :331).
 */

/**
 * The resting border is transparent rather than absent: RN adds border width
 * to the box, so a field that only grows a border on focus would jump 2 px
 * and shove everything below it down. The mock gets this for free with
 * `box-shadow`, which RN has no equivalent of on a `TextInput`.
 *
 * `web:outline-none` is the second half of that ring. On web a `TextInput`
 * renders as a real `<input>`/`<textarea>`, so the browser paints its own
 * `:focus` outline — 1 px of `auto` in `rgb(0 95 204)` — directly over the
 * border below, and royal blue is not a colour this app owns. Suppressing it
 * is scoped to *fields*, and deliberately not done in `global.css`: the ring
 * here replaces the UA outline, and nothing else in the app has a replacement
 * to offer, so buttons, links and chips keep theirs. The variant prefix keeps
 * the rule off native, where there is no outline to suppress.
 */
const fieldVariants = cva(
	"w-full rounded-field border-2 border-transparent bg-surface-2 text-ink web:outline-none",
	{
		variants: {
			size: {
				// tokens.md §5 — body 16/22 for a form field…
				md: "px-3.5 py-2.5 text-[16px] leading-[22px]",
				// …and one step down for the option rows, which are a list of
				// short phrases inside an already-indented block (`.optrow .inp`).
				sm: "px-3 py-2 text-row",
			},
			/**
			 * `deep`, not `base`. Once the UA outline is gone this border is
			 * the *only* thing marking focus, so it has to carry the 3:1 that
			 * WCAG 2.1 §1.4.11 asks of a focus indicator. Against `surface-2`
			 * none of the five presets' `base` steps do — sage 1.96:1,
			 * lavender 1.96, blush 1.84, sky 1.59, butter 1.33 — because
			 * `base` is a ~70%-lightness fill colour, picked to sit *under*
			 * text rather than to be seen against near-white. Every `deep`
			 * clears it with room (6.2:1 butter to 9.2:1 lavender), and it is
			 * still the same hue the couple chose.
			 */
			focused: {
				true: "border-person-a-deep",
				false: "",
			},
			/**
			 * A field whose value failed validation. Declared *after* `focused`
			 * so `cn()` resolves the two borders in this order — a field you
			 * are typing into that is still invalid stays visibly wrong rather
			 * than looking like every other focused field.
			 *
			 * The message under the field announces the error; this is the
			 * half a sighted user gets, and without it an invalid field is
			 * only findable by reading.
			 */
			invalid: {
				true: "border-destructive",
				false: "",
			},
		},
		defaultVariants: { size: "md", focused: false, invalid: false },
	},
);

type FieldVariants = Omit<VariantProps<typeof fieldVariants>, "focused">;

type InputProps = TextInputProps & FieldVariants & { className?: string };

/**
 * `focused` is component state rather than a prop: nothing outside a field
 * cares, and threading it up would make every call site own a boolean it
 * never reads.
 */
function useFocusRing({ onFocus, onBlur }: Pick<TextInputProps, "onFocus" | "onBlur">) {
	const [focused, setFocused] = React.useState(false);

	return {
		focused,
		handlers: {
			onFocus: (event: Parameters<NonNullable<TextInputProps["onFocus"]>>[0]) => {
				setFocused(true);
				onFocus?.(event);
			},
			onBlur: (event: Parameters<NonNullable<TextInputProps["onBlur"]>>[0]) => {
				setFocused(false);
				onBlur?.(event);
			},
		},
	};
}

const Input = React.forwardRef<React.ComponentRef<typeof TextInput>, InputProps>(function Input(
	{ className, size, invalid, onFocus, onBlur, ...props },
	ref,
) {
	const { focused, handlers } = useFocusRing({ onFocus, onBlur });

	return (
		<TextInput
			ref={ref}
			// `placeholderTextColor` is a value, not a class — ink-3 is what
			// tokens.md §3 reserves for placeholders.
			placeholderTextColor={NEUTRAL.ink3}
			className={cn(
				fieldVariants({ size, focused, invalid }),
				props.editable === false && "opacity-50",
				className,
			)}
			{...props}
			{...handlers}
		/>
	);
});

type TextareaProps = InputProps;

const Textarea = React.forwardRef<React.ComponentRef<typeof TextInput>, TextareaProps>(
	function Textarea({ className, size, invalid, onFocus, onBlur, multiline = true, ...props }, ref) {
		const { focused, handlers } = useFocusRing({ onFocus, onBlur });

		return (
			<TextInput
				ref={ref}
				multiline={multiline}
				// Without this the first line sits vertically centred in the
				// box on Android, which reads as a mis-sized input.
				textAlignVertical="top"
				placeholderTextColor={NEUTRAL.ink3}
				className={cn(
					fieldVariants({ size, focused, invalid }),
					// `.ta { min-height: 76px }` — raise it at the call site.
					"min-h-[76px]",
					props.editable === false && "opacity-50",
					className,
				)}
				{...props}
				{...handlers}
			/>
		);
	},
);

/**
 * `.flabel` — the small caps label above a field.
 *
 * tokens.md §5 has no uppercase style, so this is the eyebrow scale (13/16,
 * 500) in the mock's field-label treatment: uppercased, a touch more
 * tracking, and `ink-3` rather than `ink-2` because a form is a stack of
 * these and they should sit behind the values, not compete with them.
 *
 * Spelled out rather than composed from `Eyebrow` so the colour and tracking
 * are decided here instead of by tailwind-merge's opinion about which of two
 * `text-ink-*` classes wins.
 */
const FIELD_LABEL_CLASS = "text-[13px] font-medium uppercase leading-4 tracking-[0.4px] text-ink-3";

function FieldLabel({
	className,
	children,
	...props
}: React.ComponentProps<typeof Text> & { className?: string }) {
	return (
		<TextClassContext.Provider value={cn(FIELD_LABEL_CLASS, className)}>
			<Text {...props}>{children}</Text>
		</TextClassContext.Provider>
	);
}
FieldLabel.displayName = "FieldLabel";

export { FieldLabel, fieldVariants, Input, Textarea };
export type { InputProps, TextareaProps };
