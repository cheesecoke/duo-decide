import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { LeaveOut } from "@/components/decision-queue/leave-out/leave-out";
import { Button } from "@/components/ui/reusables/button/button";
import { Card } from "@/components/ui/reusables/card/card";
import { Caption, Title } from "@/components/ui/reusables/headline/headline";
import { Text } from "@/components/ui/reusables/text/text";

/**
 * LeaveOut — a queue card archiving or deleting itself: one `DUR.base` of
 * fade and settle, then the screen removes it. Under reduce-motion it goes
 * at once. Press "Archive" to play it; "Reset" brings the card back.
 */
function Demo({ startLeaving = false }: { startLeaving?: boolean }) {
	const [leaving, setLeaving] = React.useState(startLeaving);
	const [gone, setGone] = React.useState(false);

	return (
		<View className="w-full max-w-md gap-3 self-center">
			{gone ? (
				<Caption>Archived — it is in History now.</Caption>
			) : (
				<LeaveOut leaving={leaving} onLeft={() => setGone(true)}>
					<Card state="together">
						<Title>Dinner tonight</Title>
						<Caption className="mt-2">Decided by Sam</Caption>
					</Card>
				</LeaveOut>
			)}
			<Button
				variant="secondary"
				className="h-12 rounded-button"
				onPress={() => {
					if (gone) {
						setGone(false);
						setLeaving(false);
					} else setLeaving(true);
				}}
			>
				<Text>{gone ? "Reset" : "Archive"}</Text>
			</Button>
		</View>
	);
}

const meta = {
	title: "Decision queue/LeaveOut",
	component: Demo,
} satisfies Meta<typeof Demo>;

export default meta;

type Story = StoryObj<typeof meta>;

/** At rest: an ordinary card. */
export const Resting: Story = {};

/** Pressed: the card leaves, and the slot says where it went. */
export const Leaving: Story = { args: { startLeaving: true } };
