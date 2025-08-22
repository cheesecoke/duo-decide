import * as React from "react";
import {
	Controller,
	ControllerProps,
	FieldPath,
	FieldValues,
	FormProvider,
	Noop,
	useFormContext,
} from "react-hook-form";
import { View } from "react-native";
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { Switch } from "@/components/ui/Switch";
import { Textarea } from "@/components/ui/Textarea";
import { styled, getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import { Text } from "./Text";

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
		<FormFieldContext.Provider
			value={{
				name: props.name,
			}}
		>
			<Controller {...props} />
		</FormFieldContext.Provider>
	);
};

const useFormField = () => {
	const fieldContext = React.useContext(FormFieldContext);
	const itemContext = React.useContext(FormItemContext);
	const { getFieldState, formState, handleSubmit } = useFormContext();

	const fieldState = getFieldState(fieldContext.name, formState);

	if (!fieldContext) {
		throw new Error("useFormField should be used within <FormField>");
	}

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

type FormItemContextValue = {
	nativeID: string;
};

const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue);

const StyledFormItem = styled.View`
	gap: 8px;
`;

const FormItem = React.forwardRef<
	React.ComponentRef<typeof View>,
	React.ComponentPropsWithoutRef<typeof View> & {
		spacing?: number;
	}
>(({ spacing, style, ...props }, ref) => {
	const nativeID = React.useId();

	const itemStyle = {
		gap: spacing || 8,
		...style,
	};

	return (
		<FormItemContext.Provider
			value={{
				nativeID,
			}}
		>
			<StyledFormItem ref={ref} style={itemStyle} {...props} />
		</FormItemContext.Provider>
	);
});
FormItem.displayName = "FormItem";

const FormLabel = React.forwardRef<
	React.ComponentRef<typeof Label>,
	Omit<React.ComponentPropsWithoutRef<typeof Label>, "children"> & {
		children: string;
	}
>(({ nativeID: _nativeID, style, ...props }, ref) => {
	const { error, formItemNativeID } = useFormField();
	const { colorMode } = useTheme();

	const labelStyle = {
		paddingBottom: 4,
		paddingLeft: 1,
		paddingRight: 1,
		color: error ? getColor("destructive", colorMode) : undefined,
		...style,
	};

	return <Label ref={ref} style={labelStyle} nativeID={formItemNativeID} {...props} />;
});
FormLabel.displayName = "FormLabel";

const FormDescription = React.forwardRef<
	React.ComponentRef<typeof Text>,
	React.ComponentPropsWithoutRef<typeof Text>
>(({ style, ...props }, ref) => {
	const { formDescriptionNativeID } = useFormField();
	const { colorMode } = useTheme();

	const descriptionStyle = {
		fontSize: 14,
		color: getColor("mutedForeground", colorMode),
		paddingTop: 4,
		...style,
	};

	return <Text ref={ref} nativeID={formDescriptionNativeID} style={descriptionStyle} {...props} />;
});
FormDescription.displayName = "FormDescription";

const FormMessage = React.forwardRef<
	React.ComponentRef<typeof Animated.Text>,
	React.ComponentPropsWithoutRef<typeof Animated.Text>
>(({ style, children, ...props }, ref) => {
	const { error, formMessageNativeID } = useFormField();
	const { colorMode } = useTheme();
	const body = error ? String(error?.message) : children;

	if (!body) {
		return null;
	}

	const messageStyle = {
		fontSize: 14,
		fontWeight: "500" as const,
		color: getColor("destructive", colorMode),
		...style,
	};

	return (
		<Animated.Text
			entering={FadeInDown}
			exiting={FadeOut.duration(275)}
			ref={ref}
			nativeID={formMessageNativeID}
			style={messageStyle}
			{...props}
		>
			{body}
		</Animated.Text>
	);
});
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

const FormInput = React.forwardRef<
	React.ComponentRef<typeof Input>,
	FormItemProps<typeof Input, string>
>(({ label, description, onChange, ...props }, ref) => {
	const inputRef = React.useRef<React.ComponentRef<typeof Input>>(null);
	const { error, formItemNativeID, formDescriptionNativeID, formMessageNativeID } = useFormField();

	React.useImperativeHandle(ref, () => {
		if (!inputRef.current) {
			return {} as React.ComponentRef<typeof Input>;
		}
		return inputRef.current;
	}, [inputRef.current]);

	function handleOnLabelPress() {
		if (!inputRef.current) {
			return;
		}
		if (inputRef.current.isFocused()) {
			inputRef.current?.blur();
		} else {
			inputRef.current?.focus();
		}
	}

	return (
		<FormItem>
			{!!label && (
				<FormLabel nativeID={formItemNativeID} onPress={handleOnLabelPress}>
					{label}
				</FormLabel>
			)}

			<Input
				ref={inputRef}
				aria-labelledby={formItemNativeID}
				aria-describedby={
					!error ? `${formDescriptionNativeID}` : `${formDescriptionNativeID} ${formMessageNativeID}`
				}
				aria-invalid={!!error}
				onChangeText={onChange}
				{...props}
			/>
			{!!description && <FormDescription>{description}</FormDescription>}
			<FormMessage />
		</FormItem>
	);
});

