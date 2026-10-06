import * as React from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/reusables/button/button";
import { Card } from "@/components/ui/reusables/card/card";
import { Body, Caption, Title } from "@/components/ui/reusables/headline/headline";
import { Text } from "@/components/ui/reusables/text/text";

/**
 * The welcome and partner-intro cards (`lib/welcomeDecisionContent.ts`), which
 * are guide copy rather than a decision — hence `Card state="together"`: they
 * are addressed to the two of you, not to either seat.
 *
 * The four "how it works" lines are the inventory's (§1.10 item 4, §1.11's
 * `WELCOME_OPTIONS`); they are the whole point of the card, so they are kept
 * as a bulleted list, the shape the mock's `.tile ul` uses.
 *
 * Hoisted out of the Decision Queue screen (PLAN-3 task 10) — Options shows
 * the same card with `WELCOME_OPTIONS` in it.
 */
function IntroCard({
	content,
	onDismiss,
}: {
	content: { title: string; description: string; options: readonly { title: string }[] };
	onDismiss: () => void;
}) {
	return (
		<Card state="together" className="mb-3" role="group" accessibilityLabel={content.title}>
			<Title>{content.title}</Title>
			<Body className="mt-2 text-ink-2">{content.description}</Body>

			<View className="mt-4 gap-2.5">
				{content.options.map((option) => (
					<View key={option.title} className="flex-row gap-2.5">
						<View className="mt-1.5 h-1.5 w-1.5 rounded-chip bg-ink-3" />
						<Caption className="flex-1 text-ink">{option.title}</Caption>
					</View>
				))}
			</View>

			<Button
				variant="secondary"
				className="mt-4 h-12 w-full rounded-button"
				accessibilityLabel="Got it"
				onPress={onDismiss}
			>
				<Text className="text-[16px] font-semibold leading-[22px]">Got it</Text>
			</Button>
		</Card>
	);
}

export { IntroCard };
