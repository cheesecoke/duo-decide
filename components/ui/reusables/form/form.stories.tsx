import * as React from "react";
import { View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { Button } from "@/components/ui/reusables/button/button";
import { Form, FormField, FormInput } from "@/components/ui/reusables/form/form";
import { Text } from "@/components/ui/reusables/text/text";
import { emailRule, passwordRules } from "@/lib/auth/password-schema";

/**
 * Form — react-hook-form and zod, wearing the v2 field primitives.
 *
 * What to look for: **press Submit with the fields empty.** The message slides
 * in under the field, the label turns destructive and the field itself grows a
 * red ring — the error is visible, not only announced. Then fix one field and
 * submit again: that field's error clears on its own, because react-hook-form
 * revalidates a field once it has been submitted.
 *
 * The rules are the real ones (`lib/auth/password-schema.ts`), so the messages
 * here are the messages sign-up shows.
 */
const meta = {
	title: "Reusables/Form",
	decorators: [
		(Story) => (
			<View className="w-full max-w-[390px] gap-4 self-center p-4">
				<Story />
			</View>
		),
	],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const schema = z.object({ email: emailRule, password: passwordRules });

function SignInFields({
	description,
	poseErrors = false,
}: {
	description?: string;
	poseErrors?: boolean;
}) {
	const form = useForm<z.infer<typeof schema>>({
		resolver: zodResolver(schema),
		defaultValues: { email: "", password: "" },
	});

	// `trigger()` runs the resolver and writes the errors without pretending a
	// submit happened, which is the only way to *land* on the error state
	// rather than ask the reader to click their way to it.
	React.useEffect(() => {
		if (poseErrors) void form.trigger();
	}, [poseErrors, form]);

	return (
		<Form {...form}>
			<View className="gap-4">
				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormInput
							label="Email"
							placeholder="Email"
							description={description}
							autoCapitalize="none"
							autoComplete="email"
							autoCorrect={false}
							keyboardType="email-address"
							{...field}
						/>
					)}
				/>
				<FormField
					control={form.control}
					name="password"
					render={({ field }) => (
						<FormInput
							label="Password"
							placeholder="Password"
							autoCapitalize="none"
							autoCorrect={false}
							secureTextEntry
							{...field}
						/>
					)}
				/>
				<Button
					className="h-14 w-full rounded-button"
					accessibilityLabel="Sign In"
					onPress={form.handleSubmit(() => {})}
				>
					<Text className="text-[16px] font-semibold leading-[22px]">Sign In</Text>
				</Button>
			</View>
		</Form>
	);
}

/** At rest: label, field, nothing underneath. */
export const Default: Story = {
	render: () => <SignInFields />,
};

/** The same form, posed as it looks after a failed submit. */
export const WithError: Story = {
	render: () => <SignInFields poseErrors />,
};

/** A hint under the field, in `ink-3`, behind both the value and any message. */
export const WithDescription: Story = {
	render: () => <SignInFields description="We only use this to sign you in." />,
};