FormInput.displayName = "FormInput";

const FormTextarea = React.forwardRef<
	React.ComponentRef<typeof Textarea>,
	FormItemProps<typeof Textarea, string>
>(({ label, description, onChange, ...props }, ref) => {
	const textareaRef = React.useRef<React.ComponentRef<typeof Textarea>>(null);
	const { error, formItemNativeID, formDescriptionNativeID, formMessageNativeID } = useFormField();

	React.useImperativeHandle(ref, () => {
		if (!textareaRef.current) {
			return {} as React.ComponentRef<typeof Textarea>;
		}
		return textareaRef.current;
	}, [textareaRef.current]);

	function handleOnLabelPress() {
		if (!textareaRef.current) {
			return;
		}
		if (textareaRef.current.isFocused()) {
			textareaRef.current?.blur();
		} else {
			textareaRef.current?.focus();
		}
	}

	return (
		<FormItem>
			{!!label && (
				<FormLabel nativeID={formItemNativeID} onPress={handleOnLabelPress}>
					{label}
				</FormLabel>
			)}

			<Textarea
				ref={textareaRef}
				aria-labelledby={formItemNativeID}
				aria-describedby={
					!error ? `${formDescriptionNativeID}` : `${formDescriptionNativeID} ${formMessageNativeID}`
				}
				aria-invalid={!!error}
				onChangeText={onChange}
				{...props}
			/>
			{!!description && <FormDescription>{description}</FormDescription>}
			<FormMessage />
		</FormItem>
	);
});

FormTextarea.displayName = "FormTextarea";

const StyledRadioFormItem = styled.View`
	gap: 12px;
`;

const FormRadioGroup = React.forwardRef<
	React.ComponentRef<typeof RadioGroup>,
	Omit<FormItemProps<typeof RadioGroup, string>, "onValueChange">
>(({ label, description, value, onChange, ...props }, ref) => {
	const { error, formItemNativeID, formDescriptionNativeID, formMessageNativeID } = useFormField();

	return (
		<StyledRadioFormItem>
			<View>
				{!!label && <FormLabel nativeID={formItemNativeID}>{label}</FormLabel>}
				{!!description && (
					<FormDescription
						style={{
							paddingTop: 0,
						}}
					>
						{description}
					</FormDescription>
				)}
			</View>
			<RadioGroup
				ref={ref}
				aria-labelledby={formItemNativeID}
				aria-describedby={
					!error ? `${formDescriptionNativeID}` : `${formDescriptionNativeID} ${formMessageNativeID}`
				}
				aria-invalid={!!error}
				onValueChange={onChange}
				value={value}
				{...props}
			/>

			<FormMessage />
		</StyledRadioFormItem>
	);
});

FormRadioGroup.displayName = "FormRadioGroup";

const StyledSwitchFormItem = styled.View`
	padding: 4px;
`;

const StyledSwitchRow = styled.View`
	flex-direction: row;
	gap: 12px;
	align-items: center;
`;

const FormSwitch = React.forwardRef<
	React.ComponentRef<typeof Switch>,
	Omit<FormItemProps<typeof Switch, boolean>, "checked" | "onCheckedChange">
>(({ label, description, value, onChange, ...props }, ref) => {
	const switchRef = React.useRef<React.ComponentRef<typeof Switch>>(null);
	const { error, formItemNativeID, formDescriptionNativeID, formMessageNativeID } = useFormField();

	React.useImperativeHandle(ref, () => {
		if (!switchRef.current) {
			return {} as React.ComponentRef<typeof Switch>;
		}
		return switchRef.current;
	}, [switchRef.current]);

	function handleOnLabelPress() {
		onChange?.(!value);
	}

	return (
		<StyledSwitchFormItem>
			<StyledSwitchRow>
				<Switch
					ref={switchRef}
					aria-labelledby={formItemNativeID}
					aria-describedby={
						!error ? `${formDescriptionNativeID}` : `${formDescriptionNativeID} ${formMessageNativeID}`
					}
					aria-invalid={!!error}
					onCheckedChange={onChange}
					checked={value}
					{...props}
				/>
				{!!label && (
					<FormLabel
						style={{
							paddingBottom: 0,
						}}
						nativeID={formItemNativeID}
						onPress={handleOnLabelPress}
					>
						{label}
					</FormLabel>
				)}
			</StyledSwitchRow>
			{!!description && <FormDescription>{description}</FormDescription>}
			<FormMessage />
		</StyledSwitchFormItem>
	);
});

FormSwitch.displayName = "FormSwitch";

export {
	Form,
	FormDescription,
	FormField,
	FormInput,
	FormItem,
	FormLabel,
	FormMessage,
	FormRadioGroup,
	FormSwitch,
	FormTextarea,
	useFormField,
};
