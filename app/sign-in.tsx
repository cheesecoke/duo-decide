import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ActivityIndicator, View } from "react-native";
import * as z from "zod";

import { SafeAreaView } from "@/components/SafeAreaView";
import { Button } from "@/components/ui/Button";
import { Form, FormField, FormInput } from "@/components/ui/Form";
import { Text } from "@/components/ui/Text";
import { H1 } from "@/components/ui/typography";
import { useAuth } from "@/context/supabase-provider";
import { styled, getColor } from "@/lib/styled";
import { useTheme } from "@/context/theme-provider";

const Container = styled.View<{
	colorMode: "light" | "dark";
}>`
	flex: 1;
	background-color: ${({ colorMode }) => getColor("background", colorMode)};
	padding: 16px;
`;

const ContentContainer = styled.View`
	flex: 1;
	gap: 16px;
	margin: 16px;
`;

const FormContainer = styled.View`
	gap: 16px;
`;

const ButtonContainer = styled.View`
	margin: 16px;
`;

const formSchema = z.object({
	email: z.string().email("Please enter a valid email address."),
	password: z
		.string()
		.min(8, "Please enter at least 8 characters.")
		.max(64, "Please enter fewer than 64 characters."),
});

export default function SignIn() {
	const { signIn } = useAuth();
	const { colorMode } = useTheme();

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	});

	async function onSubmit(data: z.infer<typeof formSchema>) {
		try {
			await signIn(data.email, data.password);

			form.reset();
		} catch (error: Error | any) {
			console.error(error.message);
		}
	}

	return (
		<SafeAreaView
			style={{
				flex: 1,
			}}
			edges={["bottom"]}
		>
			<Container colorMode={colorMode}>
				<ContentContainer>
					<H1>Sign In</H1>
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
						</FormContainer>
					</Form>
				</ContentContainer>
				<ButtonContainer>
					<Button
						size="default"
						variant="default"
						onPress={form.handleSubmit(onSubmit)}
						disabled={form.formState.isSubmitting}
					>
						{form.formState.isSubmitting ? <ActivityIndicator size="small" /> : "Sign In"}
					</Button>
				</ButtonContainer>
			</Container>
		</SafeAreaView>
	);
}
