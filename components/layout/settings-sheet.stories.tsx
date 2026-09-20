import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { SettingsSheet } from "@/components/layout/settings-sheet";
import { PersonPairProvider } from "@/theme/PersonPairProvider";
import type { HuePair } from "@/theme/pair-choice";
import type { UserContext } from "@/types/database";

/**
 * SettingsSheet — FEATURE-INVENTORY §0.2, the mock's `settingsSheet()`
 * (design-refs/mocks/decision-queue-round-3.html:860).
 *
 * The sheet's chrome — the 32 px top corners, the gradient hairline, the
 * title row — is `BottomDrawer`'s and is not here; these stories draw the
 * white body at phone width. `Shell/BottomDrawer` shows the same three
 * variants inside the real sheet.
 *
 * What to look for:
 *
 * - **Exactly three partner variants**, and they are exclusive: linked,
 *   invite pending, no partner. Nothing else about a partner appears.
 * - **Every row is the same slab** — the mock's `.listpick`, `surface-2` at
 *   `radius.field`, no borders.
 * - **`inviting` is one flag with two effects**: the label flips to "Sending…"
 *   and every control in the block stops.
 * - **Colours is live in `WithColours`**, which drives a real
 *   `PersonPairProvider` the way `app/_layout.tsx` does — press a swatch and
 *   the two characters recolour. The other stories pass a static pair, since
 *   the sheet itself is pure.
 */

const CHASE: UserContext = {
	userId: "user-1",
	userName: "Chase",
	coupleId: "couple-1",
	partnerId: null,
	partnerName: null,
};

const HANDLERS = {
	onPartnerEmailChange: () => {},
	onPairChange: () => {},
	onInvite: () => {},
	onResendInvitation: () => {},
	onCancelInvitation: () => {},
	onChangePassword: () => {},
	onSignOut: () => {},
	onClose: () => {},
};

const meta = {
	title: "Shell/SettingsSheet",
	component: SettingsSheet,
	parameters: { layout: "fullscreen" },
	decorators: [
		(Story) => (
			// The white sheet body at phone width, 20 px gutters like `.sheet-bd`.
			<View className="w-[390px] self-center rounded-card bg-surface px-5 py-4">
				<Story />
			</View>
		),
	],
	args: {
		userContext: CHASE,
		partnerEmail: "",
		inviting: false,
		error: null,
		pair: { a: "sage", b: "blush" },
		...HANDLERS,
	},
} satisfies Meta<typeof SettingsSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Variant A — the couple is linked. There is nothing to do but read it. */
export const PartnerLinked: Story = {
	args: {
		userContext: { ...CHASE, partnerId: "user-2", partnerName: "Sam" },
	},
};

/** Variant B — an invite is out and unanswered. */
export const InvitePending: Story = {
	args: {
		userContext: { ...CHASE, pendingPartnerEmail: "sam@example.com" },
	},
};

/** Variant B, mid-flight — both buttons stop, Resend becomes "Sending…". */
export const InvitePendingSending: Story = {
	args: {
		userContext: { ...CHASE, pendingPartnerEmail: "sam@example.com" },
		inviting: true,
	},
};

/** Variant B, refused — the server's message sits above the pair. */
export const InvitePendingError: Story = {
	args: {
		userContext: { ...CHASE, pendingPartnerEmail: "sam@example.com" },
		error: "Failed to resend invitation. Please try again.",
	},
};

/** Variant C — nobody yet. The empty field means the button is dead. */
export const NoPartner: Story = {};

/** Variant C, ready to send. */
export const NoPartnerTyped: Story = {
	args: { partnerEmail: "sam@example.com" },
};

/** Variant C, refused by the client-side check. */
export const NoPartnerInvalidEmail: Story = {
	args: {
		partnerEmail: "sam@example",
		error: "Please enter a valid email address",
	},
};

/** Variant C, mid-flight. */
export const NoPartnerSending: Story = {
	args: { partnerEmail: "sam@example.com", inviting: true },
};

/**
 * Before the context lands there is no partner variant to choose, so the
 * block waits rather than flashing the warning at someone who has a partner.
 */
export const ContextLoading: Story = {
	args: { userContext: null },
};

/** A live sheet with a partner: pick a hue and watch the two rows recolour. */
function LiveSheet() {
	const [pair, setPair] = React.useState<HuePair>({ a: "sage", b: "blush" });

	return (
		<PersonPairProvider a={pair.a} b={pair.b} className="flex-1">
			<SettingsSheet
				userContext={{ ...CHASE, partnerId: "user-2", partnerName: "Sam" }}
				partnerEmail=""
				inviting={false}
				error={null}
				pair={pair}
				{...HANDLERS}
				onPairChange={setPair}
			/>
		</PersonPairProvider>
	);
}

/**
 * The section tokens.md §1 asks for: each seat's hue, picked here and applied
 * to the whole app. Pressing the hue the other row is wearing swaps the two —
 * the seats may never match — which is why no swatch is ever disabled.
 */
export const WithColours: Story = {
	render: () => <LiveSheet />,
};
