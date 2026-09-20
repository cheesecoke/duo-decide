import * as React from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { SettingsSheet } from "@/components/layout/settings-sheet";
import type { HuePair } from "@/theme/pair-choice";
import { BottomDrawer } from "@/components/modals/BottomDrawer";
import { ConfirmDelete } from "@/components/decision-queue/confirm-delete/confirm-delete";
import {
	CreateDecisionForm,
	type CreateDecisionFormData,
} from "@/components/decision-queue/CreateDecisionForm";
import { Button } from "@/components/ui/reusables/button/button";
import { Caption } from "@/components/ui/reusables/headline/headline";
import { Text } from "@/components/ui/reusables/text/text";
import { ThemeProvider } from "@/context/theme-provider";
import type { OptionListWithItems, UserContext } from "@/types/database";

/**
 * BottomDrawer — the sheet chrome (FEATURE-INVENTORY §0.3; the mock's
 * `.scrim` / `.sheet` / `.sheet-hd` / `.sheet-bd` / `.sheet-ft`,
 * design-refs/mocks/decision-queue-round-3.html:318-347).
 *
 * What to look for:
 *
 * - **The hairline.** 2 px of the `together` gradient across the very top of
 *   the sheet — the one place in the shell where both people's hues meet.
 *   Switch the pair and it moves.
 * - **The rise.** Open one: the scrim fades over 180 ms while the sheet lifts
 *   40 px on `spring.gentle`. Closing sinks the same 40 px over `dur.base`.
 *   With the OS "reduce motion" setting on, both ends land instantly.
 * - **The footer slot** (`WithFooterSlot`). Every sheet in the app still
 *   draws its own footer at the end of its body today — moving all three into
 *   the slot is a follow-up — so the other stories show the sheet without it.
 *
 * **On the frame.** react-native-web renders `Modal` through a portal onto
 * `document.body` (react-native-web/dist/exports/Modal/ModalPortal.js), so
 * the sheet escapes any decorator and fills the browser window up to its
 * 750 px cap. The 390 px column below is the screen it rises over; narrow the
 * browser to 390 to see the phone layout the sheet actually ships at.
 */

const CHASE: UserContext = {
	userId: "user-1",
	userName: "Chase",
	coupleId: "couple-1",
	partnerId: null,
	partnerName: null,
};

const SETTINGS_HANDLERS = {
	// The sheet's Colours section is exercised in Shell/SettingsSheet →
	// WithColours; here it is static, so these stories stay about the drawer.
	pair: { a: "sage", b: "blush" } as HuePair,
	onPairChange: () => {},
	onPartnerEmailChange: () => {},
	onInvite: () => {},
	onResendInvitation: () => {},
	onCancelInvitation: () => {},
	onChangePassword: () => {},
	onSignOut: () => {},
	onClose: () => {},
};

const EMPTY_FORM: CreateDecisionFormData = {
	title: "Where are we eating Friday?",
	description: "Somewhere we have not been.",
	dueDate: "",
	decisionType: "vote",
	selectedOptionListId: "",
	selectedOptions: [],
	customOptions: [],
};

const LISTS: OptionListWithItems[] = [
	{
		id: "l1",
		title: "Dinner ideas",
		description: "",
		couple_id: "couple-1",
		creator_id: "user-1",
		created_at: "2026-09-01T00:00:00Z",
		updated_at: "2026-09-01T00:00:00Z",
		items: ["Thai on Grand", "Tacos at home", "Ramen"].map((title, index) => ({
			id: `l1-i${index}`,
			option_list_id: "l1",
			title,
			created_at: "2026-09-01T00:00:00Z",
		})),
	},
];

/**
 * The sheet only exists while something is open, so every story is a small
 * screen with a button on it. That is also the only way to see the rise.
 */
function Stage({
	title,
	body,
	footer,
	open: initiallyOpen = true,
}: {
	title: string;
	body: React.ReactNode;
	footer?: React.ReactNode;
	open?: boolean;
}) {
	const [open, setOpen] = React.useState(initiallyOpen);

	return (
		<ThemeProvider>
			<View className="h-[720px] w-[390px] justify-end gap-3 self-center rounded-tile bg-bg p-5">
				<Caption>The screen the sheet rises over.</Caption>
				<Button className="h-[50px] w-full rounded-button" onPress={() => setOpen(true)}>
					<Text className="text-[16px] font-semibold leading-[22px] text-cta-fg">Open “{title}”</Text>
				</Button>
			</View>

			<BottomDrawer visible={open} onClose={() => setOpen(false)} title={title} footer={footer}>
				{body}
			</BottomDrawer>
		</ThemeProvider>
	);
}

