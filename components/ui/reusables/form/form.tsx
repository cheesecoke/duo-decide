import * as React from "react";
import {
	Controller,
	FormProvider,
	useFormContext,
	type ControllerProps,
	type FieldPath,
	type FieldValues,
	type Noop,
} from "react-hook-form";
import { View, type TextInput } from "react-native";
import { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { AnimatedView } from "@/components/ui/reusables/animated/animated";
import { FieldLabel, Input } from "@/components/ui/reusables/field/field";
import { Caption } from "@/components/ui/reusables/headline/headline";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import { DUR } from "@/theme/motion";

/**
 * Form — react-hook-form + zod, wired to the v2 field primitives.
 *
 * This is `components/ui/Form.tsx` ported onto `reusables/field` and the
 * tokens.md §5 type scale. The accessibility wiring is the part worth keeping
 * and it is unchanged: one generated id per field, the label pointing at the
 * input through `aria-labelledby`, the description and the error message
 * pointing back through `aria-describedby`, and `aria-invalid` on the input
 * itself. Tapping a label focuses (or blurs) its field, which is the only way
 * a 13 px uppercase label is a usable target.
 *
 * Three of the old file's exports — `FormTextarea`, `FormSwitch`,
 * `FormRadioGroup` — are deliberately not ported. Nothing imported them
 * (grep, PLAN-3 task 12); they were carrying `components/ui/Textarea`,
 * `Switch` and `RadioGroup` along with them, all of which the cleanup task
 * removes.
 *
 * ## What changed, and why
 *
 * The error message is announced as well as shown. The old `FormMessage` was
 * an `Animated.Text` in destructive red with no role, so a screen reader had
 * to be looking at the field to hear that it was wrong — `aria-describedby`
 * alone does not interrupt. It carries `role="alert"` now.
 *
 * The invalid field is *visibly* wrong. Red text under a field reads as a
 * note about the field, not a fault in it, so the input takes the field's new
 * `invalid` variant (a `border-destructive` ring) alongside `aria-invalid`.
 *
 * The message moves in rather than appearing. tokens.md §8: a state change
 * moves. It is driven by a shared value rather than `entering={FadeInDown}`
 * for the reason `error-strip.tsx` spells out — a layout animation that fails
 * to run on a cold web load leaves the element permanently invisible, and an
 * error nobody can see is worse than an error that does not animate.
 */

const Form = FormProvider;

type FormFieldContextValue<
	TFieldValues extends FieldValues = FieldValues,
	TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
	name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);

const FormField = <
	TFieldValues extends FieldValues = FieldValues,
	TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
	...props
}: ControllerProps<TFieldValues, TName>) => {
	return (
		<FormFieldContext.Provider value={{ name: props.name }}>
			<Controller {...props} />
		</FormFieldContext.Provider>
	);
};

type FormItemContextValue = {
	nativeID: string;
};

const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue);

/**
 * The three ids a field needs, derived from the one `FormItem` generates.
 *
 * They are derived rather than generated separately so a label, a description
 * and a message can each be written without any of them being handed the
 * others' ids.
 */
const useFormField = () => {
	const fieldContext = React.useContext(FormFieldContext);
	const itemContext = React.useContext(FormItemContext);
	const { getFieldState, formState, handleSubmit } = useFormContext();

	if (!fieldContext) {
		throw new Error("useFormField should be used within <FormField>");
	}

	const fieldState = getFieldState(fieldContext.name, formState);
	const { nativeID } = itemContext;

	return {
		nativeID,
		name: fieldContext.name,
		formItemNativeID: `${nativeID}-form-item`,
		formDescriptionNativeID: `${nativeID}-form-item-description`,
		formMessageNativeID: `${nativeID}-form-item-message`,
		handleSubmit,
		...fieldState,
	};
};

/** One field's column: label, control, description, message. */
function FormItem({
	className,
	...props
}: React.ComponentProps<typeof View> & { className?: string }) {
	const nativeID = React.useId();

	return (
		<FormItemContext.Provider value={{ nativeID }}>
			<View className={cn("gap-2", className)} {...props} />
		</FormItemContext.Provider>
	);
}
FormItem.displayName = "FormItem";

/**
 * The field's label — `FieldLabel`, which is what every other form surface in
 * the app uses, turning `text-destructive` when the field is in error so the
 * fault reads from the top of the field down.
 */
function FormLabel({
	className,
	nativeID: _nativeID,
	...props
}: React.ComponentProps<typeof FieldLabel> & { children: string }) {
	const { error, formItemNativeID } = useFormField();

	return (
		<FieldLabel
			nativeID={formItemNativeID}
			className={cn(error && "text-destructive", className)}
			{...props}
		/>
	);
}
FormLabel.displayName = "FormLabel";

/** The hint under a field. `ink-3`, behind both the value and the message. */
function FormDescription({
	className,
	...props
}: React.ComponentProps<typeof Caption> & { className?: string }) {
	const { formDescriptionNativeID } = useFormField();

	return (
		<Caption nativeID={formDescriptionNativeID} className={cn("text-ink-3", className)} {...props} />
	);
}
FormDescription.displayName = "FormDescription";

