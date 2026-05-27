import { useState } from "react";
import { ActivityIndicator, Platform } from "react-native";

import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { Muted } from "@/components/ui/typography";
import { useAuth } from "@/context/supabase-provider";
import { useTheme } from "@/context/theme-provider";
import { styled } from "@/lib/styled";

const Container = styled.View`
	gap: 8px;
`;

const ErrorContainer = styled.View<{ colorMode: "light" | "dark" }>`
	background-color: ${({ colorMode }) => (colorMode === "light" ? "#fef2f2" : "#7f1d1d")};
	border: 1px solid ${({ colorMode }) => (colorMode === "light" ? "#fca5a5" : "#dc2626")};
	border-radius: 8px;
	padding: 12px;
`;

const ErrorText = styled(Muted)<{ colorMode: "light" | "dark" }>`
	color: ${({ colorMode }) => (colorMode === "light" ? "#b91c1c" : "#f87171")};
`;

export function GoogleAuthButton() {
	const { signInWithGoogle } = useAuth();
	const { colorMode } = useTheme();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	if (Platform.OS !== "web") return null;

	async function onPress() {
		setError(null);
		setLoading(true);
		try {
			await signInWithGoogle();
			// On success the browser redirects away; no further UI work needed.
		} catch (e: any) {
			setLoading(false);
			setError("Couldn't start Google sign-in. Please try again.");
			console.error("GoogleAuthButton press error:", e);
		}
	}

	return (
		<Container>
			<Button variant="outline" size="default" onPress={onPress} disabled={loading}>
				{loading ? <ActivityIndicator size="small" /> : <Text>Continue with Google</Text>}
			</Button>
			{error && (
				<ErrorContainer colorMode={colorMode}>
					<ErrorText colorMode={colorMode}>{error}</ErrorText>
				</ErrorContainer>
			)}
		</Container>
	);
}
