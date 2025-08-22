import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ActivityIndicator, View } from "react-native";
import * as z from "zod";

import { Button } from "@/components/ui/Button";
import { Form, FormField, FormInput } from "@/components/ui/Form";
import { H1 } from "@/components/ui/typography";
import { useAuth } from "@/context/supabase-provider";
import { styled, getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";
import ContentLayout from "@/components/layout/ContentLayout";

const ContentContainer = styled.View`
	flex: 1;
	gap: 16px;
`;

const FormContainer = styled.View`
	gap: 16px;
`;

const StyledH1 = styled(H1)`
	align-self: flex-start;
`;

const ButtonContainer = styled.View`
	margin-top: auto;
	padding-top: 16px;
`;

const formSchema = z
	.object({
		email: z.string().email("Please enter a valid email address."),
		password: z
			.string()
			.min(8, "Please enter at least 8 characters.")
			.max(64, "Please enter fewer than 64 characters.")
			.regex(/^(?=.*[a-z])/, "Your password must have at least one lowercase letter.")
			.regex(/^(?=.*[A-Z])/, "Your password must have at least one uppercase letter.")
			.regex(/^(?=.*[0-9])/, "Your password must have at least one number.")
			.regex(/^(?=.*[!@#$%^&*])/, "Your password must have at least one special character."),
		confirmPassword: z.string().min(8, "Please enter at least 8 characters."),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Your passwords do not match.",
		path: ["confirmPassword"],
	});

export default function SignUp() {
	const { signUp } = useAuth();
	const { colorMode } = useTheme();

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
			password: "",
			confirmPassword: "",
		},
	});

	async function onSubmit(data: z.infer<typeof formSchema>) {
		try {
			await signUp(data.email, data.password);

			form.reset();
		} catch (error: Error | any) {
			console.error(error.message);
		}
	}

	return (
		<ContentLayout>
			<ContentContainer>
				<StyledH1>Sign Up</StyledH1>
				<Form {...form}>
					<FormContainer>
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormInput
									label="Email"
									placeholder="Email"
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
						<FormField
							control={form.control}
							name="confirmPassword"
							render={({ field }) => (
								<FormInput
									label="Confirm Password"
									placeholder="Confirm password"
									autoCapitalize="none"
									autoCorrect={false}
									secureTextEntry
									{...field}
								/>
							)}
						/>
					</FormContainer>
				</Form>
				<ButtonContainer>
					<Button
						size="default"
						variant="default"
						onPress={form.handleSubmit(onSubmit)}
						disabled={form.formState.isSubmitting}
					>
						{form.formState.isSubmitting ? <ActivityIndicator size="small" /> : "Sign Up"}
					</Button>
				</ButtonContainer>
			</ContentContainer>
		</ContentLayout>
	);
}
