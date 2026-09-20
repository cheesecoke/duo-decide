import * as React from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/reusables/button/button";
import { Body } from "@/components/ui/reusables/headline/headline";
import { Text } from "@/components/ui/reusables/text/text";

/**
 * ConfirmDelete — the body of the "Delete this decision?" sheet.
 *
 * FEATURE-INVENTORY §1.10a says delete today is a trash circle with **no
 * confirm step**. Chase's ruling (2026-09-20) adds one: deleting takes the
 * decision and every vote on it away from *both* people, and there is no undo
 * anywhere in the app, so it is the one action that asks first.
 *
 * It renders inside the existing `BottomDrawer` (`showDrawer(…, { type:
 * "confirmDelete" })`), which already supplies the sheet's chrome — the title
 * "Delete this decision?", the close button and the scrim. This is only what
 * goes under that: the mock's line of body copy
 * (design-refs/mocks/decision-queue-round-3.html:847) and the mock's two
 * buttons (:848), "Keep it" then "Delete".
 *
 * The component is pure: it names neither the decision's id nor a hook. The
 * screen closes the drawer in both callbacks, so a half-torn-down sheet can
 * never be what deletes something.
 */

type ConfirmDeleteProps = {
	/**
	 * The thing's title, quoted in the default copy so it is unambiguous which
	 * one. When `message` is given the title is NOT interpolated for the caller —
	 * the whole sentence is theirs, so quote it in the message yourself.
	 */
	title: string;
	/**
	 * What is actually lost. Defaults to the decision's copy, which is what
	 * every call site said before the Options tab needed the same sheet for a
	 * list (PLAN-3 task 10) — a list's consequences are different enough
	 * ("and its options", and the decisions made from it are *not* affected)
	 * that saying the decision's sentence about it would be a lie.
	 *
	 * The caller passes a whole sentence rather than a noun, because the
	 * difference is not one word: it is the second sentence too.
	 */
	message?: string;
	/** "Keep it", and the scrim, and the close button. */
	onCancel(): void;
	/** "Delete" — the screen calls the delete and closes. */
	onConfirm(): void;
};

function ConfirmDelete({ title, message, onCancel, onConfirm }: ConfirmDeleteProps) {
	return (
		<View className="gap-5 px-1 pb-2 pt-1">
			{/* Curly quotes are the mock's, and they are the reason the title is
			    interpolated rather than concatenated with straight quotes: a
			    title containing a quote mark still reads as one phrase. */}
			<Body className="text-ink-2">
				{message ??
					`“${title}” and every vote on it are removed for both of you. This cannot be undone.`}
			</Body>

			{/* Stacked rather than side by side: on a phone the destructive
			    button is the one under the thumb either way, so the order is
			    the mock's (keep, then delete) and the weight does the warning. */}
			<View className="gap-3">
				<Button
					variant="secondary"
					className="h-14 w-full rounded-button"
					accessibilityLabel="Keep it"
					onPress={onCancel}
				>
					<Text className="text-[16px] font-semibold leading-[22px]">Keep it</Text>
				</Button>

				<Button
					variant="destructive"
					className="h-14 w-full rounded-button"
					accessibilityLabel="Delete"
					onPress={onConfirm}
				>
					<Text className="text-[16px] font-semibold leading-[22px]">Delete</Text>
				</Button>
			</View>
		</View>
	);
}

export { ConfirmDelete };
export type { ConfirmDeleteProps };