/**
 * The validation message. Renders nothing until there is something to say.
 *
 * `role="alert"` sits on the wrapper rather than the text so the announcement
 * and the motion are the same element — and because the wrapper is what
 * `aria-describedby` points at. It carries a `testID` for the same reason
 * `ErrorStrip` does: a role is not a query under this jest setup, and an
 * error a test cannot find is an error nobody guards.
 */
function FormMessage({
	className,
	children,
	testID = "form-message",
	...props
}: React.ComponentProps<typeof Caption> & { className?: string; testID?: string }) {
	const { error, formMessageNativeID } = useFormField();
	const reducedMotion = useReducedMotion();
	const progress = useSharedValue(0);

	const body = error ? String(error?.message) : children;

	React.useEffect(() => {
		// Back to the start on *every* change of `body`, including the one that
		// clears it. Without this the message animates exactly once per mount:
		// `FormMessage` is always rendered (it returns null when there is
		// nothing to say), so the shared value survives, and a second failure
		// on the same field — or a different message on it — would read a
		// progress of 1 on its first render and simply be there, fully formed.
		//
		// Resetting and re-running in the same tick is the pattern card.tsx
		// uses: the assignment lands synchronously, so the animation that
		// follows starts from 0 and no frame is ever painted at the stale value.
		progress.value = 0;
		if (!body) return;
		progress.value = reducedMotion ? 1 : withTiming(1, { duration: DUR.fast });
	}, [body, progress, reducedMotion]);

	// Explicit dependency array: Reanimated's Babel plugin does not run in
	// Storybook's vite pipeline (see .storybook/main.ts), and without one
	// `useAnimatedStyle` throws on web.
	const style = useAnimatedStyle(
		() => ({ opacity: progress.value, transform: [{ translateY: (progress.value - 1) * 4 }] }),
		[progress],
	);

	if (!body) return null;

	return (
		<AnimatedView testID={testID} nativeID={formMessageNativeID} role="alert" style={style}>
			<Caption className={cn("text-destructive", className)} {...props}>
				{body}
			</Caption>
		</AnimatedView>
	);
}
FormMessage.displayName = "FormMessage";

type Override<T, U> = Omit<T, keyof U> & U;

interface FormFieldFieldProps<T> {
	name: string;
	onBlur: Noop;
	onChange: (val: T) => void;
	value: T;
	disabled?: boolean;
}

type FormItemProps<T extends React.ElementType<any>, U> = Override<
	React.ComponentPropsWithoutRef<T>,
	FormFieldFieldProps<U>
> & {
	label?: string;
	description?: string;
};

/**
 * A text field, with everything a `FormField` render prop hands it.
 *
 * ## Why this is two components
 *
 * `FormItem` is what generates the id every other piece derives from, and it
 * publishes it through context — so a component that *renders* a `FormItem`
 * cannot also read from it. The old `components/ui/Form.tsx` did exactly that:
 * `useFormField()` ran in the same body that returned `<FormItem>`, one level
 * too high, and every id it computed came back `"undefined-form-item"`. The
 * label looked right because `FormLabel` re-derives its own id from inside —
 * but the input's `aria-labelledby`, `aria-describedby` and the message's id
 * all pointed at nothing, in every auth form, silently. Splitting the control
 * out puts the read below the write, where it resolves.
 *
 * The imperative handle is forwarded from the inner `TextInput` rather than
 * the wrapper so a caller can still `.focus()` the actual control — which is
 * also how the label press works.
 */
const FormInput = React.forwardRef<
	React.ComponentRef<typeof TextInput>,
	FormItemProps<typeof Input, string>
>(function FormInput(props, ref) {
	return (
		<FormItem>
			<FormInputControl {...props} ref={ref} />
		</FormItem>
	);
});
FormInput.displayName = "FormInput";

/** The inside of a `FormInput`: everything that needs the item's ids. */
const FormInputControl = React.forwardRef<
	React.ComponentRef<typeof TextInput>,
	FormItemProps<typeof Input, string>
>(function FormInputControl({ label, description, onChange, ...props }, ref) {
	const inputRef = React.useRef<React.ComponentRef<typeof TextInput>>(null);
	const { error, formItemNativeID, formDescriptionNativeID, formMessageNativeID } = useFormField();

	React.useImperativeHandle(ref, () => {
		if (!inputRef.current) {
			return {} as React.ComponentRef<typeof TextInput>;
		}
		return inputRef.current;
	});

	/** Tapping the label focuses the field, or blurs it if it already has focus. */
	function handleOnLabelPress() {
		if (!inputRef.current) return;
		if (inputRef.current.isFocused()) {
			inputRef.current.blur();
		} else {
			inputRef.current.focus();
		}
	}

	return (
		<>
			{!!label && <FormLabel onPress={handleOnLabelPress}>{label}</FormLabel>}

			<Input
				ref={inputRef}
				aria-labelledby={formItemNativeID}
				aria-describedby={
					!error ? `${formDescriptionNativeID}` : `${formDescriptionNativeID} ${formMessageNativeID}`
				}
				aria-invalid={!!error}
				invalid={!!error}
				onChangeText={onChange}
				{...props}
			/>
			{!!description && <FormDescription>{description}</FormDescription>}
			<FormMessage />
		</>
	);
});
FormInputControl.displayName = "FormInputControl";

export {
	Form,
	FormDescription,
	FormField,
	FormInput,
	FormItem,
	FormLabel,
	FormMessage,
	useFormField,
};