const meta = {
	title: "Shell/BottomDrawer",
	component: BottomDrawer,
	parameters: { layout: "fullscreen" },
} satisfies Meta<typeof BottomDrawer>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The create / edit sheet (§1.10b) in the chrome it ships in. */
export const CreateDecision: Story = {
	args: { visible: true, onClose: () => {}, title: "New decision", children: null },
	render: () => (
		<Stage
			title="New decision"
			body={
				<CreateDecisionForm
					formData={EMPTY_FORM}
					onFormDataChange={() => {}}
					onSubmit={() => {}}
					onCancel={() => {}}
					isEditing={false}
					isSubmitting={false}
					optionLists={LISTS}
				/>
			}
		/>
	),
};

/** The confirm-delete sheet — short body, no scrolling. */
export const ConfirmDeleteSheet: Story = {
	args: { visible: true, onClose: () => {}, title: "Delete this decision?", children: null },
	render: () => (
		<Stage
			title="Delete this decision?"
			body={<ConfirmDelete title="Which couch" onCancel={() => {}} onConfirm={() => {}} />}
		/>
	),
};

/** Settings, variant A — the couple is linked. */
export const SettingsLinked: Story = {
	args: { visible: true, onClose: () => {}, title: "Settings", children: null },
	render: () => (
		<Stage
			title="Settings"
			body={
				<SettingsSheet
					userContext={{ ...CHASE, partnerId: "user-2", partnerName: "Sam" }}
					partnerEmail=""
					inviting={false}
					error={null}
					{...SETTINGS_HANDLERS}
				/>
			}
		/>
	),
};

/** Settings, variant B — an invite is out and unanswered. */
export const SettingsInvitePending: Story = {
	args: { visible: true, onClose: () => {}, title: "Settings", children: null },
	render: () => (
		<Stage
			title="Settings"
			body={
				<SettingsSheet
					userContext={{ ...CHASE, pendingPartnerEmail: "sam@example.com" }}
					partnerEmail=""
					inviting={false}
					error={null}
					{...SETTINGS_HANDLERS}
				/>
			}
		/>
	),
};

/** Settings, variant C — nobody yet. */
export const SettingsNoPartner: Story = {
	args: { visible: true, onClose: () => {}, title: "Settings", children: null },
	render: () => (
		<Stage
			title="Settings"
			body={
				<SettingsSheet
					userContext={CHASE}
					partnerEmail=""
					inviting={false}
					error={null}
					{...SETTINGS_HANDLERS}
				/>
			}
		/>
	),
};

/**
 * The new `footer` slot: a `.sheet-ft` row with the hairline above it, held
 * out of the scroll. Nothing in the app passes it yet.
 */
export const WithFooterSlot: Story = {
	args: { visible: true, onClose: () => {}, title: "Pick a deadline", children: null },
	render: () => (
		<Stage
			title="Pick a deadline"
			body={
				<View className="gap-2">
					{Array.from({ length: 14 }).map((_, index) => (
						<View key={index} className="rounded-field bg-surface-2 px-3.5 py-3">
							<Text className="text-[15px] font-medium leading-[20px] text-ink">
								A body long enough to scroll · row {index + 1}
							</Text>
						</View>
					))}
				</View>
			}
			footer={
				<>
					<Button variant="secondary" className="h-[50px] flex-1 rounded-button" onPress={() => {}}>
						<Text className="text-[16px] font-semibold leading-[22px] text-ink-2">Cancel</Text>
					</Button>
					<Button className="h-[50px] flex-[2] rounded-button" onPress={() => {}}>
						<Text className="text-[16px] font-semibold leading-[22px] text-cta-fg">Use this date</Text>
					</Button>
				</>
			}
		/>
	),
};

/** Closed — the story to open by hand, to watch the rise. */
export const Closed: Story = {
	args: { visible: false, onClose: () => {}, title: "Settings", children: null },
	render: () => (
		<Stage
			title="Settings"
			open={false}
			body={
				<SettingsSheet
					userContext={CHASE}
					partnerEmail=""
					inviting={false}
					error={null}
					{...SETTINGS_HANDLERS}
				/>
			}
		/>
	),
};
